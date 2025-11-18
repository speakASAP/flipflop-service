/**
 * Cart Service
 * Handles shopping cart operations
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@e-commerce/shared';
import { LoggerService } from '@e-commerce/shared';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
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
      // Update quantity
      const updated = await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
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
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
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

