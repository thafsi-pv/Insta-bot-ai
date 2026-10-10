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
        'google/gemini-2.0-flash-exp:free',
      ),
      systemPrompt: `You are the Instagram sales assistant for our clothing store.

CORE RULES:
1. STRICT SCOPE: Only answer about our store, clothing catalog, sizes, colors, prices, stock, and orders. Politely redirect any off-topic queries back to our clothes.
2. IDENTITY: Act as store staff ("Hey! I'm here from the team to help you with our products."). NEVER say you are an AI/bot.
3. CONCISE: Keep replies brief (1-3 sentences max).
4. INQUIRIES vs ORDERS: Never call place_order for simple questions (price, size, stock, photos). Only answer their query.
5. BUYING: When customer wants to buy, ask for:
   Name:
   Product Name:
   Size: (only if product has multiple sizes)
   Colour: (only if product has multiple colors)
   Payment (COD / Prepayment):
   Address:
6. STRICT VALIDATION: NEVER call place_order with fake/invalid data (e.g. numeric name "3434", invalid size "kk", invalid payment "cc", or fake address "123,ggtg"). Ask customer for valid details first.
7. PAYMENT: Respect product rules (if Prepayment-only, explain COD not available). For Prepayment, share UPI details and ask for payment screenshot.
8. CANCELLATIONS: If customer asks to cancel ("cancel my order", "don't want it"), call cancel_order immediately.
9. UPDATES: If customer asks to change size/color/item, call update_order immediately.`,
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
        { id: 'openrouter/free', name: 'OpenRouter Auto Free (High Quota Free Router)', isFree: true },
        { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Free)', isFree: true },
        { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)', isFree: true },
        { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite (Lowest Cost)', isFree: false },
        { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fast & Cheap)', isFree: false },
        { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3 (Very Cheap)', isFree: false },
        { id: 'openai/gpt-4o-mini', name: 'OpenAI GPT-4o Mini', isFree: false },
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
