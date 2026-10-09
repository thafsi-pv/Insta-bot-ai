import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InstagramController } from './instagram.controller';
import { InstagramWebhookController } from './instagram-webhook.controller';
import { InstagramService } from './instagram.service';
import { InstagramAuthService } from './instagram-auth.service';
import { InstagramMessageService } from './instagram-message.service';
import { InstagramMediaService } from './instagram-media.service';
import { InstagramMessageProcessor } from './instagram-message.processor';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'instagram-messages',
    }),
    AIModule,
  ],
  controllers: [InstagramController, InstagramWebhookController],
  providers: [
    InstagramService,
    InstagramAuthService,
    InstagramMessageService,
    InstagramMediaService,
    InstagramMessageProcessor,
  ],
  exports: [
    InstagramService,
    InstagramAuthService,
    InstagramMessageService,
    InstagramMediaService,
    BullModule,
  ],
})
export class InstagramModule {}

