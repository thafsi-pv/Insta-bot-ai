import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InstagramAccountStatus } from '@prisma/client';

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  constructor(private prisma: PrismaService) {}

  async listAccounts() {
    return this.prisma.instagramAccount.findMany({
      select: {
        id: true,
        businessId: true,
        instagramUserId: true,
        username: true,
        status: true,
        tokenExpiresAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            customers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAccountById(id: string) {
    const account = await this.prisma.instagramAccount.findUnique({
      where: { id },
      select: {
        id: true,
        businessId: true,
        instagramUserId: true,
        username: true,
        status: true,
        tokenExpiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!account) {
      throw new NotFoundException(`Instagram account with ID "${id}" not found`);
    }

    return account;
  }

  async disconnectAccount(id: string) {
    const account = await this.prisma.instagramAccount.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException(`Instagram account not found`);
    }

    await this.prisma.instagramAccount.update({
      where: { id },
      data: {
        status: InstagramAccountStatus.DISCONNECTED,
      },
    });

    this.logger.log(`Disconnected Instagram account: @${account.username}`);
    return { success: true, message: `Account @${account.username} disconnected` };
  }

  async deleteAccount(id: string) {
    const account = await this.prisma.instagramAccount.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundException(`Instagram account not found`);
    }

    await this.prisma.instagramAccount.delete({
      where: { id },
    });

    this.logger.log(`Deleted Instagram account: @${account.username}`);
    return { success: true, message: `Account @${account.username} deleted` };
  }
}
