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
   * All stock is managed in warehouse-microservice
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

    if (!product.catalogProductId) {
      throw new BadRequestException('Product is not linked to catalog; stock is managed in warehouse-microservice');
    }

    // Fetch stock from warehouse-microservice
    const stockData = await this.warehouseClient.getStockByProduct(product.catalogProductId);
    const totalAvailable = await this.warehouseClient.getTotalAvailable(product.catalogProductId);

    // Variants use parent product's catalogProductId for stock
    // In warehouse-microservice, variants are typically managed as separate products or as part of the main product
    return {
      productId: product.id,
      productName: product.name,
      stockQuantity: totalAvailable,
      trackInventory: product.trackInventory,
      variants: (product.product_variants || []).map((v) => ({
        variantId: v.id,
        variantName: v.name,
        // Variants share the parent product's stock from warehouse-microservice
        stockQuantity: totalAvailable,
      })),
      warehouse: {
        stock: stockData,
        totalAvailable,
        source: 'warehouse-microservice',
      },
    };
  }

  /**
   * Update inventory
   * All stock updates go to warehouse-microservice
   */
  async updateInventory(productId: string, variantId: string | undefined, quantity: number) {
    // Get product first to check catalogProductId
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.catalogProductId) {
      throw new BadRequestException('Product is not linked to catalog; stock is managed in warehouse-microservice');
    }

    if (variantId) {
      // Variants use parent product's catalogProductId for stock management
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: variantId },
      });

      if (!variant || variant.productId !== productId) {
        throw new NotFoundException('Product variant not found');
      }

      // Variants share the parent product's stock in warehouse-microservice
      // Update the parent product's stock
      const warehouseId = await this.warehouseClient.getDefaultWarehouseId();
      if (!warehouseId) {
        throw new BadRequestException('No default warehouse available to update stock');
      }

      await this.warehouseClient.setStock(
        product.catalogProductId,
        warehouseId,
        quantity,
        `Stock updated from flipflop-service for variant ${variantId} (product ${productId})`
      );

      this.logger.log('Variant stock updated in warehouse-microservice', { variantId, productId, catalogProductId: product.catalogProductId, quantity });
      return { variantId, stockQuantity: quantity };
    } else {
      const warehouseId = await this.warehouseClient.getDefaultWarehouseId();
      if (!warehouseId) {
        throw new BadRequestException('No default warehouse available to update stock');
      }

      await this.warehouseClient.setStock(
        product.catalogProductId,
        warehouseId,
        quantity,
        `Stock updated from flipflop-service for product ${productId}`
      );

      this.logger.log('Stock updated in warehouse-microservice', { productId, catalogProductId: product.catalogProductId, quantity });
      return { productId, stockQuantity: quantity };
    }
  }

  /**
   * Reserve items for order
   * All stock reservations go to warehouse-microservice
   */
  async reserveItems(items: Array<{ productId: string; variantId?: string; quantity: number; orderId?: string }>) {
    const reservations = [];
    const warehouseId = await this.warehouseClient.getDefaultWarehouseId();

    if (!warehouseId || !items[0]?.orderId) {
      throw new BadRequestException('Missing warehouse or order reference for reservation');
    }

    for (const item of items) {
      // Get product to access catalogProductId
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product || !product.catalogProductId) {
        throw new BadRequestException(`Product ${item.productId} is not linked to catalog; stock is managed in warehouse-microservice`);
      }

      if (item.variantId) {
        // Variants use parent product's catalogProductId for stock management
        const variant = await this.prisma.productVariant.findUnique({
          where: { id: item.variantId },
        });

        if (!variant || variant.productId !== item.productId) {
          throw new NotFoundException(`Variant ${item.variantId} not found`);
        }

        // Reserve stock using parent product's catalogProductId
        await this.warehouseClient.reserveStock(
          product.catalogProductId,
          warehouseId,
          item.quantity,
          item.orderId!
        );

        this.logger.log('Variant stock reserved in warehouse-microservice', {
          variantId: item.variantId,
          productId: item.productId,
          catalogProductId: product.catalogProductId,
          quantity: item.quantity,
        });

        reservations.push({ variantId: item.variantId, quantity: item.quantity });
      } else {
        await this.warehouseClient.reserveStock(
          product.catalogProductId,
          warehouseId,
          item.quantity,
          item.orderId!
        );

        this.logger.log('Stock reserved in warehouse-microservice', {
          productId: item.productId,
          catalogProductId: product.catalogProductId,
          quantity: item.quantity,
        });

        reservations.push({ productId: item.productId, quantity: item.quantity });
      }
    }

    this.logger.log('Items reserved', { reservations });
    return { reservations };
  }

  /**
   * Release reserved items
   * All stock unreservations go to warehouse-microservice
   */
  async releaseItems(items: Array<{ productId: string; variantId?: string; quantity: number; orderId?: string }>) {
    const warehouseId = await this.warehouseClient.getDefaultWarehouseId();

    if (!warehouseId || !items[0]?.orderId) {
      throw new BadRequestException('Missing warehouse or order reference for unreservation');
    }

    for (const item of items) {
      // Get product to access catalogProductId
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product || !product.catalogProductId) {
        throw new BadRequestException(`Product ${item.productId} is not linked to catalog; stock is managed in warehouse-microservice`);
      }

      if (item.variantId) {
        // Variants use parent product's catalogProductId for stock management
        const variant = await this.prisma.productVariant.findUnique({
          where: { id: item.variantId },
        });

        if (!variant || variant.productId !== item.productId) {
          throw new NotFoundException(`Variant ${item.variantId} not found`);
        }

        // Unreserve stock using parent product's catalogProductId
        await this.warehouseClient.unreserveStock(
          product.catalogProductId,
          warehouseId,
          item.quantity,
          item.orderId!
        );

        this.logger.log('Variant stock unreserved in warehouse-microservice', {
          variantId: item.variantId,
          productId: item.productId,
          catalogProductId: product.catalogProductId,
          quantity: item.quantity,
        });
      } else {
        await this.warehouseClient.unreserveStock(
          product.catalogProductId,
          warehouseId,
          item.quantity,
          item.orderId!
        );

        this.logger.log('Stock unreserved in warehouse-microservice', {
          productId: item.productId,
          catalogProductId: product.catalogProductId,
          quantity: item.quantity,
        });
      }
    }

    this.logger.log('Items released', { items });
    return { success: true };
  }

  /**
   * Get all stock levels
   * All stock is fetched from warehouse-microservice
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

    // Fetch stock from warehouse-microservice for all products with catalogProductId
    const stockLevels = await Promise.all(
      products
        .filter((product) => product.catalogProductId) // Only products linked to catalog
        .map(async (product) => {
          const stockQuantity = await this.warehouseClient.getTotalAvailable(product.catalogProductId!);

          // Variants share the parent product's stock from warehouse-microservice
          const variantStockLevels = (product.product_variants || []).map((v) => ({
            variantId: v.id,
            variantName: v.name,
            sku: v.sku,
            stockQuantity, // Use parent product's stock
            source: 'warehouse-microservice',
          }));

          return {
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            stockQuantity,
            source: 'warehouse-microservice',
            variants: variantStockLevels,
          };
        })
    );

    return stockLevels;
  }
}

