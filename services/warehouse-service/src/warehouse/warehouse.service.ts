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

      if (!product || !product.catalogProductId) {
        throw new BadRequestException('Product is not linked to catalog; cannot update central stock');
      }

      const warehouseId = await this.warehouseClient.getDefaultWarehouseId();
      if (!warehouseId) {
        throw new BadRequestException('No default warehouse available to update stock');
      }

      try {
        await this.warehouseClient.setStock(
          product.catalogProductId,
          warehouseId,
          quantity,
          `Stock updated from flipflop-service for product ${productId}`
        );
        this.logger.log('Stock updated in warehouse-microservice', { productId, catalogProductId: product.catalogProductId, quantity });
      } catch (error: any) {
        this.logger.error(`Failed to update stock in warehouse-microservice: ${error.message}`, error.stack, 'WarehouseService');
        throw new BadRequestException('Failed to update stock in central warehouse');
      }

      return { productId, stockQuantity: quantity };
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

        if (!product || !product.catalogProductId) {
          throw new BadRequestException(`Product ${item.productId} is not linked to catalog for reservation`);
        }

        if (!warehouseId || !item.orderId) {
          throw new BadRequestException('Missing warehouse or order reference for reservation');
        }

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
          throw new BadRequestException(`Insufficient stock for product ${item.productId}`);
        }

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

        if (!product || !product.catalogProductId) {
          throw new BadRequestException(`Product ${item.productId} is not linked to catalog for unreservation`);
        }

        if (!warehouseId || !item.orderId) {
          throw new BadRequestException('Missing warehouse or order reference for unreservation');
        }

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
          throw new BadRequestException(`Failed to unreserve stock for product ${item.productId}`);
        }
      }
    }

    this.logger.log('Items released', { items });
    return { success: true };
  }

  /**
   * Get all stock levels
   * Uses warehouse-microservice for products with catalogProductId
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

    // Fetch stock from warehouse-microservice for products with catalogProductId
    const stockLevels = await Promise.all(
      products.map(async (product) => {
        let stockQuantity = product.stockQuantity;
        let source = 'local';

        if (product.catalogProductId) {
          try {
            stockQuantity = await this.warehouseClient.getTotalAvailable(product.catalogProductId);
            source = 'warehouse-microservice';
          } catch (error: any) {
            this.logger.warn(`Failed to fetch stock for product ${product.id}: ${error.message}`, 'WarehouseService');
            // Keep local stockQuantity as fallback
          }
        }

        return {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          stockQuantity,
          source,
          variants: (product.product_variants || []).map((v) => ({
            variantId: v.id,
            variantName: v.name,
            sku: v.sku,
            stockQuantity: v.stockQuantity,
            source: 'local', // Variants still use local stock
          })),
        };
      })
    );

    return stockLevels;
  }
}

