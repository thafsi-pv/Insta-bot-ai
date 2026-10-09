import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ConversationStatus } from '@prisma/client';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  async findAll(
    @Query('status') status?: ConversationStatus,
    @Query('search') search?: string,
  ) {
    return this.conversationsService.findAll({ status, search });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.conversationsService.findOne(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: ConversationStatus,
  ) {
    return this.conversationsService.updateStatus(id, status);
  }

  @Post(':id/reply')
  async sendManualReply(
    @Param('id') id: string,
    @Body('text') text: string,
  ) {
    return this.conversationsService.sendManualReply(id, text);
  }
}
