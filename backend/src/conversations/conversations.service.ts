import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InstagramMessageService } from '../instagram/instagram-message.service';
import { ConversationStatus, SenderType } from '@prisma/client';

@Injectable()
export class ConversationsService {
  constructor(
    private prisma: PrismaService,
    private messageService: InstagramMessageService,
  ) {}

  async findAll(query?: { status?: ConversationStatus; search?: string }) {
    const where: any = {};

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.search) {
      where.customer = {
        OR: [
          { username: { contains: query.search, mode: 'insensitive' } },
          { name: { contains: query.search, mode: 'insensitive' } },
          { instagramUserId: { contains: query.search } },
        ],
      };
    }

    return this.prisma.conversation.findMany({
      where,
      include: {
        customer: {
          include: {
            instagramAccount: {
              select: { username: true, instagramUserId: true },
            },
          },
        },
        selectedProduct: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            instagramAccount: true,
          },
        },
        selectedProduct: {
          include: {
            variants: true,
            media: true,
          },
        },
        selectedVariant: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }

    return conversation;
  }

  async updateStatus(id: string, status: ConversationStatus) {
    await this.findOne(id);

    return this.prisma.conversation.update({
      where: { id },
      data: { status },
      include: {
        customer: true,
      },
    });
  }

  async sendManualReply(conversationId: string, text: string) {
    const conversation = await this.findOne(conversationId);

    if (!text || text.trim().length === 0) {
      throw new BadRequestException('Message text cannot be empty');
    }

    // Send through Instagram Meta Graph API
    await this.messageService.sendMessage({
      instagramAccountId: conversation.customer.instagramAccountId,
      recipientId: conversation.customer.instagramUserId,
      text: text.trim(),
      conversationId: conversation.id,
      senderType: SenderType.HUMAN,
    });

    // Automatically set status to HUMAN_ACTIVE if it was AI_ACTIVE
    if (conversation.status === ConversationStatus.AI_ACTIVE) {
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { status: ConversationStatus.HUMAN_ACTIVE },
      });
    }

    return this.findOne(conversationId);
  }
}
