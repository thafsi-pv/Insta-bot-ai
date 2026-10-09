import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { InstagramModule } from './instagram/instagram.module';
import { AIModule } from './ai/ai.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { ProductsModule } from './products/products.module';
import { ConversationsModule } from './conversations/conversations.module';
import { OrdersModule } from './orders/orders.module';
import { CloudinaryModule } from './common/cloudinary/cloudinary.module';

@Module({
  imports: [
    CloudinaryModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (redisUrl) {
          // Upstash Redis (TLS URL: rediss://...)
          return { connection: { url: redisUrl } };
        }
        return {
          connection: {
            host: configService.get<string>('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
          },
        };
      },
    }),
    PrismaModule,
    AuthModule,
    DashboardModule,
    InstagramModule,
    AIModule,
    ProductsModule,
    ConversationsModule,
    OrdersModule,
  ],


  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
