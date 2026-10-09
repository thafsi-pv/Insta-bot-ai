import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InstagramAuthService } from './instagram-auth.service';
import { MediaType } from '@prisma/client';
import axios from 'axios';

export interface PublishMediaParams {
  productId: string;
  caption: string;
  mediaType?: 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'REELS';
  imageUrl?: string;
  mediaUrls?: string[];
}

@Injectable()
export class InstagramMediaService {
  private readonly logger = new Logger(InstagramMediaService.name);
  private readonly graphApiVersion = 'v21.0';

  constructor(
    private prisma: PrismaService,
    private authService: InstagramAuthService,
  ) {}

  /**
   * Priority 1: Match Instagram Media ID with ProductMedia in PostgreSQL
   */
  async findProductByInstagramMediaId(instagramMediaId: string) {
    if (!instagramMediaId) return null;

    const media = await this.prisma.productMedia.findFirst({
      where: { instagramMediaId },
      include: {
        product: {
          include: {
            variants: true,
            media: true,
          },
        },
      },
    });

    if (media?.product) {
      this.logger.log(
        `Priority 1 Match: Found product "${media.product.name}" for Instagram media ${instagramMediaId}`,
      );
      return media.product;
    }

    return null;
  }

  /**
   * Fetch Instagram Post/Story details from Meta Graph API
   */
  async getMediaDetails(instagramAccountId: string, mediaId: string) {
    try {
      const accessToken = await this.authService.getDecryptedToken(instagramAccountId);
      const url = `https://graph.facebook.com/${this.graphApiVersion}/${mediaId}?fields=id,media_type,media_url,caption,permalink,thumbnail_url&access_token=${accessToken}`;
      const res = await axios.get(url, { timeout: 6000 });
      return res.data;
    } catch (err: any) {
      this.logger.warn(`Failed to fetch media details for ${mediaId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Fetch live organic media (Posts, Reels, Carousels) from connected Instagram account
   * Cross-references database to see which ones are already linked to products!
   */
  async fetchOrganicMedia(instagramAccountId?: string, limit = 25) {
    const account = instagramAccountId
      ? await this.prisma.instagramAccount.findUnique({ where: { id: instagramAccountId } })
      : await this.prisma.instagramAccount.findFirst();

    if (!account) {
      throw new BadRequestException('No connected Instagram account found');
    }

    const accessToken = await this.authService.getDecryptedToken(account.id);
    const url = `https://graph.facebook.com/${this.graphApiVersion}/${account.instagramUserId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{id,media_type,media_url}&limit=${limit}&access_token=${accessToken}`;

    try {
      const response = await axios.get(url, { timeout: 10000 });
      const rawMedia = response.data?.data || [];

      // Fetch all linked productMedia for these media IDs in one query
      const mediaIds = rawMedia.map((m: any) => m.id);
      const linkedRecords = await this.prisma.productMedia.findMany({
        where: { instagramMediaId: { in: mediaIds } },
        include: {
          product: {
            select: { id: true, name: true, price: true },
          },
        },
      });

      const linkedMap = new Map<string, any>();
      for (const rec of linkedRecords) {
        if (rec.instagramMediaId) {
          linkedMap.set(rec.instagramMediaId, rec.product);
        }
      }

      return rawMedia.map((item: any) => ({
        id: item.id,
        caption: item.caption || '',
        mediaType: item.media_type, // 'IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'
        mediaUrl: item.media_url || item.thumbnail_url || null,
        thumbnailUrl: item.thumbnail_url || item.media_url || null,
        permalink: item.permalink,
        timestamp: item.timestamp,
        linkedProduct: linkedMap.get(item.id) || null,
      }));
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch organic media from Instagram: ${error.response?.data?.error?.message || error.message}`,
      );
      throw new BadRequestException(
        `Failed to fetch Instagram posts: ${error.response?.data?.error?.message || error.message}`,
      );
    }
  }

  /**
   * Polls container status for video/reels until FINISHED or ERROR
   */
  private async pollContainerStatus(
    creationId: string,
    accessToken: string,
    maxAttempts = 20,
    intervalMs = 3000,
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const statusRes = await axios.get(
          `https://graph.facebook.com/${this.graphApiVersion}/${creationId}?fields=status_code&access_token=${accessToken}`,
          { timeout: 8000 },
        );

        const status = statusRes.data?.status_code;
        this.logger.log(`Container ${creationId} processing status [attempt ${attempt}]: ${status}`);

        if (status === 'FINISHED') {
          return;
        }

        if (status === 'ERROR' || status === 'EXPIRED') {
          throw new BadRequestException(`Media container processing failed with status: ${status}`);
        }
      } catch (err: any) {
        if (err instanceof BadRequestException) throw err;
        this.logger.warn(`Notice while checking container status: ${err.message}`);
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    this.logger.warn(`Container ${creationId} status check timed out, attempting publish anyway...`);
  }

  /**
   * Publish Single Image, Reel, or Multi-item Carousel directly to Instagram
   * and link the created Instagram Media ID with the product.
   */
  async publishProductPost(params: PublishMediaParams) {
    const account = await this.prisma.instagramAccount.findFirst();
    if (!account) {
      throw new BadRequestException('No connected Instagram account found to publish post');
    }

    const accessToken = await this.authService.getDecryptedToken(account.id);
    const mediaUrls = params.mediaUrls && params.mediaUrls.length > 0
      ? params.mediaUrls
      : params.imageUrl ? [params.imageUrl] : [];

    if (mediaUrls.length === 0) {
      throw new BadRequestException('At least one image or video URL is required to publish to Instagram');
    }

    const isVideoUrl = (url: string) =>
      /\.(mp4|mov|webm|m4v)(\?.*)?$/i.test(url) || url.includes('/video/upload/');

    let creationId: string;

    try {
      // 1. CAROUSEL POST (Multiple files selected, or explicitly requested)
      if (params.mediaType === 'CAROUSEL' || mediaUrls.length > 1) {
        this.logger.log(`Publishing Carousel with ${mediaUrls.length} items for product ${params.productId}...`);

        const childIds: string[] = [];
        for (const url of mediaUrls.slice(0, 10)) { // Meta allows max 10 carousel items
          const isVid = isVideoUrl(url);
          const childPayload: Record<string, any> = {
            is_carousel_item: true,
          };

          if (isVid) {
            childPayload.media_type = 'VIDEO';
            childPayload.video_url = url;
          } else {
            childPayload.image_url = url;
          }

          const childRes = await axios.post(
            `https://graph.facebook.com/${this.graphApiVersion}/${account.instagramUserId}/media`,
            childPayload,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              timeout: 25000,
            },
          );

          const childId = childRes.data?.id;
          if (!childId) {
            throw new BadRequestException('Failed to create carousel item container');
          }

          if (isVid) {
            await this.pollContainerStatus(childId, accessToken);
          }

          childIds.push(childId);
        }

        // Create Parent Carousel Container
        const parentRes = await axios.post(
          `https://graph.facebook.com/${this.graphApiVersion}/${account.instagramUserId}/media`,
          {
            media_type: 'CAROUSEL',
            caption: params.caption,
            children: childIds,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 25000,
          },
        );

        creationId = parentRes.data?.id;
      }
      // 2. REEL (Video post)
      else if (params.mediaType === 'REELS' || isVideoUrl(mediaUrls[0])) {
        this.logger.log(`Publishing Instagram Reel for product ${params.productId}...`);

        const reelRes = await axios.post(
          `https://graph.facebook.com/${this.graphApiVersion}/${account.instagramUserId}/media`,
          {
            media_type: 'REELS',
            video_url: mediaUrls[0],
            caption: params.caption,
            share_to_feed: true,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          },
        );

        creationId = reelRes.data?.id;
        if (!creationId) {
          throw new BadRequestException('Failed to create Reel container on Instagram');
        }

        // Wait for Meta to transcode the video
        await this.pollContainerStatus(creationId, accessToken);
      }
      // 3. SINGLE IMAGE POST
      else {
        this.logger.log(`Publishing Single Image Post for product ${params.productId}...`);

        const imgRes = await axios.post(
          `https://graph.facebook.com/${this.graphApiVersion}/${account.instagramUserId}/media`,
          {
            image_url: mediaUrls[0],
            caption: params.caption,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 20000,
          },
        );

        creationId = imgRes.data?.id;
      }

      if (!creationId) {
        throw new BadRequestException('Failed to create media container on Meta Graph API');
      }

      // Step 2: Publish the media container
      this.logger.log(`Publishing container ID ${creationId} to Instagram...`);
      const publishRes = await axios.post(
        `https://graph.facebook.com/${this.graphApiVersion}/${account.instagramUserId}/media_publish`,
        {
          creation_id: creationId,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 25000,
        },
      );

      const instagramMediaId = publishRes.data?.id;

      // Step 3: Link instagramMediaId with ProductMedia in PostgreSQL
      if (instagramMediaId && params.productId) {
        const determinedType = params.mediaType === 'REELS' || isVideoUrl(mediaUrls[0])
          ? MediaType.VIDEO
          : mediaUrls.length > 1
          ? MediaType.CAROUSEL
          : MediaType.IMAGE;

        // Upsert or create
        const existingMedia = await this.prisma.productMedia.findFirst({
          where: { productId: params.productId },
        });

        if (existingMedia) {
          await this.prisma.productMedia.update({
            where: { id: existingMedia.id },
            data: {
              instagramMediaId,
              imageUrl: mediaUrls[0],
              type: determinedType,
            },
          });
        } else {
          await this.prisma.productMedia.create({
            data: {
              productId: params.productId,
              imageUrl: mediaUrls[0],
              instagramMediaId,
              type: determinedType,
            },
          });
        }
        this.logger.log(
          `Linked Instagram Media ID ${instagramMediaId} (${determinedType}) to Product ${params.productId}`,
        );
      }

      return {
        success: true,
        instagramMediaId,
        productId: params.productId,
      };
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error?.message ||
        error.message ||
        'Failed to publish to Instagram';
      this.logger.error(`Instagram publish error: ${errorMsg}`, error.response?.data);
      throw new BadRequestException(`Meta Instagram publish error: ${errorMsg}`);
    }
  }
}
