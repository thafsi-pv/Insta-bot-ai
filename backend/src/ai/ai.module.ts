import { Module } from '@nestjs/common';
import { AISettingsController } from './ai-settings.controller';
import { AISettingsService } from './ai-settings.service';
import { OpenRouterService } from './openrouter.service';
import { AgentService } from './agent.service';
import { ProductTools } from './tools/product-tools';

@Module({
  controllers: [AISettingsController],
  providers: [
    AISettingsService,
    OpenRouterService,
    AgentService,
    ProductTools,
  ],
  exports: [
    AISettingsService,
    OpenRouterService,
    AgentService,
    ProductTools,
  ],
})
export class AIModule {}
