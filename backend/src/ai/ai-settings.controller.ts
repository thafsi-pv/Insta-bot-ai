import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AISettingsService } from './ai-settings.service';
import { OpenRouterService } from './openrouter.service';
import { AgentService } from './agent.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AISettings } from './ai.types';

@Controller('settings/ai')
@UseGuards(JwtAuthGuard)
export class AISettingsController {
  constructor(
    private readonly aiSettingsService: AISettingsService,
    private readonly openRouterService: OpenRouterService,
    private readonly agentService: AgentService,
  ) {}

  @Get()
  getSettings() {
    return this.aiSettingsService.getMaskedSettings();
  }

  @Post()
  updateSettings(@Body() body: Partial<AISettings>) {
    return this.aiSettingsService.updateSettings(body);
  }

  @Post('test-connection')
  async testConnection(
    @Body()
    body?: {
      apiKey?: string;
      model?: string;
    },
  ) {
    return this.openRouterService.testConnection(body?.apiKey, body?.model);
  }

  @Post('playground')
  async runPlayground(
    @Body()
    body: {
      message: string;
      selectedProductId?: string;
      attachedMediaId?: string;
    },
  ) {
    return this.agentService.processCustomerMessage({
      customerId: 'playground_customer',
      conversationId: 'playground_conversation',
      selectedProductId: body.selectedProductId,
      attachedMediaId: body.attachedMediaId,
      recentMessages: [
        {
          role: 'user',
          content: body.message,
        },
      ],
    });
  }
}
