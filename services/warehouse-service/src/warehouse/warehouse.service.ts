/**
 * Warehouse Service
 * Handles inventory management
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService, LoggerService, WarehouseClientService, CatalogClientService } from '@flipflop/shared';

@Injectable()
export class WarehouseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly warehouseClient: WarehouseClientService,
    private readonly catalogClient: CatalogClientService,
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

    // If product has catalogProductId, fetch from warehouse-microservice
    if (product.catalogProductId) {
      try {
        const stockData = await this.warehouseClient.getStockByProduct(product.catalogProductId);
        const totalAvailable = await this.warehouseClient.getTotalAvailable(product.catalogProductId);

        return {
          productId: product.id,
          productName: product.name,
          stockQuantity: totalAvailable,
          trackInventory: product.trackInventory,
          variants: (product.product_variants || []).map((v) => ({
            variantId: v.id,
            variantName: v.name,
            stockQuantity: v.stockQuantity, // Variants still use local stock
          })),
          warehouse: {
            stock: stockData,
            totalAvailable,
            source: 'warehouse-microservice',
          },
        };
      } catch (error: any) {
        this.logger.warn(`Failed to fetch stock from warehouse-microservice: ${error.message}`, 'WarehouseService');
        // Fallback to local data
      }
    }

    // Fallback to local data (legacy mode or if warehouse-microservice unavailable)
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
      // Variants still use local stock management
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

      // If product has catalogProductId, update in warehouse-microservice
      if (product.catalogProductId) {
        try {
          const warehouseId = await this.warehouseClient.getDefaultWarehouseId();
          if (warehouseId) {
            await this.warehouseClient.setStock(
              product.catalogProductId,
              warehouseId,
              quantity,
              `Stock updated from flipflop-service for product ${productId}`
            );
            this.logger.log('Stock updated in warehouse-microservice', { productId, catalogProductId: product.catalogProductId, quantity });
          } else {
            this.logger.warn('No default warehouse ID found, updating local stock only', 'WarehouseService');
          }
        } catch (error: any) {
          this.logger.error(`Failed to update stock in warehouse-microservice: ${error.message}`, error.stack, 'WarehouseService');
          // Continue with local update
        }
      } else {
        this.logger.warn(`Product ${productId} has no catalogProductId, updating local stock only`, 'WarehouseService');
      }

      // Update local Product table for cache/display
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
  async reserveItems(items: Array<{ productId: string; variantId?: string; quantity: number; orderId?: string }>) {
    const reservations = [];
    const warehouseId = await this.warehouseClient.getDefaultWarehouseId();

    for (const item of items) {
      if (item.variantId) {
        // Variants still use local stock management
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

        // If product has catalogProductId, reserve in warehouse-microservice
        if (product.catalogProductId && warehouseId && item.orderId) {
          try {
            await this.warehouseClient.reserveStock(
              product.catalogProductId,
              warehouseId,
              item.quantity,
              item.orderId
            );
            this.logger.log('Stock reserved in warehouse-microservice', {
              productId: item.productId,
              catalogProductId: product.catalogProductId,
              quantity: item.quantity,
            });
          } catch (error: any) {
            this.logger.error(`Failed to reserve stock in warehouse-microservice: ${error.message}`, error.stack, 'WarehouseService');
            // Check local stock as fallback
            if (product.stockQuantity < item.quantity) {
              throw new BadRequestException(`Insufficient stock for product ${item.productId}`);
            }
          }
        } else {
          // Fallback to local stock check
          if (product.stockQuantity < item.quantity) {
            throw new BadRequestException(`Insufficient stock for product ${item.productId}`);
          }
        }

        // Update local Product table for cache/display
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
  async releaseItems(items: Array<{ productId: string; variantId?: string; quantity: number; orderId?: string }>) {
    const warehouseId = await this.warehouseClient.getDefaultWarehouseId();

    for (const item of items) {
      if (item.variantId) {
        // Variants still use local stock management
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
          // If product has catalogProductId, unreserve in warehouse-microservice
          if (product.catalogProductId && warehouseId && item.orderId) {
            try {
              await this.warehouseClient.unreserveStock(
                product.catalogProductId,
                warehouseId,
                item.quantity,
                item.orderId
              );
              this.logger.log('Stock unreserved in warehouse-microservice', {
                productId: item.productId,
                catalogProductId: product.catalogProductId,
                quantity: item.quantity,
              });
            } catch (error: any) {
              this.logger.error(`Failed to unreserve stock in warehouse-microservice: ${error.message}`, error.stack, 'WarehouseService');
              // Continue with local update
            }
          }

          // Update local Product table for cache/display
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

