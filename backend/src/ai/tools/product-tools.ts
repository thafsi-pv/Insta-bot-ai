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
      {
        type: 'function',
        function: {
          name: 'cancel_order',
          description:
            'Cancel or reject an active customer order when the customer asks to cancel their order, drop the purchase, or reject it.',
          parameters: {
            type: 'object',
            properties: {
              orderId: {
                type: 'string',
                description: 'Optional order ID if known or mentioned by customer.',
              },
              reason: {
                type: 'string',
                description: 'Optional reason for cancellation.',
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
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'update_order',
          description:
            'Update or change an existing pending order (e.g., change size, color, or change to a different product) when requested by the customer.',
          parameters: {
            type: 'object',
            properties: {
              orderId: {
                type: 'string',
                description: 'Optional order ID if known.',
              },
              newProductName: {
                type: 'string',
                description: 'New product name if customer wants to switch to a different product.',
              },
              newSize: {
                type: 'string',
                description: 'New size requested (e.g. "S", "M", "L", "XL").',
              },
              newColor: {
                type: 'string',
                description: 'New color requested (e.g. "Black", "White").',
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
      case 'cancel_order':
        return this.cancelOrder(args as any);
      case 'update_order':
        return this.updateOrder(args as any);
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

  isInvalidCustomerName(name: string): boolean {
    if (!name || name.trim().length < 2 || name.trim().length > 40) return true;
    const lower = name.toLowerCase().trim();

    // Must contain actual letters (not pure numbers like "3434" or mostly digits)
    const letterCount = (name.match(/[a-zA-Z]/g) || []).length;
    if (letterCount < 2) return true;
    if (/^\d+$/.test(name.trim())) return true;
    const digitCount = (name.match(/\d/g) || []).length;
    if (digitCount >= letterCount) return true;

    const invalidStarters = [
      'hey', 'hello', 'hi', 'thanks', 'thank you', 'dear', 'welcome',
      'to place', 'reply with', 'product', 'size', 'payment', 'address', 'details',
    ];
    if (invalidStarters.some((s) => lower.startsWith(s))) return true;
    if (lower.includes('@') || lower.includes('http') || lower.includes('details you asked')) return true;
    if (/[👋🎁✨❤️😊📦💰📏]/.test(name)) return true;
    return false;
  }

  isInvalidAddress(address: string): boolean {
    if (!address || address.trim().length < 10) return true;
    const lower = address.toLowerCase().trim();
    const templateWords = [
      'to place your order', 'just reply with', 'sizes available', 'in stock',
      'price: ₹', 'price:', 'details you asked', 'payment (cod', 'confirm everything',
      'thanks for following',
    ];
    if (templateWords.some((w) => lower.includes(w))) return true;
    if (/[📦💰📏]/.test(address)) return true;

    // Must contain at least 6 letters for area/city/street
    const letterCount = (address.match(/[a-zA-Z]/g) || []).length;
    if (letterCount < 6) return true;

    // Reject short random comma strings like "123,ggtg"
    const parts = address.split(/[,\s]+/).filter((p) => p.length >= 2);
    if (parts.length < 2) return true;

    return false;
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
    const cleanName = (params.customerName || '').trim();
    const cleanAddress = (params.shippingAddress || '').trim();

    // 1. Strict Name Check
    if (this.isInvalidCustomerName(cleanName)) {
      this.logger.warn(`[REJECT ORDER] Invalid customer name: "${cleanName}"`);
      return {
        error: 'INVALID_CUSTOMER_NAME',
        message: 'Could not place order: Please provide a valid customer full name (letters only, e.g. "Rahul Sharma").',
      };
    }

    // 2. Strict Address Check
    if (this.isInvalidAddress(cleanAddress)) {
      this.logger.warn(`[REJECT ORDER] Invalid shipping address: "${cleanAddress}"`);
      return {
        error: 'INVALID_SHIPPING_ADDRESS',
        message: 'Could not place order: Please provide a complete delivery address with house/street, area, city, and pincode.',
      };
    }

    // 3. Strict Payment Method Check
    const rawPayment = (params.paymentMethod || '').trim().toLowerCase();
    const isCod = rawPayment === 'cod' || rawPayment.includes('cash on delivery');
    const isPrepay =
      rawPayment === 'prepayment' ||
      rawPayment === 'pre-payment' ||
      rawPayment === 'online' ||
      rawPayment === 'upi' ||
      rawPayment.includes('prepay');

    if (!isCod && !isPrepay) {
      this.logger.warn(`[REJECT ORDER] Invalid payment method: "${params.paymentMethod}"`);
      return {
        error: 'INVALID_PAYMENT_METHOD',
        message: 'Could not place order: Please choose a valid payment method: "COD" (Cash on Delivery) or "Prepayment" (UPI / Online).',
      };
    }
    const paymentMethod = isPrepay ? PaymentMethod.PREPAYMENT : PaymentMethod.COD;

    // 4. Find matching product
    const product = await this.prisma.product.findFirst({
      where: {
        name: { contains: params.productName.trim(), mode: 'insensitive' },
      },
      include: {
        variants: { where: { active: true } },
      },
    });

    if (!product) {
      return {
        error: 'PRODUCT_NOT_FOUND',
        message: `Could not find "${params.productName}" in our catalog. Please check the product name!`,
      };
    }

    // 5. Strict Variant (Size & Color) Matching
    let matchedVariant = null;
    if (product.variants.length > 0) {
      const distinctSizes = [...new Set(product.variants.map((v) => v.size).filter((s) => s && s.toLowerCase() !== 'default'))];
      const distinctColors = [...new Set(product.variants.map((v) => v.color).filter((c) => c && c.toLowerCase() !== 'default'))];

      // If user provided a size or color, it MUST match
      if (params.size || params.color) {
        matchedVariant = product.variants.find((v) => {
          const matchSize = params.size ? v.size?.toLowerCase() === params.size.trim().toLowerCase() : true;
          const matchColor = params.color ? v.color?.toLowerCase() === params.color.trim().toLowerCase() : true;
          return matchSize && matchColor;
        });

        // If no match was found for the requested size/color, DO NOT SILENTLY FALLBACK!
        if (!matchedVariant) {
          const invalidParts = [
            params.size ? `Size "${params.size}"` : null,
            params.color ? `Color "${params.color}"` : null,
          ].filter(Boolean).join(' and ');

          return {
            error: 'VARIANT_NOT_FOUND',
            message: `Sorry, ${product.name} is not available in ${invalidParts}. Available sizes: ${distinctSizes.join(', ') || 'Standard'}${distinctColors.length > 0 ? `, Colors: ${distinctColors.join(', ')}` : ''}. Please choose from the available options!`,
          };
        }
      }

      // If product has multiple sizes and customer didn't specify one, demand size
      if (!matchedVariant && distinctSizes.length > 1) {
        return {
          error: 'SIZE_REQUIRED',
          message: `Please specify your desired size for ${product.name}. Available sizes: ${distinctSizes.join(', ')}.`,
        };
      }

      // Fallback only if product has a single standard variant
      if (!matchedVariant) {
        matchedVariant = product.variants.find((v) => v.stock > 0) || product.variants[0];
      }
    }

    // 6. Check stock level
    if (matchedVariant && matchedVariant.stock <= 0) {
      return {
        error: 'OUT_OF_STOCK',
        message: `Sorry, ${product.name} in Size: ${matchedVariant.size || 'Standard'} is currently out of stock!`,
      };
    }

    const price = matchedVariant?.priceOverride || product?.price || 0;

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
        customerName: cleanName,
        shippingAddress: cleanAddress,
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

    // ⚡ INSTANT STOCK REDUCTION: Reduce corresponding variant stock immediately upon order placement
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

  /**
   * Cancel or reject an existing customer order
   */
  async cancelOrder(params: {
    conversationId?: string;
    customerId?: string;
    orderId?: string;
    reason?: string;
  }) {
    let order = null;

    if (params.orderId) {
      order = await this.prisma.order.findUnique({
        where: { id: params.orderId },
        include: { items: true },
      });
    }

    if (!order && params.conversationId) {
      order = await this.prisma.order.findFirst({
        where: {
          conversationId: params.conversationId,
          status: { in: [OrderStatus.PENDING_APPROVAL, OrderStatus.APPROVED] },
        },
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      });
    }

    if (!order && params.customerId) {
      order = await this.prisma.order.findFirst({
        where: {
          customerId: params.customerId,
          status: { in: [OrderStatus.PENDING_APPROVAL, OrderStatus.APPROVED] },
        },
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      });
    }

    if (!order) {
      return {
        success: false,
        message: 'We could not find an active pending order to cancel. If you have an Order ID, please let us know! 😊',
      };
    }

    // Restore reserved stock back to inventory
    for (const item of order.items) {
      if (item.variantId) {
        await this.prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
        this.logger.log(`[STOCK RESTORED VIA AI] Restored ${item.quantity} to variant ${item.variantId} after cancellation.`);
      }
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.REJECTED },
    });

    const itemNames = order.items.map((i) => i.name).join(', ') || 'item';
    return {
      success: true,
      orderId: order.id,
      message: `Your order for "${itemNames}" has been cancelled as requested, and the item has been released. Let us know if you need anything else! 😊`,
    };
  }

  /**
   * Update size, color, or item in an existing pending order
   */
  async updateOrder(params: {
    conversationId?: string;
    customerId?: string;
    orderId?: string;
    newProductName?: string;
    newSize?: string;
    newColor?: string;
  }) {
    let order = null;

    if (params.orderId) {
      order = await this.prisma.order.findUnique({
        where: { id: params.orderId },
        include: { items: { include: { product: true, variant: true } } },
      });
    }

    if (!order && params.conversationId) {
      order = await this.prisma.order.findFirst({
        where: {
          conversationId: params.conversationId,
          status: OrderStatus.PENDING_APPROVAL,
        },
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { product: true, variant: true } } },
      });
    }

    if (!order && params.customerId) {
      order = await this.prisma.order.findFirst({
        where: {
          customerId: params.customerId,
          status: OrderStatus.PENDING_APPROVAL,
        },
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { product: true, variant: true } } },
      });
    }

    if (!order || order.items.length === 0) {
      return {
        success: false,
        message: 'No pending order was found to update. Would you like to place a new order instead?',
      };
    }

    const currentItem = order.items[0];

    // Find the target product (new product or current product)
    const targetProduct = params.newProductName
      ? await this.prisma.product.findFirst({
          where: { name: { contains: params.newProductName.trim(), mode: 'insensitive' } },
          include: { variants: { where: { active: true } } },
        })
      : currentItem.productId
      ? await this.prisma.product.findUnique({
          where: { id: currentItem.productId },
          include: { variants: { where: { active: true } } },
        })
      : null;

    if (!targetProduct) {
      return {
        success: false,
        message: 'Could not find the requested product in our catalog.',
      };
    }

    // Match new variant
    let matchedVariant = null;
    if (params.newSize || params.newColor) {
      matchedVariant = targetProduct.variants.find((v) => {
        const matchSize = params.newSize ? v.size?.toLowerCase() === params.newSize.trim().toLowerCase() : true;
        const matchColor = params.newColor ? v.color?.toLowerCase() === params.newColor.trim().toLowerCase() : true;
        return matchSize && matchColor;
      });
    } else {
      matchedVariant = targetProduct.variants.find((v) => v.stock > 0) || targetProduct.variants[0];
    }

    if (!matchedVariant) {
      const availSizes = targetProduct.variants.map((v) => v.size).filter(Boolean).join(', ');
      return {
        success: false,
        message: `Sorry, we could not find ${targetProduct.name} in that size/color. Available sizes: ${availSizes || 'Standard'}.`,
      };
    }

    if (matchedVariant.stock <= 0 && matchedVariant.id !== currentItem.variantId) {
      return {
        success: false,
        message: `Sorry, ${targetProduct.name} in Size: ${matchedVariant.size || 'Standard'} is currently out of stock!`,
      };
    }

    // Revert stock of previous variant
    if (currentItem.variantId && currentItem.variantId !== matchedVariant.id) {
      await this.prisma.productVariant.update({
        where: { id: currentItem.variantId },
        data: { stock: { increment: currentItem.quantity } },
      });
    }

    // Decrement stock of new variant
    if (matchedVariant.id !== currentItem.variantId) {
      await this.prisma.productVariant.update({
        where: { id: matchedVariant.id },
        data: { stock: { decrement: currentItem.quantity } },
      });
    }

    const newPrice = matchedVariant.priceOverride || targetProduct.price;
    const variantLabel = [
      matchedVariant.size ? `Size: ${matchedVariant.size}` : null,
      matchedVariant.color ? `Color: ${matchedVariant.color}` : null,
    ]
      .filter(Boolean)
      .join(', ');
    const newDisplayName = variantLabel
      ? `${targetProduct.name} (${variantLabel})`
      : targetProduct.name;

    // Update item
    await this.prisma.orderItem.update({
      where: { id: currentItem.id },
      data: {
        productId: targetProduct.id,
        variantId: matchedVariant.id,
        name: newDisplayName,
        price: newPrice,
      },
    });

    // Update order total
    await this.prisma.order.update({
      where: { id: order.id },
      data: { totalAmount: newPrice },
    });

    return {
      success: true,
      orderId: order.id,
      productName: targetProduct.name,
      variant: variantLabel,
      price: newPrice,
      message: `We've updated your order! New selection: "${newDisplayName}" (₹${newPrice}). We'll process your order with this updated item! ✨`,
    };
  }
}
