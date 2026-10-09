import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIToolDefinition } from '../ai.types';
import { OrderStatus, PaymentMethod } from '@prisma/client';

@Injectable()
export class ProductTools {
  private readonly logger = new Logger(ProductTools.name);

  constructor(private prisma: PrismaService) {}

  getToolDefinitions(): AIToolDefinition[] {
    return [
      {
        type: 'function',
        function: {
          name: 'search_products',
          description:
            'Search for products in the catalog using keywords, product name, or category.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query or product name to look up (e.g. "black t-shirt", "hoodie").',
              },
            },
            required: ['query'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_product_details',
          description:
            'Get detailed information about a product including all sizes, colors, variants, prices, and stock levels.',
          parameters: {
            type: 'object',
            properties: {
              productId: {
                type: 'string',
                description: 'The ID of the product.',
              },
            },
            required: ['productId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'check_stock',
          description:
            'Check real-time inventory stock level for a product and optionally a specific size or color variant.',
          parameters: {
            type: 'object',
            properties: {
              productId: {
                type: 'string',
                description: 'The ID of the product.',
              },
              size: {
                type: 'string',
                description: 'Optional size (e.g. "S", "M", "L", "XL").',
              },
              color: {
                type: 'string',
                description: 'Optional color (e.g. "Black", "White").',
              },
            },
            required: ['productId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_price',
          description:
            'Get the exact price of a product or specific variant.',
          parameters: {
            type: 'object',
            properties: {
              productId: {
                type: 'string',
                description: 'The ID of the product.',
              },
              variantId: {
                type: 'string',
                description: 'Optional variant ID.',
              },
            },
            required: ['productId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_product_photos',
          description:
            'Get the photo/image URLs for a product when a customer asks to see pictures or photos of it.',
          parameters: {
            type: 'object',
            properties: {
              productId: {
                type: 'string',
                description: 'The ID of the product or product name.',
              },
            },
            required: ['productId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'place_order',
          description:
            'Record a customer order when the customer provides their complete details (Name, Product Name/Size, Payment Method, Address).',
          parameters: {
            type: 'object',
            properties: {
              customerName: {
                type: 'string',
                description: 'Full name of the customer.',
              },
              productName: {
                type: 'string',
                description: 'Name of the product they are purchasing.',
              },
              size: {
                type: 'string',
                description: 'Size chosen (if applicable, e.g. "M", "L", "XL").',
              },
              color: {
                type: 'string',
                description: 'Color chosen (if applicable).',
              },
              paymentMethod: {
                type: 'string',
                enum: ['COD', 'PREPAYMENT'],
                description: 'Payment mode: "COD" for Cash on Delivery, or "PREPAYMENT" for online pay.',
              },
              shippingAddress: {
                type: 'string',
                description: 'Delivery/shipping address including pincode/city.',
              },
              conversationId: {
                type: 'string',
                description: 'The active conversation ID if available.',
              },
              customerId: {
                type: 'string',
                description: 'The customer ID if available.',
              },
            },
            required: ['customerName', 'productName', 'shippingAddress'],
          },
        },
      },
    ];
  }

  async executeTool(name: string, args: Record<string, any>): Promise<any> {
    this.logger.log(`Executing AI Tool: ${name} with args: ${JSON.stringify(args)}`);

    switch (name) {
      case 'search_products':
        return this.searchProducts(args.query);
      case 'get_product_details':
        return this.getProductDetails(args.productId);
      case 'check_stock':
        return this.checkStock(args.productId, args.size, args.color);
      case 'get_price':
        return this.getPrice(args.productId, args.variantId);
      case 'get_product_photos':
        return this.getProductPhotos(args.productId);
      case 'place_order':
        return this.placeOrder(args as any);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  }

  async searchProducts(query: string) {
    if (!query) return { products: [] };
    const cleanQuery = query.trim().toLowerCase();

    // Generate search variations & tokens
    const tokens = cleanQuery
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1);

    // Expand common synonyms (e.g. tshirt -> t-shirt, tee)
    const expandedTokens = new Set<string>([cleanQuery, ...tokens]);
    for (const t of tokens) {
      if (t === 'tshirt' || t === 't-shirt' || t === 'tee') {
        expandedTokens.add('t-shirt');
        expandedTokens.add('tshirt');
        expandedTokens.add('shirt');
      }
      if (t === 'hoody' || t === 'hoodie') {
        expandedTokens.add('hoodie');
        expandedTokens.add('hoody');
      }
    }

    const searchConditions: any[] = [];
    for (const token of expandedTokens) {
      searchConditions.push(
        { name: { contains: token, mode: 'insensitive' } },
        { description: { contains: token, mode: 'insensitive' } },
        {
          variants: {
            some: {
              OR: [
                { color: { contains: token, mode: 'insensitive' } },
                { size: { contains: token, mode: 'insensitive' } },
                { sku: { contains: token, mode: 'insensitive' } },
              ],
            },
          },
        },
      );
    }

    const products = await this.prisma.product.findMany({
      where: {
        active: true,
        OR: searchConditions,
      },
      include: {
        variants: {
          where: { active: true },
          select: {
            id: true,
            size: true,
            color: true,
            priceOverride: true,
            stock: true,
          },
        },
        media: true,
      },
      take: 8,
    });

    return {
      query: cleanQuery,
      totalMatches: products.length,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        description: p.description,
        photos: p.media.map((m) => m.imageUrl),
        totalStock: p.variants.reduce((sum, v) => sum + v.stock, 0),
        allowCod: p.allowCod,
        allowPrepayment: p.allowPrepayment,
        paymentOptions:
          p.allowCod && p.allowPrepayment
            ? 'COD and Prepayment (UPI/Online)'
            : p.allowPrepayment
            ? 'Prepayment only (UPI / Bank Transfer - COD not available)'
            : 'Cash on Delivery (COD only)',
        availableVariants: p.variants.map((v) => ({
          id: v.id,
          size: v.size,
          color: v.color,
          stock: v.stock,
          price: v.priceOverride || p.price,
          inStock: v.stock > 0,
        })),
      })),
    };
  }

  async getProductDetails(productId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [
          { id: productId },
          { name: { contains: productId, mode: 'insensitive' } },
        ],
      },
      include: {
        variants: {
          where: { active: true },
        },
        media: true,
      },
    });

    if (!product) {
      return { error: 'Product not found', productId };
    }

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      basePrice: product.price,
      allowCod: product.allowCod,
      allowPrepayment: product.allowPrepayment,
      paymentOptions:
        product.allowCod && product.allowPrepayment
          ? 'COD and Prepayment (UPI/Online)'
          : product.allowPrepayment
          ? 'Prepayment only (UPI / Bank Transfer - COD not available)'
          : 'Cash on Delivery (COD only)',
      photos: product.media.map((m) => m.imageUrl),
      variants: product.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        size: v.size,
        color: v.color,
        price: v.priceOverride || product.price,
        stock: v.stock,
        isAvailable: v.stock > 0,
      })),
    };
  }

  async getProductPhotos(productId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [
          { id: productId },
          { name: { contains: productId, mode: 'insensitive' } },
        ],
      },
      include: { media: true },
    });

    if (!product || product.media.length === 0) {
      return { message: 'No photos currently uploaded for this product.', photos: [] };
    }

    return {
      productName: product.name,
      photos: product.media.map((m) => m.imageUrl),
    };
  }

  async checkStock(productId: string, size?: string, color?: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [
          { id: productId },
          { name: { contains: productId, mode: 'insensitive' } },
        ],
      },
      include: {
        variants: {
          where: { active: true },
        },
      },
    });

    if (!product) {
      return { error: 'Product not found', productId };
    }

    let matchingVariants = product.variants;

    if (size) {
      matchingVariants = matchingVariants.filter(
        (v) => v.size?.toLowerCase() === size.toLowerCase(),
      );
    }

    if (color) {
      matchingVariants = matchingVariants.filter(
        (v) => v.color?.toLowerCase() === color.toLowerCase(),
      );
    }

    if (matchingVariants.length === 0 && (size || color)) {
      return {
        productId: product.id,
        productName: product.name,
        requestedSize: size,
        requestedColor: color,
        found: false,
        message: `No variant matching size "${size || 'any'}" and color "${color || 'any'}".`,
        availableSizes: [...new Set(product.variants.filter((v) => v.stock > 0).map((v) => v.size))],
      };
    }

    return {
      productId: product.id,
      productName: product.name,
      variants: matchingVariants.map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color,
        stock: v.stock,
        isAvailable: v.stock > 0,
      })),
    };
  }

  async getPrice(productId: string, variantId?: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [
          { id: productId },
          { name: { contains: productId, mode: 'insensitive' } },
        ],
      },
      include: {
        variants: {
          where: { active: true },
        },
      },
    });

    if (!product) {
      return { error: 'Product not found', productId };
    }

    if (variantId) {
      const variant = product.variants.find((v) => v.id === variantId);
      if (variant) {
        return {
          productName: product.name,
          variantId: variant.id,
          size: variant.size,
          color: variant.color,
          price: variant.priceOverride || product.price,
        };
      }
    }

    return {
      productName: product.name,
      basePrice: product.price,
      variants: product.variants.map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color,
        price: v.priceOverride || product.price,
      })),
    };
  }

  async placeOrder(params: {
    customerName: string;
    productName: string;
    size?: string;
    color?: string;
    paymentMethod?: string;
    shippingAddress: string;
    conversationId?: string;
    customerId?: string;
  }) {
    // Find matching product
    const product = await this.prisma.product.findFirst({
      where: {
        name: { contains: params.productName.trim(), mode: 'insensitive' },
      },
      include: {
        variants: { where: { active: true } },
      },
    });

    // Smart Variant Matching
    let matchedVariant = null;
    if (product && product.variants.length > 0) {
      // 1. Explicit size or color parameter match
      if (params.size || params.color) {
        matchedVariant = product.variants.find((v) => {
          const matchSize = params.size ? v.size?.toLowerCase() === params.size.trim().toLowerCase() : true;
          const matchColor = params.color ? v.color?.toLowerCase() === params.color.trim().toLowerCase() : true;
          return matchSize && matchColor;
        });
      }

      // 2. Detect size / color in productName text (e.g., "Black Hoodie XL" or "Size M")
      if (!matchedVariant) {
        const words = `${params.productName} ${params.size || ''}`.toLowerCase().split(/[\s,/-]+/);
        for (const variant of product.variants) {
          if (variant.size && words.includes(variant.size.toLowerCase())) {
            matchedVariant = variant;
            break;
          }
        }
      }

      // 3. Fallback to in-stock variant or first variant
      if (!matchedVariant) {
        matchedVariant = product.variants.find((v) => v.stock > 0) || product.variants[0];
      }
    }

    const price = matchedVariant?.priceOverride || product?.price || 0;
    const paymentMethod =
      params.paymentMethod?.toUpperCase() === 'PREPAYMENT'
        ? PaymentMethod.PREPAYMENT
        : PaymentMethod.COD;

    // Check payment method restrictions
    if (product) {
      if (!product.allowCod && product.allowPrepayment && paymentMethod === PaymentMethod.COD) {
        return {
          error: 'COD_NOT_ALLOWED',
          productName: product.name,
          message: `Sorry, ${product.name} is available for Prepayment only (UPI / Bank Transfer). COD is not available for this item. Please proceed with Prepayment to confirm your order!`,
        };
      }
      if (product.allowCod && !product.allowPrepayment && paymentMethod === PaymentMethod.PREPAYMENT) {
        return {
          error: 'PREPAYMENT_NOT_ALLOWED',
          productName: product.name,
          message: `Sorry, ${product.name} is available for Cash on Delivery (COD) only.`,
        };
      }
    }

    // Create Order in Database with PENDING_APPROVAL
    let custId = params.customerId;
    if (!custId) {
      const firstCust = await this.prisma.customer.findFirst();
      custId = firstCust?.id;
    }

    if (!custId) {
      return { error: 'No customer account linked.' };
    }

    const variantLabel = matchedVariant
      ? [matchedVariant.size ? `Size: ${matchedVariant.size}` : null, matchedVariant.color ? `Color: ${matchedVariant.color}` : null]
          .filter(Boolean)
          .join(', ')
      : '';
    const itemDisplayName = variantLabel
      ? `${product?.name || params.productName} (${variantLabel})`
      : product?.name || params.productName;

    const order = await this.prisma.order.create({
      data: {
        customerId: custId,
        conversationId: params.conversationId || undefined,
        customerName: params.customerName.trim(),
        shippingAddress: params.shippingAddress.trim(),
        paymentMethod,
        status: OrderStatus.PENDING_APPROVAL,
        totalAmount: price,
        items: {
          create: [
            {
              productId: product?.id,
              variantId: matchedVariant?.id,
              name: itemDisplayName,
              quantity: 1,
              price,
            },
          ],
        },
      },
      include: {
        items: {
          include: { variant: true, product: true },
        },
      },
    });

    // ⚡ INSTANT STOCK REDUCTION: Reduce corresponding variant stock immediately upon order placement (before human approval)
    if (matchedVariant) {
      const newStock = Math.max(0, matchedVariant.stock - 1);
      await this.prisma.productVariant.update({
        where: { id: matchedVariant.id },
        data: { stock: newStock },
      });
      this.logger.log(
        `[INSTANT STOCK REDUCTION] Variant ${matchedVariant.id} (${matchedVariant.size || ''} ${matchedVariant.color || ''}) stock decremented from ${matchedVariant.stock} to ${newStock} for order ${order.id}`,
      );
    }

    this.logger.log(`Created new pending order ${order.id} for customer ${order.customerName}`);

    const bankDetailsText = `🏦 *Payment / UPI Details:*
• UPI ID: zerchill@upi
• Google Pay / PhonePe: +91 9876543210
• Bank: HDFC Bank | A/C: 50200012345678 | IFSC: HDFC0001234
• Account Name: Zero Chill`;

    const variantConfirmText = variantLabel ? ` [${variantLabel}]` : '';

    if (paymentMethod === PaymentMethod.PREPAYMENT) {
      return {
        success: true,
        orderId: order.id,
        status: 'PENDING_APPROVAL',
        customerName: order.customerName,
        productName: product?.name || params.productName,
        variant: variantLabel,
        price,
        paymentMethod: 'PREPAYMENT',
        message: `Thank you ${order.customerName}! Your order for "${product?.name || params.productName}${variantConfirmText}" (₹${price}) has been placed! ❤️\n\n${bankDetailsText}\n\n📸 *Please send the payment screenshot here in this chat.* Our team will verify and confirm your order right away! ✨`,
      };
    }

    return {
      success: true,
      orderId: order.id,
      status: 'PENDING_APPROVAL',
      customerName: order.customerName,
      productName: product?.name || params.productName,
      variant: variantLabel,
      price,
      paymentMethod: 'COD',
      message: `Thank you ${order.customerName}! We have received your COD order for "${product?.name || params.productName}${variantConfirmText}" (₹${price}). Our team will verify and confirm shortly! ❤️`,
    };
  }
}
