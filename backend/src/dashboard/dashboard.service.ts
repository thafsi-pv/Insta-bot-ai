import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getMetrics() {
    const [
      instagramAccount,
      totalProducts,
      activeProducts,
      lowStockVariants,
      activeConversations,
      totalConversations,
      aiRepliesToday,
    ] = await Promise.all([
      this.prisma.instagramAccount.findFirst({
        where: { status: 'CONNECTED' },
        select: {
          id: true,
          username: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.product.count(),
      this.prisma.product.count({ where: { active: true } }),
      this.prisma.productVariant.count({
        where: {
          stock: { lte: 2 },
        },
      }),
      this.prisma.conversation.count({
        where: { status: 'AI_ACTIVE' },
      }),
      this.prisma.conversation.count(),
      this.prisma.message.count({
        where: {
          senderType: 'AI',
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    return {
      instagramConnected: !!instagramAccount,
      instagramAccount,
      totalProducts,
      activeProducts,
      lowStockCount: lowStockVariants,
      activeConversations,
      totalConversations,
      aiRepliesToday,
    };
  }
}
