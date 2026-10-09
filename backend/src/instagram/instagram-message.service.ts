import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InstagramAuthService } from './instagram-auth.service';
import axios from 'axios';
import { MessageDirection, SenderType } from '@prisma/client';

@Injectable()
export class InstagramMessageService {
  private readonly logger = new Logger(InstagramMessageService.name);
  private readonly graphApiVersion = 'v21.0';

  constructor(
    private prisma: PrismaService,
    private authService: InstagramAuthService,
  ) {}

  /**
   * Send an Instagram Direct Message using Meta's official Graph API
   */
  async sendMessage(params: {
    instagramAccountId: string;
    recipientId: string;
    text: string;
    conversationId?: string;
    senderType?: SenderType;
  }) {
    const accessToken = await this.authService.getDecryptedToken(params.instagramAccountId);
    const account = await this.prisma.instagramAccount.findUnique({
      where: { id: params.instagramAccountId },
    });

    if (!account) {
      throw new BadRequestException('Instagram account not found');
    }

    // Page Access Tokens must send via Page ID (account.pageId) or 'me'
    const targetId = account.pageId || account.instagramUserId || 'me';
    const url = `https://graph.facebook.com/${this.graphApiVersion}/${targetId}/messages`;

    const payload = {
      recipient: {
        id: params.recipientId,
      },
      message: {
        text: params.text,
      },
    };

    try {
      this.logger.log(`Sending Instagram message to recipient ${params.recipientId}...`);

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      const messageId = response.data?.message_id || `msg_${Date.now()}`;

      // Save outbound message to database if conversationId exists
      if (params.conversationId) {
        await this.prisma.message.create({
          data: {
            conversationId: params.conversationId,
            instagramMessageId: messageId,
            direction: MessageDirection.OUTBOUND,
            senderType: params.senderType || SenderType.AI,
            content: params.text,
            metadata: response.data || {},
          },
        });

        // Update conversation lastMessageAt
        await this.prisma.conversation.update({
          where: { id: params.conversationId },
          data: { lastMessageAt: new Date() },
        });
      }

      this.logger.log(`Message sent successfully: ${messageId}`);
      return {
        success: true,
        messageId,
        recipientId: params.recipientId,
      };
    } catch (error: any) {
      const errorDetail = error.response?.data?.error?.message || error.message;
      this.logger.error(`Failed to send Instagram message: ${errorDetail}`, error.response?.data);

      throw new BadRequestException(`Meta Graph API send error: ${errorDetail}`);
    }
  }

  /**
   * Reply publicly to a comment on a Post or Reel
   */
  async replyToComment(params: {
    instagramAccountId: string;
    commentId: string;
    text: string;
  }) {
    const accessToken = await this.authService.getDecryptedToken(params.instagramAccountId);
    const url = `https://graph.facebook.com/${this.graphApiVersion}/${params.commentId}/replies`;

    try {
      this.logger.log(`Replying to comment ${params.commentId}...`);
      const response = await axios.post(
        url,
        { message: params.text },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 25000,
        },
      );
      this.logger.log(`Comment reply posted successfully: ${response.data?.id}`);
      return { success: true, id: response.data?.id };
    } catch (error: any) {
      const errorDetail = error.response?.data?.error?.message || error.message;
      this.logger.error(`Failed to reply to comment: ${errorDetail}`, error.response?.data);
      throw new BadRequestException(`Meta Graph API comment reply error: ${errorDetail}`);
    }
  }

  /**
   * Send a Private DM reply to a user who commented on a Post or Reel
   */
  async sendPrivateReplyToComment(params: {
    instagramAccountId: string;
    commentId: string;
    text: string;
  }) {
    const accessToken = await this.authService.getDecryptedToken(params.instagramAccountId);
    const account = await this.prisma.instagramAccount.findUnique({
      where: { id: params.instagramAccountId },
    });

    if (!account) {
      throw new BadRequestException('Instagram account not found');
    }

    const targetId = account.pageId || account.instagramUserId || 'me';
    const url = `https://graph.facebook.com/${this.graphApiVersion}/${targetId}/messages`;

    try {
      this.logger.log(`Sending private DM reply to comment ${params.commentId}...`);
      const response = await axios.post(
        url,
        {
          recipient: { comment_id: params.commentId },
          message: { text: params.text },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 25000,
        },
      );
      this.logger.log(`Private DM sent to commenter successfully: ${response.data?.message_id}`);
      return { success: true, messageId: response.data?.message_id };
    } catch (error: any) {
      const errorDetail = error.response?.data?.error?.message || error.message;
      this.logger.error(`Failed to send private reply to comment: ${errorDetail}`, error.response?.data);
      throw new BadRequestException(`Meta Graph API private reply error: ${errorDetail}`);
    }
  }

  /**
   * Check if a specific Instagram user (by IGSID) is following the business account
   */
  async checkIfUserFollows(instagramAccountId: string, igUserId: string): Promise<boolean> {
    try {
      const accessToken = await this.authService.getDecryptedToken(instagramAccountId);
      const url = `https://graph.facebook.com/${this.graphApiVersion}/${igUserId}?fields=id,username,name,is_user_follow_business&access_token=${accessToken}`;
      const res = await axios.get(url, { timeout: 5000 });
      const isFollowing = res.data?.is_user_follow_business === true;
      this.logger.log(`Follower check for user ${igUserId} (@${res.data?.username || 'unknown'}): ${isFollowing ? 'FOLLOWING' : 'NOT FOLLOWING'}`);
      return isFollowing;
    } catch (err: any) {
      this.logger.warn(`Could not verify follower status for ${igUserId}: ${err.response?.data?.error?.message || err.message}`);
      return false;
    }
  }

  /**
   * Fetch customer Instagram profile (name, username, profile_picture, is_user_follow_business)
   */
  async getCustomerProfile(instagramAccountId: string, igUserId: string) {
    try {
      const accessToken = await this.authService.getDecryptedToken(instagramAccountId);
      const url = `https://graph.facebook.com/${this.graphApiVersion}/${igUserId}?fields=id,username,name,profile_pic,is_user_follow_business&access_token=${accessToken}`;
      const res = await axios.get(url, { timeout: 5000 });
      return res.data;
    } catch (err: any) {
      this.logger.warn(`Could not fetch customer profile for ${igUserId}: ${err.message}`);
      return null;
    }
  }
}
