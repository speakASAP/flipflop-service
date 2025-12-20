/**
 * Cart Service
 * Handles shopping cart operations
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService, LoggerService, WarehouseClientService, CatalogClientService } from '@flipflop/shared';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly warehouseClient: WarehouseClientService,
    private readonly catalogClient: CatalogClientService,
  ) {}

  /**
   * Get user's cart with product details
   */
  async getCart(userId: string) {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        products: true,
        product_variants: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    let total = 0;
    const items = cartItems.map((item: any) => {
      const itemTotal = Number(item.price) * item.quantity;
      total += itemTotal;

      return {
        id: item.id,
        productId: item.productId,
        products: item.products ? {
          id: item.products.id,
          name: item.products.name,
          sku: item.products.sku,
          description: item.products.description,
          price: Number(item.products.price),
          stockQuantity: item.products.stockQuantity,
          brand: item.products.brand,
          mainImageUrl: item.products.mainImageUrl,
          imageUrls: item.products.imageUrls as string[] | undefined,
        } : null,
        variantId: item.variantId || undefined,
        variant: item.product_variants
          ? {
              id: item.product_variants.id,
              productId: item.product_variants.productId,
              name: item.product_variants.name,
              sku: item.product_variants.sku,
              price: Number(item.product_variants.price),
              stockQuantity: item.product_variants.stockQuantity,
              attributes: item.product_variants.options as Record<string, string> | undefined,
            }
          : undefined,
        quantity: item.quantity,
        price: Number(item.price),
      };
    });

    return {
      items,
      total: Number(total.toFixed(2)),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }

  /**
   * Add item to cart
   */
  async addToCart(userId: string, productId: string, variantId: string | undefined, quantity: number) {
    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { product_variants: variantId ? { where: { id: variantId } } : false },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.isActive) {
      throw new BadRequestException('Product is not available');
    }

    // Verify variant if provided
    if (variantId) {
      const variant = product.product_variants?.find((v) => v.id === variantId);
      if (!variant) {
        throw new NotFoundException('Product variant not found');
      }
      if (!variant.isActive) {
        throw new BadRequestException('Product variant is not available');
      }
    }

    // Check stock availability from warehouse-microservice
    await this.checkStockAvailability(productId, product.catalogProductId, quantity);

    // Get price from variant or product
    let price: number;
    if (variantId && product.product_variants && product.product_variants.length > 0) {
      const variant = product.product_variants.find((v) => v.id === variantId);
      price = variant ? Number(variant.price) : Number(product.price);
    } else {
      price = Number(product.price);
    }

    // Check if item already exists in cart
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        userId,
        productId,
        variantId: variantId || null,
      },
    });

    if (existingItem) {
      // Check stock for new total quantity
      const newQuantity = existingItem.quantity + quantity;
      await this.checkStockAvailability(productId, product.catalogProductId, newQuantity);

      // Update quantity
      const updated = await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        include: {
          products: true,
          product_variants: true,
        },
      });

      this.logger.log('Cart item updated', { userId, cartItemId: updated.id });
      return this.mapCartItem(updated);
    }

    // Create new cart item
    const cartItem = await this.prisma.cartItem.create({
      data: {
        userId,
        productId,
        variantId: variantId || null,
        quantity,
        price,
      },
      include: {
        products: true,
        product_variants: true,
      },
    });

    this.logger.log('Item added to cart', { userId, cartItemId: cartItem.id });
    return this.mapCartItem(cartItem);
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(userId: string, cartItemId: string, quantity: number) {
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        userId,
      },
      include: {
        products: true,
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    // Check stock availability from warehouse-microservice
    const product = cartItem.products;
    if (product) {
      await this.checkStockAvailability(product.id, product.catalogProductId, quantity);
    }

    const updated = await this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
      include: {
        products: true,
        product_variants: true,
      },
    });

    this.logger.log('Cart item quantity updated', { userId, cartItemId: updated.id });
    return this.mapCartItem(updated);
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(userId: string, cartItemId: string) {
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        userId,
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    this.logger.log('Item removed from cart', { userId, cartItemId });
    return { success: true };
  }

  /**
   * Clear user's cart
   */
  async clearCart(userId: string) {
    await this.prisma.cartItem.deleteMany({
      where: { userId },
    });

    this.logger.log('Cart cleared', { userId });
    return { success: true };
  }

  /**
   * Check stock availability from warehouse-microservice or local database
   */
  private async checkStockAvailability(productId: string, catalogProductId: string | null, quantity: number): Promise<void> {
    if (catalogProductId) {
      // Use central warehouse-microservice
      try {
        const totalAvailable = await this.warehouseClient.getTotalAvailable(catalogProductId);
        if (totalAvailable < quantity) {
          throw new BadRequestException(`Insufficient stock. Available: ${totalAvailable}, Requested: ${quantity}`);
        }
      } catch (error: any) {
        // If warehouse-microservice is unavailable, log warning but allow operation
        // This prevents service failures from breaking cart functionality
        if (error instanceof BadRequestException && error.message.includes('Insufficient stock')) {
          throw error;
        }
        this.logger.warn(
          `Failed to check stock from warehouse-microservice for product ${productId}: ${error.message}`,
          'CartService'
        );
        // Fallback to local stock check
        const product = await this.prisma.product.findUnique({
          where: { id: productId },
          select: { stockQuantity: true, trackInventory: true },
        });

        if (product?.trackInventory && (product.stockQuantity || 0) < quantity) {
          throw new BadRequestException(`Insufficient stock. Available: ${product.stockQuantity}, Requested: ${quantity}`);
        }
      }
    } else {
      // Fallback to local stock (legacy mode)
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { stockQuantity: true, trackInventory: true },
      });

      if (product?.trackInventory && (product.stockQuantity || 0) < quantity) {
        throw new BadRequestException(`Insufficient stock. Available: ${product.stockQuantity}, Requested: ${quantity}`);
      }
    }
  }

  /**
   * Helper to map cart item to response format
   */
  private mapCartItem(item: any) {
    return {
      id: item.id,
      productId: item.productId,
      products: {
        id: item.products.id,
        name: item.products.name,
        sku: item.products.sku,
        description: item.products.description,
        price: Number(item.products.price),
        stockQuantity: item.products.stockQuantity,
        brand: item.products.brand,
        mainImageUrl: item.products.mainImageUrl,
        imageUrls: item.products.imageUrls as string[] | undefined,
      },
      variantId: item.variantId || undefined,
      variant: (item as any).product_variants
        ? {
            id: (item as any).product_variants.id,
            productId: (item as any).product_variants.productId,
            name: (item as any).product_variants.name,
            sku: (item as any).product_variants.sku,
            price: Number((item as any).product_variants.price),
            stockQuantity: (item as any).product_variants.stockQuantity,
            attributes: (item as any).product_variants.options as Record<string, string> | undefined,
          }
        : undefined,
      quantity: item.quantity,
      price: Number(item.price),
    };
  }
}

