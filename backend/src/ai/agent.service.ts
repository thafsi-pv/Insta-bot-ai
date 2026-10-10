import { Injectable, Logger } from '@nestjs/common';
import { OpenRouterService } from './openrouter.service';
import { AISettingsService } from './ai-settings.service';
import { ProductTools } from './tools/product-tools';
import { PrismaService } from '../prisma/prisma.service';
import { AgentContext, AgentResult } from './ai.types';
import OpenAI from 'openai';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private openRouterService: OpenRouterService,
    private aiSettingsService: AISettingsService,
    private productTools: ProductTools,
    private prisma: PrismaService,
  ) {}

  async processCustomerMessage(context: AgentContext): Promise<AgentResult> {
    const settings = this.aiSettingsService.getSettings();
    const tools = this.productTools.getToolDefinitions() as OpenAI.Chat.Completions.ChatCompletionTool[];

    let selectedProductId = context.selectedProductId || null;
    let selectedVariantId = context.selectedVariantId || null;
    const toolsExecuted: string[] = [];

    // Priority 1: Instagram media context
    let mediaContextText = '';
    if (context.attachedMediaId) {
      const media = await this.prisma.productMedia.findFirst({
        where: { instagramMediaId: context.attachedMediaId },
        include: {
          product: {
            include: { variants: { where: { active: true } } },
          },
        },
      });

      if (media?.product) {
        selectedProductId = media.product.id;
        const inStockVariants = media.product.variants.filter((v) => v.stock > 0);
        const sizes = [...new Set(inStockVariants.map((v) => v.size).filter(Boolean))];
        const colors = [...new Set(inStockVariants.map((v) => v.color).filter(Boolean))];
        mediaContextText = `\n[POST CONTEXT]: Product "${media.product.name}" ID:${media.product.id} ₹${media.product.price}. In-stock sizes:${sizes.join(',')||'one-size'} colors:${colors.join(',')||'default'}. Use this directly.`;
      }
    }

    // Priority 2: Existing conversation context
    let conversationContextText = '';
    if (!mediaContextText && selectedProductId) {
      const selectedProduct = await this.prisma.product.findUnique({
        where: { id: selectedProductId },
        include: { variants: { where: { active: true } } },
      });

      if (selectedProduct) {
        const inStock = selectedProduct.variants.filter((v) => v.stock > 0);
        const sz = [...new Set(inStock.map((v) => v.size).filter(Boolean))];
        const cl = [...new Set(inStock.map((v) => v.color).filter(Boolean))];
        conversationContextText = `\n[ACTIVE PRODUCT]: "${selectedProduct.name}" ID:${selectedProduct.id} ₹${selectedProduct.price}. Sizes:${sz.join(',')||'one-size'} Colors:${cl.join(',')||'default'}.`;
      }
    }

    const systemPrompt = `${settings.systemPrompt}${mediaContextText}${conversationContextText}

Remember:
- STRICT STORE SCOPE: You ONLY discuss our clothing store, products, sizes, colors, prices, and orders.
- NEVER answer general knowledge, math, coding, AI explanations, or unrelated questions. Politely redirect: "We're only here to assist with our store products and orders! 😊 Let us know if you have any questions about our clothes or placing an order."
- If asked "are you AI" or "are you a bot", reply naturally as store staff: "Hey! I'm here from the team to help you with our products and orders. How can I help you today? 😊"
- Check stock accurately using the database context or tools.
- Never say a size is in stock if stock is 0.
- If multiple products match a general inquiry, list options and prices, then ask the customer to pick one.`;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...context.recentMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    // Tool execution loop (max 3 rounds to avoid infinite loops)
    let currentRound = 0;
    const maxRounds = 3;

    while (currentRound < maxRounds) {
      currentRound++;

      const completion = await this.openRouterService.createChatCompletion({
        messages,
        tools,
      });

      const message = completion.choices[0]?.message;
      if (!message) {
        throw new Error('Received empty response from OpenRouter');
      }

      // Check for tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        // Add assistant tool_calls message to history
        messages.push(message);

        for (const toolCall of message.tool_calls) {
          if (toolCall.type === 'function') {
            const toolName = toolCall.function.name;
            toolsExecuted.push(toolName);

            let args: Record<string, any> = {};
            try {
              args = JSON.parse(toolCall.function.arguments);
            } catch (err) {
              this.logger.warn(`Failed to parse tool call arguments: ${toolCall.function.arguments}`);
            }

            const enrichedArgs = {
              ...args,
              conversationId: context.conversationId,
              customerId: context.customerId,
            };
            const toolResult = await this.productTools.executeTool(toolName, enrichedArgs);

            // If a product was searched or fetched, track selectedProductId
            if (args.productId) {
              selectedProductId = args.productId;
            } else if (toolResult?.products?.length === 1) {
              selectedProductId = toolResult.products[0].id;
            }

            // Trim tool result to reduce tokens: cap at 800 chars
            const toolResultStr = JSON.stringify(toolResult);
            const trimmedResult = toolResultStr.length > 800
              ? toolResultStr.slice(0, 800) + '...}'
              : toolResultStr;

            // Append tool response
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: trimmedResult,
            });
          }
        }
      } else {
        // Final assistant text response produced
        let finalReply = message.content?.trim() || 'How can I assist you with our products today?';

        // Fallback Order Safeguard: If the LLM failed to invoke place_order tool despite complete order info
        if (!toolsExecuted.includes('place_order')) {
          const lastUserMsg = [...context.recentMessages].reverse().find((m) => m.role === 'user')?.content || '';
          let defaultProductName = '';
          if (selectedProductId) {
            const p = await this.prisma.product.findUnique({ where: { id: selectedProductId } });
            if (p) defaultProductName = p.name;
          }

          const parsedOrder = this.parseOrderFromText(lastUserMsg, defaultProductName);
          if (parsedOrder && parsedOrder.customerName && (parsedOrder.productName || defaultProductName)) {
            this.logger.log(`[ORDER SAFEGUARD] Auto-detected valid order details from message. Placing order...`);
            const orderResult = await this.productTools.placeOrder({
              ...parsedOrder,
              conversationId: context.conversationId,
              customerId: context.customerId,
            });

            if (orderResult.success) {
              toolsExecuted.push('place_order');
              finalReply = orderResult.message;
              console.log(`🎉 [ORDER SAFEGUARD SUCCESS] Order ID: ${orderResult.orderId} created for ${orderResult.customerName}`);
            } else if (orderResult.message) {
              finalReply = orderResult.message;
            }
          }
        }

        // Fallback Cancellation Safeguard: If customer requested cancellation but LLM missed the tool call
        if (!toolsExecuted.includes('cancel_order')) {
          const lastUserMsgLower = (
            [...context.recentMessages].reverse().find((m) => m.role === 'user')?.content || ''
          ).toLowerCase();
          if (
            lastUserMsgLower.includes('cancel my order') ||
            lastUserMsgLower.includes('cancel the order') ||
            lastUserMsgLower.includes('cancel order') ||
            lastUserMsgLower.includes('cancel it') ||
            lastUserMsgLower.includes('reject order') ||
            lastUserMsgLower.includes('don\'t want it')
          ) {
            const cancelResult = await this.productTools.cancelOrder({
              conversationId: context.conversationId,
              customerId: context.customerId,
            });
            if (cancelResult.success) {
              toolsExecuted.push('cancel_order');
              finalReply = cancelResult.message;
            }
          }
        }

        return {
          reply: finalReply,
          selectedProductId,
          selectedVariantId,
          toolCallsCount: toolsExecuted.length,
          toolsExecuted,
        };
      }
    }

    // If max rounds reached, synthesize a fallback response
    return {
      reply: "I've checked our catalog. Could you please specify which size or style you are looking for?",
      selectedProductId,
      selectedVariantId,
      toolCallsCount: toolsExecuted.length,
      toolsExecuted,
    };
  }

  private parseOrderFromText(text: string, defaultProductName?: string) {
    if (!text) return null;
    const lower = text.toLowerCase();

    // Inquiries or greeting words MUST NEVER trigger order creation
    const inquiryWords = [
      'how much', 'price', 'rate', 'cost', 'available', 'is this', 'in stock',
      'send pic', 'photos', 'show me', 'details you asked', 'thanks for following',
      'hello', 'hey', 'hi',
    ];
    // If the message has no explicit "address:" label and asks inquiry questions, reject
    if (!lower.includes('address:') && inquiryWords.some((w) => lower.includes(w))) {
      return null;
    }

    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    let customerName = '';
    let productName = defaultProductName || '';
    let paymentMethod = 'COD';
    let shippingAddress = '';
    let size = '';

    const hasCodOrPrepay =
      lower.includes('cod') ||
      lower.includes('prepayment') ||
      lower.includes('cash on delivery') ||
      lower.includes('pre-payment');

    if (lower.includes('prepay')) {
      paymentMethod = 'PREPAYMENT';
    }

    for (const line of lines) {
      const lineLower = line.toLowerCase();
      if (lineLower.startsWith('name:')) {
        customerName = line.substring(5).trim();
      } else if (
        lineLower.startsWith('product name:') ||
        lineLower.startsWith('product:') ||
        lineLower.startsWith('item:')
      ) {
        productName = line.replace(/^(product name|product|item)\s*:\s*/i, '').trim();
      } else if (lineLower.startsWith('payment:') || lineLower.startsWith('payment (cod')) {
        paymentMethod = lineLower.includes('prepay') ? 'PREPAYMENT' : 'COD';
      } else if (lineLower.startsWith('address:')) {
        shippingAddress = line.substring(8).trim();
      } else if (lineLower.startsWith('size:')) {
        size = line.substring(5).trim();
      }
    }

    // Validate extracted values
    if (
      !customerName ||
      !shippingAddress ||
      this.productTools.isInvalidCustomerName(customerName) ||
      this.productTools.isInvalidAddress(shippingAddress)
    ) {
      return null;
    }

    return {
      customerName,
      productName: productName || defaultProductName || 'Product',
      paymentMethod,
      shippingAddress,
      size,
    };
  }
}
