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

    const conversations = await this.prisma.conversation.findMany({
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

    // Aggregate token usage per conversation from AI messages
    const convIds = conversations.map((c) => c.id);
    const tokenMessages =
      convIds.length > 0
        ? await this.prisma.message.findMany({
            where: {
              conversationId: { in: convIds },
              senderType: SenderType.AI,
            },
            select: {
              conversationId: true,
              metadata: true,
            },
          })
        : [];

    const tokensMap: Record<
      string,
      { prompt: number; completion: number; total: number }
    > = {};
    for (const msg of tokenMessages) {
      const meta = msg.metadata as any;
      const t = meta?.tokens;
      if (t && typeof t.total === 'number') {
        if (!tokensMap[msg.conversationId]) {
          tokensMap[msg.conversationId] = { prompt: 0, completion: 0, total: 0 };
        }
        tokensMap[msg.conversationId].prompt += t.prompt || 0;
        tokensMap[msg.conversationId].completion += t.completion || 0;
        tokensMap[msg.conversationId].total += t.total || 0;
      }
    }

    return conversations.map((conv) => ({
      ...conv,
      tokensUsed: tokensMap[conv.id] || { prompt: 0, completion: 0, total: 0 },
    }));
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

    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;

    for (const msg of conversation.messages) {
      const meta = msg.metadata as any;
      const t = meta?.tokens;
      if (t && typeof t.total === 'number') {
        promptTokens += t.prompt || 0;
        completionTokens += t.completion || 0;
        totalTokens += t.total || 0;
      }
    }

    return {
      ...conversation,
      tokensUsed: {
        prompt: promptTokens,
        completion: completionTokens,
        total: totalTokens,
      },
    };
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
