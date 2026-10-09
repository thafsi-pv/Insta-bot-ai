import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InstagramMediaService } from '../instagram/instagram-media.service';
import { OpenRouterService } from '../ai/openrouter.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { MediaType } from '@prisma/client';

export interface CreateProductDto {
  name: string;
  description?: string;
  price: number;
  allowCod?: boolean;
  allowPrepayment?: boolean;
  active?: boolean;
  variants?: {
    sku?: string;
    size?: string;
    color?: string;
    priceOverride?: number;
    stock?: number;
    active?: boolean;
  }[];
  media?: {
    imageUrl: string;
    type?: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
    instagramMediaId?: string;
  }[];
}

export interface UpdateProductDto extends Partial<CreateProductDto> {}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private prisma: PrismaService,
    private instagramMediaService: InstagramMediaService,
    private openRouterService: OpenRouterService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async findAll(query?: { search?: string; active?: boolean }) {
    const where: any = {};

    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query?.active !== undefined) {
      where.active = query.active;
    }

    return this.prisma.product.findMany({
      where,
      include: {
        variants: true,
        media: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        media: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async create(data: CreateProductDto) {
    const { variants, media, ...productData } = data;

    return this.prisma.product.create({
      data: {
        ...productData,
        variants: variants && variants.length > 0
          ? {
              create: variants.map((v) => ({
                sku: v.sku,
                size: v.size,
                color: v.color,
                priceOverride: v.priceOverride,
                stock: v.stock ?? 0,
                active: v.active ?? true,
              })),
            }
          : undefined,
        media: media && media.length > 0
          ? {
              create: media.map((m) => ({
                imageUrl: m.imageUrl,
                type: m.type ?? 'IMAGE',
              })),
            }
          : undefined,
      },
      include: {
        variants: true,
        media: true,
      },
    });
  }

  async update(id: string, data: UpdateProductDto) {
    await this.findOne(id);
    const { variants, media, ...productData } = data;

    // Delete existing variants and media if provided
    if (variants) {
      await this.prisma.productVariant.deleteMany({ where: { productId: id } });
    }
    if (media) {
      await this.prisma.productMedia.deleteMany({ where: { productId: id } });
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        variants: variants && variants.length > 0
          ? {
              create: variants.map((v) => ({
                sku: v.sku,
                size: v.size,
                color: v.color,
                priceOverride: v.priceOverride,
                stock: v.stock ?? 0,
                active: v.active ?? true,
              })),
            }
          : undefined,
        media: media && media.length > 0
          ? {
              create: media.map((m) => ({
                imageUrl: m.imageUrl,
                type: m.type ?? 'IMAGE',
              })),
            }
          : undefined,
      },
      include: {
        variants: true,
        media: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.delete({
      where: { id },
    });
  }

  /**
   * Generate an Instagram caption and trending hashtags using AI
   */
  async generateCaptionAndHashtags(params: {
    name: string;
    price: number;
    description?: string;
  }) {
    const prompt = `You are a social media manager for an Instagram fashion and clothing store.
Create an engaging, modern, high-converting Instagram post caption and trending hashtags for this product:

Product Name: ${params.name}
Price: $${params.price}
Details: ${params.description || 'Premium quality, stylish and comfortable.'}

Instructions:
1. Write a catchy headline with emojis.
2. Highlight key features in 2-3 clean bullet points.
3. Include clear price and call to action (e.g. "👉 Send us a DM to order or comment below!").
4. Add 15-20 relevant, popular Instagram hashtags (e.g. #fashion #streetwear #instafashion).

Return ONLY the final ready-to-post caption with hashtags. Do not include introductory conversational text.`;

    try {
      const completion = await this.openRouterService.createChatCompletion({
        messages: [{ role: 'user', content: prompt }],
      });

      const caption =
        completion.choices[0]?.message?.content?.trim() ||
        `✨ New Arrival: ${params.name}!\n\n💰 Price: $${params.price}\n\n👉 Send us a DM to order or comment below!\n\n#fashion #style #newarrival #shopnow #ootd`;

      return { caption };
    } catch (err: any) {
      this.logger.warn(`AI caption generation fallback: ${err.message}`);
      return {
        caption: `✨ Check out our ${params.name}!\n\n🔥 Price: $${params.price}\n📦 High quality, limited stock.\n\n📩 DM us directly to order with your details!\n\n#shopping #trending #style #instastore #musthave`,
      };
    }
  }

  /**
   * Upload multiple media files (images/videos) to Cloudinary
   */
  async uploadMedia(files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided for upload');
    }
    return this.cloudinaryService.uploadMultipleFiles(files);
  }

  /**
   * Link an organic Instagram Post, Reel, or Carousel to a Product
   */
  async linkInstagramMedia(
    productId: string,
    data: {
      instagramMediaId: string;
      mediaUrl?: string;
      mediaType?: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
    },
  ) {
    await this.findOne(productId);

    if (!data.instagramMediaId) {
      throw new BadRequestException('Instagram Media ID is required');
    }

    // Determine type
    const mediaType = data.mediaType === 'VIDEO'
      ? MediaType.VIDEO
      : data.mediaType === 'CAROUSEL'
      ? MediaType.CAROUSEL
      : MediaType.IMAGE;

    // Check if this media is already linked to another product and re-assign if needed
    const existing = await this.prisma.productMedia.findFirst({
      where: { instagramMediaId: data.instagramMediaId },
    });

    if (existing) {
      await this.prisma.productMedia.update({
        where: { id: existing.id },
        data: {
          productId,
          imageUrl: data.mediaUrl || existing.imageUrl,
          type: mediaType,
        },
      });
    } else {
      await this.prisma.productMedia.create({
        data: {
          productId,
          instagramMediaId: data.instagramMediaId,
          imageUrl: data.mediaUrl || '',
          type: mediaType,
        },
      });
    }

    this.logger.log(`Linked organic Instagram Media ${data.instagramMediaId} to Product ${productId}`);
    return this.findOne(productId);
  }

  /**
   * Unlink an Instagram Media ID from a Product
   */
  async unlinkInstagramMedia(productId: string, instagramMediaId: string) {
    await this.findOne(productId);

    await this.prisma.productMedia.deleteMany({
      where: {
        productId,
        instagramMediaId,
      },
    });

    this.logger.log(`Unlinked Instagram Media ${instagramMediaId} from Product ${productId}`);
    return this.findOne(productId);
  }

  /**
   * Publish product post (Image, Reel, or Multi-item Carousel) to Instagram
   */
  async publishToInstagram(
    id: string,
    data: {
      caption: string;
      mediaType?: 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'REELS';
      mediaUrls?: string[];
      imageUrl?: string;
    },
  ) {
    const product = await this.findOne(id);

    const urls = data.mediaUrls && data.mediaUrls.length > 0
      ? data.mediaUrls
      : data.imageUrl
      ? [data.imageUrl]
      : product.media?.map((m) => m.imageUrl).filter(Boolean) || [];

    if (urls.length === 0) {
      throw new BadRequestException('Product must have at least one image or video to publish to Instagram');
    }

    const result = await this.instagramMediaService.publishProductPost({
      productId: product.id,
      caption: data.caption,
      mediaType: data.mediaType,
      mediaUrls: urls,
    });

    return result;
  }
}
