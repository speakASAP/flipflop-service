/**
 * Warehouse Service
 * Handles inventory management
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@e-commerce/shared';
import { LoggerService } from '@e-commerce/shared';

@Injectable()
export class WarehouseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Get product inventory
   */
  async getInventory(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        product_variants: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return {
      productId: product.id,
      productName: product.name,
      stockQuantity: product.stockQuantity,
      trackInventory: product.trackInventory,
      variants: (product.product_variants || []).map((v) => ({
        variantId: v.id,
        variantName: v.name,
        stockQuantity: v.stockQuantity,
      })),
    };
  }

  /**
   * Update inventory
   */
  async updateInventory(productId: string, variantId: string | undefined, quantity: number) {
    if (variantId) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: variantId },
      });

      if (!variant || variant.productId !== productId) {
        throw new NotFoundException('Product variant not found');
      }

      const updated = await this.prisma.productVariant.update({
        where: { id: variantId },
        data: { stockQuantity: quantity },
      });

      this.logger.log('Variant inventory updated', { variantId, quantity });
      return { variantId: updated.id, stockQuantity: updated.stockQuantity };
    } else {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const updated = await this.prisma.product.update({
        where: { id: productId },
        data: { stockQuantity: quantity },
      });

      this.logger.log('Product inventory updated', { productId, quantity });
      return { productId: updated.id, stockQuantity: updated.stockQuantity };
    }
  }

  /**
   * Reserve items for order
   */
  async reserveItems(items: Array<{ productId: string; variantId?: string; quantity: number }>) {
    const reservations = [];

    for (const item of items) {
      if (item.variantId) {
        const variant = await this.prisma.productVariant.findUnique({
          where: { id: item.variantId },
        });

        if (!variant) {
          throw new NotFoundException(`Variant ${item.variantId} not found`);
        }

        if (variant.stockQuantity < item.quantity) {
          throw new BadRequestException(`Insufficient stock for variant ${item.variantId}`);
        }

        await this.prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: variant.stockQuantity - item.quantity },
        });

        reservations.push({ variantId: item.variantId, quantity: item.quantity });
      } else {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(`Product ${item.productId} not found`);
        }

        if (product.stockQuantity < item.quantity) {
          throw new BadRequestException(`Insufficient stock for product ${item.productId}`);
        }

        await this.prisma.product.update({
          where: { id: item.productId },
          data: { stockQuantity: product.stockQuantity - item.quantity },
        });

        reservations.push({ productId: item.productId, quantity: item.quantity });
      }
    }

    this.logger.log('Items reserved', { reservations });
    return { reservations };
  }

  /**
   * Release reserved items
   */
  async releaseItems(items: Array<{ productId: string; variantId?: string; quantity: number }>) {
    for (const item of items) {
      if (item.variantId) {
        const variant = await this.prisma.productVariant.findUnique({
          where: { id: item.variantId },
        });

        if (variant) {
          await this.prisma.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: variant.stockQuantity + item.quantity },
          });
        }
      } else {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (product) {
          await this.prisma.product.update({
            where: { id: item.productId },
            data: { stockQuantity: product.stockQuantity + item.quantity },
          });
        }
      }
    }

    this.logger.log('Items released', { items });
    return { success: true };
  }

  /**
   * Get all stock levels
   */
  async getStockLevels() {
    const products = await this.prisma.product.findMany({
      where: { trackInventory: true },
      include: {
          product_variants: {
          where: { isActive: true },
        },
      },
    });

    return products.map((product) => ({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      stockQuantity: product.stockQuantity,
      variants: (product.product_variants || []).map((v) => ({
        variantId: v.id,
        variantName: v.name,
        sku: v.sku,
        stockQuantity: v.stockQuantity,
      })),
    }));
  }
}

