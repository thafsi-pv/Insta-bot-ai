import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  ForbiddenException,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';
import type { InstagramWebhookPayload } from './instagram.types';
import { MessageDirection, SenderType, ConversationStatus } from '@prisma/client';


import { InstagramMessageService } from './instagram-message.service';

@Controller('webhooks/instagram')
export class InstagramWebhookController {
  private readonly logger = new Logger(InstagramWebhookController.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private messageService: InstagramMessageService,
    @InjectQueue('instagram-messages') private messageQueue: Queue,
  ) {}

  /**
   * Meta Webhook Verification Endpoint
   */
  @Public()
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = this.configService.get<string>(
      'INSTAGRAM_WEBHOOK_VERIFY_TOKEN',
      'insta_bot_webhook_token_2026',
    );

    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.log('Meta Webhook verification handshake successful');
      return res.status(HttpStatus.OK).send(challenge);
    }

    this.logger.warn(`Invalid webhook verification attempt. Token: ${token}`);
    throw new ForbiddenException('Webhook verification failed');
  }

  /**
   * Meta Webhook Event Ingress
   */
  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: InstagramWebhookPayload) {
    console.log('\n' + '='.repeat(70));
    console.log(`📥 [META WEBHOOK RECEIVED] ${new Date().toISOString()}`);
    console.log('='.repeat(70));
    console.log(JSON.stringify(payload, null, 2));

    if (!payload || !payload.entry) {
      console.log('⚠️ [WEBHOOK] Empty or malformed payload, ignoring.');
      return { status: 'ignored' };
    }

    for (const entry of payload.entry) {
      let messagingEvents: any[] = [];

      // 1. Check Page format: entry.messaging
      if (entry.messaging && Array.isArray(entry.messaging)) {
        messagingEvents = entry.messaging;
      }

      // 2. Check Instagram direct format: entry.changes
      if (entry.changes && Array.isArray(entry.changes)) {
        for (const change of entry.changes) {
          if (change.field === 'messages' && change.value) {
            messagingEvents.push(change.value);
          }

          // Handle Post & Reel Comments
          if (change.field === 'comments' && change.value) {
            const comment = change.value;
            const commentId = comment.id;
            const commentText = comment.text;
            const fromUser = comment.from;
            const mediaId = comment.media?.id;

            console.log(`\n💬 [NEW POST/REEL COMMENT]`);
            console.log(`   ├─ Comment ID : ${commentId}`);
            console.log(`   ├─ From User  : @${fromUser?.username} (ID: ${fromUser?.id})`);
            console.log(`   ├─ Media ID   : ${mediaId}`);
            console.log(`   └─ Text       : "${commentText}"`);

            // Find account
            const account = await this.prisma.instagramAccount.findFirst({
              where: { OR: [{ instagramUserId: entry.id }, { pageId: entry.id }] },
            }) || await this.prisma.instagramAccount.findFirst();

            const isOwnComment =
              fromUser?.id === entry.id ||
              fromUser?.id === account.instagramUserId ||
              fromUser?.id === account.pageId ||
              (account.username &&
                fromUser?.username &&
                fromUser.username.toLowerCase() === account.username.toLowerCase());

            if (!account || !commentId || isOwnComment) {
              if (isOwnComment) {
                console.log(
                  `🔇 [WEBHOOK COMMENT] Comment was made by our own account (@${fromUser?.username}), skipping.`,
                );
              }
              continue;
            }

            try {
              // Resolve which product this post is linked to (if any)
              let linkedProductId: string | null = null;
              let linkedProductName: string | null = null;
              if (mediaId) {
                const productMedia = await this.prisma.productMedia.findFirst({
                  where: { instagramMediaId: mediaId },
                  include: { product: true },
                });
                if (productMedia?.product) {
                  linkedProductId = productMedia.product.id;
                  linkedProductName = productMedia.product.name;
                  console.log(`🏷️ [COMMENT GATE] Linked to product: "${linkedProductName}"`);
                }
              }

              // Find or create customer so we can store follow-gate context
              let customer = await this.prisma.customer.findUnique({
                where: {
                  instagramAccountId_instagramUserId: {
                    instagramAccountId: account.id,
                    instagramUserId: fromUser.id,
                  },
                },
              });
              if (!customer) {
                customer = await this.prisma.customer.create({
                  data: {
                    instagramAccountId: account.id,
                    instagramUserId: fromUser.id,
                    username: fromUser.username || `user_${fromUser.id.slice(-6)}`,
                  },
                });
              }

              // Store follow-gate context on the conversation
              let conversation = await this.prisma.conversation.findFirst({
                where: { customerId: customer.id, status: { not: ConversationStatus.CLOSED } },
                orderBy: { lastMessageAt: 'desc' },
              });
              if (!conversation) {
                conversation = await this.prisma.conversation.create({
                  data: { customerId: customer.id, status: ConversationStatus.AI_ACTIVE },
                });
              }
              // Tag the conversation with the pending follow-gate product
              if (linkedProductId) {
                await this.prisma.conversation.update({
                  where: { id: conversation.id },
                  data: { selectedProductId: linkedProductId },
                });
              }

              // Check if commenter is already following our account
              const isFollowing = await this.messageService.checkIfUserFollows(account.id, fromUser.id);
              const productHint = linkedProductName ? ` about the *${linkedProductName}*` : '';

              if (isFollowing && linkedProductId) {
                // User is ALREADY following — send full product details immediately!
                const product = await this.prisma.product.findUnique({
                  where: { id: linkedProductId },
                  include: {
                    variants: { where: { active: true } },
                    media: true,
                  },
                });

                let replyText = `Hey${fromUser?.username ? ` @${fromUser.username}` : ''}! 👋 Thanks for following us! Here are the details you asked for:\n\n`;
                if (product) {
                  const availableVariants = product.variants.filter((v) => v.stock > 0);
                  const sizesInStock = [...new Set(availableVariants.map((v) => v.size).filter(Boolean))];
                  const colorsInStock = [...new Set(availableVariants.map((v) => v.color).filter(Boolean))];
                  const photoUrl = product.media?.[0]?.imageUrl || null;

                  replyText += `📦 *${product.name}*\n`;
                  if (product.description) replyText += `${product.description}\n`;
                  replyText += `\n💰 Price: ₹${product.price}`;
                  if (sizesInStock.length > 0) replyText += `\n📏 Sizes available: ${sizesInStock.join(', ')}`;
                  const realSizes = sizesInStock.filter((s) => s && s.toLowerCase() !== 'default' && s.toLowerCase() !== 'standard');
                  const realColors = colorsInStock.filter((c) => c && c.toLowerCase() !== 'default' && c.toLowerCase() !== 'standard');
                  const hasMultipleVariants = availableVariants.length > 1;

                  let variantFields = '';
                  if (hasMultipleVariants) {
                    if (realSizes.length > 0) {
                      variantFields += '\nSize:';
                    }
                    if (realColors.length > 0) {
                      variantFields += '\nColour:';
                    }
                  }

                  const paymentText =
                    product.allowCod && product.allowPrepayment
                      ? 'Payment (COD / Prepayment):'
                      : product.allowPrepayment
                      ? 'Payment: Prepayment (UPI/Bank Transfer - COD not available)'
                      : 'Payment: COD (Cash on Delivery)';

                  replyText += `\n\nTo place your order, just reply with:\n\nName:\nProduct Name: ${product.name}${variantFields}\n${paymentText}\nAddress:\n\nWe'll confirm everything right away! 😊`;
                }

                // 1. Public comment reply
                await this.messageService.replyToComment({
                  instagramAccountId: account.id,
                  commentId,
                  text: `Hey @${fromUser?.username || 'there'}! We've sent the complete details to your DM! 🎁`,
                });

                // 2. Private DM with product details
                await this.messageService.sendPrivateReplyToComment({
                  instagramAccountId: account.id,
                  commentId,
                  text: replyText,
                });

                console.log(`✨ [FOLLOWER DETECTED] @${fromUser?.username} already follows! Product details sent immediately.`);
              } else {
                // User is NOT following yet — send follow instructions with direct profile link
                await this.messageService.replyToComment({
                  instagramAccountId: account.id,
                  commentId,
                  text: `Hey @${fromUser?.username || 'there'}! 👋 Follow our page @${account.username} & check your DMs for the full details! ✨`,
                });

                await this.messageService.sendPrivateReplyToComment({
                  instagramAccountId: account.id,
                  commentId,
                  text: `Hey${fromUser?.username ? ` @${fromUser.username}` : ''}! 👋 Thanks for showing interest${productHint}!\n\n1️⃣ Tap to follow our page:\n👉 https://instagram.com/${account.username}\n\n2️⃣ Reply **"DONE"** here\n\nOnce you follow, I'll send you all the details, pricing & how to order right away! 🎁`,
                });

                console.log(`✨ [FOLLOW-GATE] User not following. Sent follow requirement with direct link to @${fromUser?.username}`);
              }
            } catch (commentErr: any) {
              console.warn(`⚠️ [COMMENT REPLY ERROR] ${commentErr.message}`);
            }
          }
        }
      }

      console.log(`🔍 [WEBHOOK ENTRY] ID: ${entry.id}, Total Events to process: ${messagingEvents.length}`);

      for (const event of messagingEvents) {
        const senderId = event.sender?.id;
        const recipientId = event.recipient?.id;
        const messageText = event.message?.text;
        const messageMid = event.message?.mid;
        const isEcho = event.message?.is_echo === true;

        console.log(`\n📨 [NEW DM EVENT]`);
        console.log(`   ├─ Sender IGSID    : ${senderId}`);
        console.log(`   ├─ Recipient IGSID : ${recipientId}`);
        console.log(`   ├─ Message ID (mid): ${messageMid}`);
        console.log(`   ├─ Is Echo         : ${isEcho}`);
        console.log(`   └─ Message Content : "${messageText}"`);

        // Skip echo messages (messages sent BY our account — would cause infinite loop)
        if (isEcho) {
          console.log(`🔇 [WEBHOOK] Echo message (sent by our bot), skipping.`);
          continue;
        }

        if (!event.message || !event.message.text) {
          console.log(`ℹ️ [WEBHOOK] Non-text event (e.g. read receipt/delivery), skipping AI processing.`);
          continue;
        }

        // 1. Check idempotency: ignore if message mid already exists
        const existing = await this.prisma.message.findUnique({
          where: { instagramMessageId: messageMid },
        });

        if (existing) {
          console.log(`🔁 [WEBHOOK] Duplicate message ID already processed (${messageMid}), skipping.`);
          continue;
        }

        // 2. Identify the connected Instagram Account (recipient in inbound DM)
        // For real Instagram DMs: entry.id = FB Page ID, recipient.id = IG User ID
        let account = await this.prisma.instagramAccount.findFirst({
          where: {
            OR: [
              { instagramUserId: recipientId },   // Direct IG User ID match
              { instagramUserId: entry.id },       // entry.id is IG User ID (test events)
              { pageId: entry.id },               // entry.id is FB Page ID (real DMs)
              { pageId: recipientId },            // recipient is FB Page ID
            ],
          },
        });

        // Fallback: if only 1 account connected, use it (covers entry.id = Page ID case)
        if (!account) {
          const totalAccounts = await this.prisma.instagramAccount.count();
          if (totalAccounts === 1) {
            account = await this.prisma.instagramAccount.findFirst();
            console.log(`ℹ️ [ACCOUNT MATCH] Matched default single connected account: @${account?.username}`);
          }
        }

        if (!account) {
          console.warn(
            `❌ [ACCOUNT ERROR] No Instagram Account found in database for recipient: ${recipientId} / Entry: ${entry.id}`,
          );
          continue;
        }

        // 🔑 Skip if sender IS our own IG account or page (extra safety for echo events)
        if (senderId === account.instagramUserId || senderId === account.pageId) {
          console.log(`\ud83d\udd07 [WEBHOOK] Sender is our own account/page (${senderId}), skipping echo.`);
          continue;
        }

        // 🔑 Also skip if the message text matches a recent outbound message we sent (loop prevention)
        if (messageText) {
          const recentOutbound = await this.prisma.message.findFirst({
            where: {
              content: messageText,
              direction: 'OUTBOUND',
              createdAt: { gte: new Date(Date.now() - 120_000) }, // last 2 minutes
            },
          });
          if (recentOutbound) {
            console.log(`\ud83d\udd07 [WEBHOOK] Message content matches recent outbound, skipping loop.`);
            continue;
          }
        }

        console.log(`✅ [ACCOUNT FOUND] Linked to @${account.username} (ID: ${account.instagramUserId})`);

        // 3. Find or create Customer
        let customer = await this.prisma.customer.findUnique({
          where: {
            instagramAccountId_instagramUserId: {
              instagramAccountId: account.id,
              instagramUserId: senderId,
            },
          },
        });

        if (!customer) {
          customer = await this.prisma.customer.create({
            data: {
              instagramAccountId: account.id,
              instagramUserId: senderId,
              username: `user_${senderId.slice(-6)}`,
            },
          });
          console.log(`👤 [NEW CUSTOMER CREATED] IGSID: ${senderId} -> Assigned: ${customer.username}`);
        } else {
          console.log(`👤 [EXISTING CUSTOMER] ${customer.username} (${customer.id})`);
        }

        // 4. Find or create active Conversation
        let conversation = await this.prisma.conversation.findFirst({
          where: {
            customerId: customer.id,
            status: { not: ConversationStatus.CLOSED },
          },
          orderBy: { lastMessageAt: 'desc' },
        });

        if (!conversation) {
          conversation = await this.prisma.conversation.create({
            data: {
              customerId: customer.id,
              status: ConversationStatus.AI_ACTIVE,
            },
          });
          console.log(`💬 [NEW CONVERSATION CREATED] ID: ${conversation.id}`);
        } else {
          console.log(`💬 [ACTIVE CONVERSATION] ID: ${conversation.id} (Status: ${conversation.status})`);
        }

        // 5. Extract available media/post context from reply_to or referral
        const attachedMediaId =
          event.message.reply_to?.story?.id ||
          event.message.referral?.product?.id ||
          null;

        if (attachedMediaId) {
          console.log(`📎 [MEDIA ATTACHMENT] Post/Story ID: ${attachedMediaId}`);
        }

        // 6. Save Inbound Message
        const savedMessage = await this.prisma.message.create({
          data: {
            conversationId: conversation.id,
            instagramMessageId: messageMid || `mid_${Date.now()}`,
            direction: MessageDirection.INBOUND,
            senderType: SenderType.CUSTOMER,
            content: messageText || '',
            metadata: {
              rawEvent: event as any,
              attachedMediaId,
            } as any,
          },
        });

        console.log(`💾 [MESSAGE SAVED IN DB] Message ID: ${savedMessage.id}`);

        // 7. Update conversation lastMessageAt
        await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: { lastMessageAt: new Date() },
        });

        // 8. Detect "DONE" follow-gate reply
        const normalizedText = (messageText || '').trim().toLowerCase();
        const isFollowDoneReply = normalizedText === 'done' || normalizedText === 'followed' || normalizedText === 'done ✅';

        // 8. Queue job for BullMQ worker (Do not wait for AI inside webhook!)
        const job = await this.messageQueue.add(
          'process-message',
          {
            messageId: savedMessage.id,
            conversationId: conversation.id,
            customerId: customer.id,
            accountId: account.id,
            instagramUserId: senderId,
            text: messageText || '',
            attachedMediaId,
            isFollowDoneReply,                        // ← follow-gate flag
            selectedProductId: conversation.selectedProductId,  // ← product context
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1500,
            },
            removeOnComplete: true,
          },
        );

        console.log(`🚀 [BULLMQ QUEUE] Dispatched AI job #${job.id} (followDone=${isFollowDoneReply}) for processing.\n`);
      }
    }

    // Always return 200 OK quickly to Meta
    return { status: 'EVENT_RECEIVED' };
  }
}
