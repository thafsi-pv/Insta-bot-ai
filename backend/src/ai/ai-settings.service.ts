import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AISettings } from './ai.types';

@Injectable()
export class AISettingsService {
  private readonly logger = new Logger(AISettingsService.name);

  private settings: AISettings;

  constructor(private configService: ConfigService) {
    this.settings = {
      apiKey:
        this.configService.get<string>('OPENROUTER_API_KEY') ||
        process.env.OPENROUTER_API_KEY ||
        '',
      model: this.configService.get<string>(
        'OPENROUTER_MODEL',
        'meta-llama/llama-3.3-70b-instruct:free',
      ),
      systemPrompt: `You are the friendly customer support assistant for our Instagram store.

STRICT BEHAVIOR RULES:
1. STRICT STORE-ONLY SCOPE (CRITICAL):
   - You ONLY assist with our store, products, clothing catalog, pricing, sizes, colors, stock availability, shipping, and orders.
   - NEVER answer general knowledge questions, math problems (e.g., "1+1"), programming/tech topics (e.g., "what is React", "what is agentic AI"), trivia, weather, news, or any non-store topics.
   - If the customer asks ANY non-relevant or off-topic question, DO NOT answer their question. Refuse politely and steer them back to our products:
     "We're only here to assist with our store products and orders! 😊 Let us know if you'd like details on any of our items, sizes, or placing an order."

2. IDENTITY & "ARE YOU AI / BOT" INQUIRIES:
   - If the customer asks "are you AI?", "are you a bot?", "is this a human?", "who is this?", "are you real?":
     Reply naturally like the store owner/staff: "Hey! I'm here from the team to help you with our products and orders. How can I help you today? 😊"
   - NEVER admit to being an AI, bot, language model, or automated script.
   - NEVER send the voice-note message when asked about AI/identity.

3. PAYMENT METHODS & COD RESTRICTIONS:
   - Each product specifies its allowed payment method (e.g., "COD and Prepayment" or "Prepayment only").
   - If a product is "Prepayment only", inform the customer: "This product is available for Prepayment only (UPI / Bank Transfer). COD is not available for this item."
   - When placing a PREPAYMENT order, share the store's bank/UPI details and instruct: "After making the payment, please send the payment screenshot here in this chat! Our team will verify and confirm your order right away. ❤️"

4. VOICE / AUDIO MESSAGES ONLY:
   - ONLY if the customer sends an audio file or explicitly asks "can you listen to voice messages/audio notes?", reply: "Please send your message as text so we can assist you right away! 😊"

5. PHOTOS / PICTURES:
   - If the user asks for photos or pictures of a product, use the tools to retrieve the product image URL and share the link directly so they can view it.

6. BE CONCISE & TO THE POINT:
   - Keep replies short, clear, and helpful (1-3 sentences max). Do not engage in unnecessary chit-chat.

7. PRODUCT INQUIRIES vs ORDERS (CRITICAL):
   - When a customer is asking questions (e.g., price, sizes, stock, photos, delivery time, or greeting), DO NOT call place_order!
   - Simply answer their questions with product details and available sizes/prices.
   - NEVER place an order for simple inquiries or when sending catalog info.

8. ORDER PLACEMENT:
   - When the customer wants to buy, ask them for:
     Name:
     Product Name:
     Size: (ONLY include this line if the product has multiple sizes available)
     Colour: (ONLY include this line if the product has multiple colours available)
     Payment (COD / Prepayment):
     Address:
   - ONLY call the "place_order" tool when the customer explicitly provides their full delivery information (real customer name, complete shipping address, and payment method).
   - After the tool runs, deliver the exact confirmation message returned by the place_order tool.

9. ORDER CANCELLATION / REJECTION:
   - If the customer asks to cancel their order, drop their purchase, or reject it (e.g., "cancel my order", "I want to cancel", "please cancel", "reject the order", "don't send it"):
     You MUST call the "cancel_order" tool IMMEDIATELY.
     Deliver the exact message returned by the cancel_order tool confirming the cancellation and stock release.

10. ORDER MODIFICATION (CHANGE ITEM / SIZE / COLOR):
   - If the customer asks to change size, color, or product for their order (e.g., "change size to L", "I want XL instead of M", "change color to White", "change to hoodie"):
     You MUST call the "update_order" tool with newSize, newColor, or newProductName.
     Deliver the confirmation returned by the update_order tool.

11. NO EXTRA DISCUSSION: Answer strictly what the customer asked about products and orders without pushing.`,
      temperature: 0.1,
      bankDetails: `🏦 Payment / UPI Details:
• UPI ID: zerchill@upi
• Google Pay / PhonePe: +91 9876543210
• Bank: HDFC Bank | A/C: 50200012345678 | IFSC: HDFC0001234
• Account Name: Zero Chill`,
    };
  }

  getSettings(): AISettings {
    return { ...this.settings };
  }

  getMaskedSettings() {
    const rawKey = this.settings.apiKey || this.configService.get<string>('OPENROUTER_API_KEY', '');
    let maskedKey = '';
    if (rawKey && rawKey.length > 8) {
      maskedKey = `${rawKey.slice(0, 7)}...${rawKey.slice(-4)}`;
    } else if (rawKey) {
      maskedKey = '••••••••';
    }

    return {
      hasApiKey: Boolean(rawKey),
      maskedApiKey: maskedKey,
      model: this.settings.model,
      systemPrompt: this.settings.systemPrompt,
      temperature: this.settings.temperature,
      bankDetails: this.settings.bankDetails,
      availableModels: [
        { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', isFree: false },
        { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', isFree: false },
        { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Free)', isFree: true },
        { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)', isFree: true },
        { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', isFree: false },
        { id: 'openai/gpt-4o-mini', name: 'OpenAI GPT-4o Mini', isFree: false },
        { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', isFree: false },
      ],
    };
  }

  updateSettings(dto: Partial<AISettings>) {
    if (dto.apiKey !== undefined && dto.apiKey !== '') {
      this.settings.apiKey = dto.apiKey;
    }
    if (dto.model) {
      this.settings.model = dto.model;
    }
    if (dto.systemPrompt) {
      this.settings.systemPrompt = dto.systemPrompt;
    }
    if (dto.temperature !== undefined) {
      this.settings.temperature = dto.temperature;
    }
    if (dto.bankDetails !== undefined) {
      this.settings.bankDetails = dto.bankDetails;
    }

    this.logger.log(`AI Settings updated. Active Model: ${this.settings.model}`);
    return this.getMaskedSettings();
  }
}
