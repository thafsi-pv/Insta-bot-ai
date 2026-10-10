import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AISettingsService } from './ai-settings.service';
import OpenAI from 'openai';

@Injectable()
export class OpenRouterService {
  private readonly logger = new Logger(OpenRouterService.name);

  constructor(
    private configService: ConfigService,
    private aiSettingsService: AISettingsService,
  ) {
    // Debug: confirm key is available at startup
    const keyAtStartup =
      this.aiSettingsService.getSettings().apiKey ||
      this.configService.get<string>('OPENROUTER_API_KEY') ||
      process.env.OPENROUTER_API_KEY ||
      '';
    if (keyAtStartup) {
      this.logger.log(`✅ OpenRouter API key loaded (${keyAtStartup.slice(0, 10)}...)`);
    } else {
      this.logger.error('❌ OpenRouter API key is MISSING at startup! Check .env file.');
    }
  }

  private getClient(overrideApiKey?: string): OpenAI {
    const settings = this.aiSettingsService.getSettings();
    const apiKey =
      overrideApiKey ||
      settings.apiKey ||
      this.configService.get<string>('OPENROUTER_API_KEY') ||
      process.env.OPENROUTER_API_KEY ||  // direct fallback
      '';

    const baseURL =
      this.configService.get<string>('OPENROUTER_BASE_URL') ||
      process.env.OPENROUTER_BASE_URL ||
      'https://openrouter.ai/api/v1';

    this.logger.debug(`getClient() → apiKey present: ${Boolean(apiKey)}, model: ${settings.model}`);

    if (!apiKey) {
      throw new BadRequestException(
        'OpenRouter API key is not configured. Please set it in AI Settings or OPENROUTER_API_KEY environment variable.',
      );
    }

    return new OpenAI({
      apiKey,
      baseURL,
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/insta-sales-automation',
        'X-Title': 'Instagram AI Sales Automation',
      },
    });
  }

  async testConnection(customApiKey?: string, customModel?: string) {
    const client = this.getClient(customApiKey);
    const model =
      customModel ||
      this.aiSettingsService.getSettings().model ||
      'meta-llama/llama-3.3-70b-instruct:free';

    try {
      this.logger.log(`Testing OpenRouter connection with model: ${model}...`);

      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Reply with "OpenRouter connection successful" in 5 words.' },
        ],
        max_tokens: 30,
      });

      const response = completion.choices[0]?.message?.content?.trim() || 'No response';
      return {
        success: true,
        model,
        response,
      };
    } catch (err: any) {
      this.logger.error(`OpenRouter test connection failed: ${err.message}`);
      throw new BadRequestException(
        `OpenRouter API error: ${err.error?.message || err.message || 'Connection failed'}`,
      );
    }
  }

  async createChatCompletion(params: {
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
    tools?: OpenAI.Chat.Completions.ChatCompletionTool[];
    model?: string;
    temperature?: number;
  }) {
    const client = this.getClient();
    const settings = this.aiSettingsService.getSettings();

    const model = params.model || settings.model;
    const temperature = params.temperature ?? settings.temperature;

    this.logger.log(`Invoking OpenRouter model: ${model} with ${params.messages.length} messages`);

    return client.chat.completions.create({
      model,
      messages: params.messages,
      tools: params.tools,
      tool_choice: params.tools && params.tools.length > 0 ? 'auto' : undefined,
      temperature,
      max_tokens: 350,
    });
  }
  async getCredits() {
    const settings = this.aiSettingsService.getSettings();
    const apiKey =
      settings.apiKey ||
      this.configService.get<string>('OPENROUTER_API_KEY') ||
      process.env.OPENROUTER_API_KEY ||
      '';

    if (!apiKey) {
      throw new BadRequestException('OpenRouter API key is not configured.');
    }

    try {
      // Use native fetch — OpenRouter credits endpoint is not in the OpenAI SDK
      const response = await fetch('https://openrouter.ai/api/v1/credits', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as any)?.error?.message || `HTTP ${response.status}`);
      }

      const json: any = await response.json();
      const data = json?.data || json;
      const totalCredits: number = data.total_credits ?? 0;
      const totalUsage: number = data.total_usage ?? 0;
      const remaining = totalCredits - totalUsage;

      return {
        totalCredits: parseFloat(totalCredits.toFixed(4)),
        totalUsage: parseFloat(totalUsage.toFixed(4)),
        remaining: parseFloat(remaining.toFixed(4)),
        isFreeModel: this.aiSettingsService.getSettings().model?.includes(':free') ?? false,
        model: this.aiSettingsService.getSettings().model,
      };
    } catch (err: any) {
      this.logger.error(`Failed to fetch OpenRouter credits: ${err.message}`);
      throw new BadRequestException(`Could not fetch credits: ${err.message}`);
    }
  }
}
