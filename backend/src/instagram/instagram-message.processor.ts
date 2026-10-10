import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AgentService } from '../ai/agent.service';
import { InstagramMessageService } from './instagram-message.service';
import { ConversationStatus, SenderType } from '@prisma/client';

@Processor('instagram-messages', { concurrency: 20 })
export class InstagramMessageProcessor extends WorkerHost {
  private readonly logger = new Logger(InstagramMessageProcessor.name);

  constructor(
    private prisma: PrismaService,
    private agentService: AgentService,
    private messageService: InstagramMessageService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const {
      messageId,
      conversationId,
      customerId,
      accountId,
      instagramUserId,
      text,
      attachedMediaId,
      isFollowDoneReply,
      selectedProductId: jobSelectedProductId,
    } = job.data;

    console.log('\n' + '-'.repeat(70));
    console.log(`🤖 [BULLMQ WORKER: START PROCESSING JOB #${job.id}]`);
    console.log(`   ├─ Conversation ID : ${conversationId}`);
    console.log(`   ├─ Customer IGSID   : ${instagramUserId}`);
    console.log(`   └─ Inbound Text     : "${text}"`);
    console.log('-'.repeat(70));

    // 1. Fetch conversation
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        customer: true,
      },
    });

    if (!conversation) {
      console.warn(`⚠️ [WORKER] Conversation ${conversationId} not found, skipping job.`);
      return { skipped: true, reason: 'Conversation not found' };
    }

    // 2. Check for human takeover
    if (conversation.status === ConversationStatus.HUMAN_ACTIVE) {
      console.log(
        `🛑 [WORKER] Conversation ${conversationId} is in HUMAN_ACTIVE mode. Automated AI reply skipped.`,
      );
      return { skipped: true, reason: 'Human takeover active' };
    }

    // 3. Follow-gate: customer replied "DONE" after commenting on a product post
    const pendingProductId = jobSelectedProductId || conversation.selectedProductId;
    if (isFollowDoneReply && pendingProductId) {
      console.log(`\ud83d\udd13 [FOLLOW-GATE DONE] Customer confirmed follow. Sending product details for ${pendingProductId}...`);
      try {
        const product = await this.prisma.product.findUnique({
          where: { id: pendingProductId },
          include: {
            variants: { where: { active: true } },
            media: true,
          },
        });

        let replyText: string;
        if (!product) {
          replyText = `Hey! \ud83d\udc4b Thanks for following! Feel free to DM us anytime — we'd love to help you find exactly what you need! \ud83d\ude0a`;
        } else {
          const availableVariants = product.variants.filter((v) => v.stock > 0);
          const sizesInStock = [...new Set(availableVariants.map((v) => v.size).filter(Boolean))];
          const colorsInStock = [...new Set(availableVariants.map((v) => v.color).filter(Boolean))];
          const price = product.price;
          const photoUrl = product.media?.[0]?.imageUrl || null;

          replyText = `Hey! \ud83d\udc4b Thank you so much for following us! Here are the details you asked for:\n\n`;
          replyText += `\ud83d\udce6 *${product.name}*\n`;
          if (product.description) replyText += `${product.description}\n`;
          replyText += `\n\ud83d\udcb0 Price: \u20b9${price}`;
          const realSizes = sizesInStock.filter((s) => s && s.toLowerCase() !== 'default' && s.toLowerCase() !== 'standard');
          const realColors = colorsInStock.filter((c) => c && c.toLowerCase() !== 'default' && c.toLowerCase() !== 'standard');
          const hasMultipleVariants = availableVariants.length > 1;

          let variantFields = '';
          if (hasMultipleVariants) {
            if (realSizes.length > 0) {
              variantFields += '\nSize:';
            }
            if (realColors.length > 0) {
              variantFields += '\nColour:';
            }
          }

          const paymentText =
            product.allowCod && product.allowPrepayment
              ? 'Payment (COD / Prepayment):'
              : product.allowPrepayment
              ? 'Payment: Prepayment (UPI/Bank Transfer - COD not available)'
              : 'Payment: COD (Cash on Delivery)';

          replyText += `\n\nTo place your order, just send us:\n\nName:\nProduct Name: ${product.name}${variantFields}\n${paymentText}\nAddress:\n\nWe'll confirm everything right away! 😊`;
        }

        const sendResult = await this.messageService.sendMessage({
          instagramAccountId: accountId,
          recipientId: instagramUserId,
          text: replyText,
          conversationId,
          senderType: SenderType.AI,
        });

        console.log(`\ud83c\udf89 [FOLLOW-GATE DELIVERY] Details sent. Meta MsgID: ${sendResult.messageId}`);
        return { success: true, followGate: true, reply: replyText, messageId: sendResult.messageId };
      } catch (fgErr: any) {
        console.error(`\u274c [FOLLOW-GATE ERROR] ${fgErr.message}`);
        // Fall through to normal AI if follow-gate fails
      }
    }

    // 4. Load recent messages for conversational context
    const recentMessages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 4,
    });

    const formattedMessages = recentMessages.reverse().map((msg) => ({
      role: msg.senderType === SenderType.CUSTOMER ? ('user' as const) : ('assistant' as const),
      content: msg.content,
    }));

    try {
      console.log(`\ud83e\udde0 [AI AGENT] Querying OpenRouter with ${formattedMessages.length} message(s) of history...`);
      // 5. Invoke AI Agent
      const agentResult = await this.agentService.processCustomerMessage({
        customerId,
        conversationId,
        customerName: conversation.customer.name || undefined,
        customerUsername: conversation.customer.username || undefined,
        selectedProductId: pendingProductId || conversation.selectedProductId,
        selectedVariantId: conversation.selectedVariantId,
        attachedMediaId,
        recentMessages: formattedMessages,
      });

      console.log(`✨ [AI AGENT RESPONSE GENERATED]`);
      console.log(`   ├─ Tools Executed : ${agentResult.toolCallsCount} (${agentResult.toolsExecuted?.join(', ') || 'None'})`);
      console.log(`   └─ Reply Message  : "${agentResult.reply}"`);

      // 5. Send message back via Instagram Graph API
      console.log(`📤 [INSTAGRAM DISPATCH] Sending automated reply to IGSID ${instagramUserId}...`);
      const sendResult = await this.messageService.sendMessage({
        instagramAccountId: accountId,
        recipientId: instagramUserId,
        text: agentResult.reply,
        conversationId,
        senderType: SenderType.AI,
      });

      console.log(`🎉 [DELIVERY SUCCESS] Meta Message ID: ${sendResult.messageId}\n`);

      // 6. Update conversation selectedProduct if identified
      if (agentResult.selectedProductId && agentResult.selectedProductId !== conversation.selectedProductId) {
        await this.prisma.conversation.update({
          where: { id: conversationId },
          data: {
            selectedProductId: agentResult.selectedProductId,
            selectedVariantId: agentResult.selectedVariantId || null,
          },
        });
        console.log(`🏷️ [CONVERSATION UPDATED] Selected Product ID: ${agentResult.selectedProductId}`);
      }

      return { success: true, reply: agentResult.reply, messageId: sendResult.messageId };
    } catch (error: any) {
      console.error(`❌ [WORKER ERROR] Failed to process message ${messageId}:`, error.message);
      throw error;
    }
  }
}
