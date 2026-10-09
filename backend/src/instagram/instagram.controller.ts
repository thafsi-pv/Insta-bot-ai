import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { InstagramService } from './instagram.service';

import { InstagramAuthService } from './instagram-auth.service';
import { InstagramMessageService } from './instagram-message.service';
import { InstagramMediaService } from './instagram-media.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { ConfigService } from '@nestjs/config';

@Controller('instagram')
export class InstagramController {
  constructor(
    private readonly instagramService: InstagramService,
    private readonly authService: InstagramAuthService,
    private readonly messageService: InstagramMessageService,
    private readonly mediaService: InstagramMediaService,
    private readonly configService: ConfigService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('organic-media')
  async getOrganicMedia(
    @Query('accountId') accountId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.mediaService.fetchOrganicMedia(
      accountId,
      limit ? parseInt(limit, 10) : 25,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('accounts')
  async listAccounts() {
    return this.instagramService.listAccounts();
  }

  @UseGuards(JwtAuthGuard)
  @Get('connect-url')
  getConnectUrl() {
    return {
      url: this.authService.getOAuthUrl(),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('connect-direct')
  async connectDirect(
    @Body()
    body: {
      accessToken: string;
      instagramUserId?: string;
      username?: string;
    },
  ) {
    return this.authService.connectDirect(body);
  }

  @Public()
  @Get('callback')
  async handleCallback(@Query('code') code: string, @Query('error') error: string, @Query('error_description') errorDesc: string, @Res() res: Response) {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    if (error) {
      console.error(`[Meta OAuth Callback] Meta returned error: ${error} - ${errorDesc}`);
      return res.redirect(
        `${frontendUrl}/instagram?status=error&message=${encodeURIComponent(
          errorDesc || error,
        )}`,
      );
    }
    try {
      console.log(`[Meta OAuth Callback] Received code from Meta, exchanging tokens...`);
      const accounts = await this.authService.handleOAuthCallback(code);
      console.log(`[Meta OAuth Callback] Successfully linked ${accounts.length} account(s)`);
      return res.redirect(`${frontendUrl}/instagram?status=connected`);
    } catch (err: any) {
      console.error(`[Meta OAuth Callback] Error during token exchange:`, err.response?.data || err.message || err);
      const errMsg = err.response?.data?.error?.message || err.message || 'OAuth failed';
      return res.redirect(
        `${frontendUrl}/instagram?status=error&message=${encodeURIComponent(
          errMsg,
        )}`,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete('accounts/:id')
  async deleteAccount(@Param('id') id: string) {
    return this.instagramService.deleteAccount(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('test-send')
  async testSendMessage(
    @Body()
    body: {
      accountId: string;
      recipientId: string;
      text: string;
    },
  ) {
    return this.messageService.sendMessage({
      instagramAccountId: body.accountId,
      recipientId: body.recipientId,
      text: body.text,
    });
  }
}
