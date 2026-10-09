import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InstagramMessageService } from '../instagram/instagram-message.service';
import { OrderStatus, SenderType, MessageDirection } from '@prisma/client';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private messageService: InstagramMessageService,
  ) {}

  async findAll(query?: { status?: OrderStatus; search?: string }) {
    const where: any = {};

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.search) {
      where.OR = [
        { customerName: { contains: query.search, mode: 'insensitive' } },
        { shippingAddress: { contains: query.search, mode: 'insensitive' } },
        {
          items: {
            some: {
              name: { contains: query.search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    return this.prisma.order.findMany({
      where,
      include: {
        customer: {
          include: {
            instagramAccount: true,
          },
        },
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        conversation: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            instagramAccount: true,
          },
        },
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        conversation: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async approveOrder(id: string) {
    const order = await this.findOne(id);

    if (order.status === OrderStatus.APPROVED) {
      throw new BadRequestException('Order is already approved');
    }

    // Note: Stock was already reduced instantly upon customer order creation
    this.logger.log(`Approving order ${order.id} for customer ${order.customerName}`);

    // 1. Update Order status to APPROVED
    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.APPROVED },
      include: {
        customer: true,
        items: true,
      },
    });

    // 2. Send confirmation Instagram DM to the customer
    if (order.customer && order.customer.instagramAccountId) {
      try {
        const confirmMsg = `🎉 Great news ${order.customerName}! Your order for "${order.items.map((i) => i.name).join(', ')}" has been approved and confirmed by our team! We will prepare it for shipment to: ${order.shippingAddress}. Thank you for shopping with us! ❤️`;

        await this.messageService.sendMessage({
          instagramAccountId: order.customer.instagramAccountId,
          recipientId: order.customer.instagramUserId,
          text: confirmMsg,
          conversationId: order.conversationId || undefined,
          senderType: SenderType.HUMAN,
        });
        this.logger.log(`Sent order confirmation DM to customer ${order.customerName}`);
      } catch (dmErr: any) {
        this.logger.warn(`Could not send order confirmation DM: ${dmErr.message}`);
      }
    }

    return updatedOrder;
  }

  async rejectOrder(id: string, reason?: string) {
    const order = await this.findOne(id);

    // If rejecting an order that was pending or approved, restore/increment stock back to inventory
    if (order.status !== OrderStatus.REJECTED) {
      for (const item of order.items) {
        if (item.variantId) {
          await this.prisma.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
          this.logger.log(
            `[STOCK RESTORED] Restored ${item.quantity} units to variant ${item.variantId} after rejecting order ${order.id}`,
          );
        }
      }
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.REJECTED },
    });

    // Send update DM to customer
    if (order.customer && order.customer.instagramAccountId) {
      try {
        const rejectMsg = `Hello ${order.customerName}, we apologize but we are unable to process your order for "${order.items.map((i) => i.name).join(', ')}" at this moment${reason ? ` (${reason})` : ''}. Please feel free to message us if you have any questions!`;

        await this.messageService.sendMessage({
          instagramAccountId: order.customer.instagramAccountId,
          recipientId: order.customer.instagramUserId,
          text: rejectMsg,
          conversationId: order.conversationId || undefined,
          senderType: SenderType.HUMAN,
        });
      } catch (dmErr: any) {
        this.logger.warn(`Could not send order rejection DM: ${dmErr.message}`);
      }
    }

    return updatedOrder;
  }
}
