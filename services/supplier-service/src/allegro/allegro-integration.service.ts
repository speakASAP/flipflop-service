/**
 * Allegro Integration Service
 * Fetches products and warehouse data from catalog-microservice and warehouse-microservice
 */

import { Injectable } from '@nestjs/common';
import { LoggerService, CatalogClientService, WarehouseClientService } from '@flipflop/shared';

@Injectable()
export class AllegroIntegrationService {
  private readonly logger: LoggerService;

  constructor(
    loggerService: LoggerService,
    private readonly catalogClient: CatalogClientService,
    private readonly warehouseClient: WarehouseClientService,
  ) {
    this.logger = loggerService;
    this.logger.setContext('AllegroIntegrationService');
    this.logger.log('AllegroIntegrationService initialized with catalog and warehouse clients');
  }

  /**
   * Get all products from catalog-microservice
   */
  async getAllegroProducts(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    active?: boolean;
  }) {
    try {
      const result = await this.catalogClient.searchProducts({
        search: filters?.search,
        isActive: filters?.active !== undefined ? filters.active : true,
        page: filters?.page || 1,
        limit: filters?.limit || 100,
      });

      this.logger.log('Fetched products from catalog-microservice', {
        count: result.items.length,
        total: result.total,
        page: result.page,
        limit: result.limit,
      });

      // Map catalog products to Allegro format for backward compatibility
      const mappedProducts = result.items.map((product) => ({
        id: product.id,
        code: product.sku,
        name: product.title,
        description: product.description,
        ean: product.ean,
        brand: product.brand,
        active: product.isActive,
        updated_at: product.updatedAt,
      }));

      return {
        items: mappedProducts,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit),
        },
      };
    } catch (error: any) {
      this.logger.error('Failed to fetch products from catalog-microservice', {
        error: error.message,
        errorStack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get product by code (SKU) from catalog-microservice
   */
  async getAllegroProductByCode(code: string) {
    try {
      const product = await this.catalogClient.getProductBySku(code);

      if (!product) {
        this.logger.warn('Product not found by SKU', { code });
        return null;
      }

      // Fetch stock from warehouse-microservice
      const totalAvailable = await this.warehouseClient.getTotalAvailable(product.id);

      // Map to Allegro format for backward compatibility
      const mappedProduct = {
        id: product.id,
        code: product.sku,
        name: product.title,
        description: product.description,
        ean: product.ean,
        brand: product.brand,
        active: product.isActive,
        stockQuantity: totalAvailable,
        updated_at: product.updatedAt,
      };

      this.logger.log('Fetched product from catalog-microservice', {
        code,
        name: mappedProduct.name,
        stockQuantity: totalAvailable,
      });

      return mappedProduct;
    } catch (error: any) {
      this.logger.error('Failed to fetch product from catalog-microservice', {
        code,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get warehouse data (stock quantities) for products
   */
  async getWarehouseData(productCodes?: string[]) {
    try {
      const warehouseData = [];

      if (productCodes && productCodes.length > 0) {
        // Fetch products by SKU and get their stock
        for (const code of productCodes) {
          try {
            const product = await this.catalogClient.getProductBySku(code);
            if (product) {
              const stock = await this.warehouseClient.getStockByProduct(product.id);
              const totalAvailable = stock.reduce((sum, s) => sum + (s.available || 0), 0);

              warehouseData.push({
                id: product.id,
                code: product.sku,
                name: product.title,
                stockQuantity: totalAvailable,
                trackInventory: true,
                availability: totalAvailable > 0 ? 'in_stock' : 'out_of_stock',
                updatedAt: product.updatedAt,
              });
            }
          } catch (error: any) {
            this.logger.warn(`Failed to fetch warehouse data for product ${code}`, {
              code,
              error: error.message,
            });
          }
        }
      } else {
        // Fetch all active products and their stock
        const products = await this.catalogClient.searchProducts({
          isActive: true,
          limit: 1000,
        });

        for (const product of products.items) {
          try {
            const stock = await this.warehouseClient.getStockByProduct(product.id);
            const totalAvailable = stock.reduce((sum, s) => sum + (s.available || 0), 0);

            warehouseData.push({
              id: product.id,
              code: product.sku,
              name: product.title,
              stockQuantity: totalAvailable,
              trackInventory: true,
              availability: totalAvailable > 0 ? 'in_stock' : 'out_of_stock',
              updatedAt: product.updatedAt,
            });
          } catch (error: any) {
            this.logger.warn(`Failed to fetch stock for product ${product.id}`, {
              productId: product.id,
              error: error.message,
            });
          }
        }
      }

      this.logger.log('Fetched warehouse data from warehouse-microservice', {
        count: warehouseData.length,
        hasFilter: !!productCodes,
      });

      return warehouseData;
    } catch (error: any) {
      this.logger.error('Failed to fetch warehouse data from warehouse-microservice', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Map catalog product to flipflop format
   * Works with both catalog-microservice products and legacy Allegro format
   */
  mapAllegroProductToFlipflop(product: any) {
    // Handle catalog-microservice product format
    if (product.sku) {
      return {
        name: product.title,
        sku: product.sku,
        description: product.description,
        shortDescription: product.description?.substring(0, 200),
        price: product.pricing?.basePrice || 0,
        compareAtPrice: product.pricing?.costPrice || null,
        mainImageUrl: product.media?.[0]?.url || null,
        imageUrls: product.media?.map((m: any) => m.url) || [],
        stockQuantity: product.stockQuantity || 0, // Will be enriched with warehouse data
        trackInventory: true,
        isActive: product.isActive !== false,
        brand: product.brand,
        manufacturer: product.manufacturer,
        attributes: {
          ean: product.ean,
          manufacturerCode: product.manufacturerCode,
          weight: product.weightKg,
          dimensions: product.dimensionsCm || {},
        },
        // Store catalog product ID for reference
        externalId: product.id,
        externalSource: 'catalog',
        catalogProductId: product.id,
      };
    }

    // Legacy Allegro format (backward compatibility)
    return {
      name: product.name,
      sku: product.code,
      description: product.description || product.shortDescription,
      shortDescription: product.shortDescription,
      price: product.sellingPrice
        ? Number(product.sellingPrice)
        : product.purchasePriceGrossPrice
          ? Number(product.purchasePriceGrossPrice)
          : 0,
      compareAtPrice: product.purchasePriceGrossPrice
        ? Number(product.purchasePriceGrossPrice)
        : null,
      mainImageUrl: product.mainImageUrl,
      imageUrls: product.imageUrls || product.galleryImages,
      stockQuantity: product.stockQuantity || 0,
      trackInventory: product.trackInventory !== false,
      isActive: product.active !== false,
      brand: product.brand,
      manufacturer: product.manufacturer,
      attributes: {
        ean: product.ean,
        manufacturerCode: product.manufacturerCode,
        supplier: product.supplier,
        weight: product.weight,
        dimensions: {
          height: product.height,
          width: product.width,
          depth: product.depth,
          length: product.length,
        },
        ...(product.attributes || {}),
      },
      externalId: product.id,
      externalSource: 'allegro',
    };
  }

  /**
   * Sync products from catalog-microservice to flipflop format
   * This method fetches products from catalog-microservice and enriches with stock from warehouse-microservice
   * The actual creation/update should be done via Product Service API
   */
  async syncProductsToflipflop(productCodes?: string[], syncAll?: boolean) {
    try {
      let catalogProducts: any[] = [];

      if (syncAll) {
        // Fetch all active products from catalog-microservice
        const result = await this.getAllegroProducts({
          active: true,
          limit: 1000,
        });
        catalogProducts = result.items;
      } else if (productCodes && productCodes.length > 0) {
        // Fetch specific products by code (SKU)
        const products = await Promise.all(
          productCodes.map((code) => this.getAllegroProductByCode(code)),
        );
        catalogProducts = products.filter((p) => p !== null);
      } else {
        throw new Error('Either productCodes or syncAll must be provided');
      }

      // Enrich products with stock from warehouse-microservice
      const enrichedProducts = await Promise.all(
        catalogProducts.map(async (product) => {
          try {
            // Get full product details from catalog
            const fullProduct = await this.catalogClient.getProductById(product.id);
            // Get stock from warehouse
            const totalAvailable = await this.warehouseClient.getTotalAvailable(product.id);
            
            return {
              ...fullProduct,
              stockQuantity: totalAvailable,
            };
          } catch (error: any) {
            this.logger.warn(`Failed to enrich product ${product.id} with stock`, {
              productId: product.id,
              error: error.message,
            });
            return {
              ...product,
              stockQuantity: 0,
            };
          }
        })
      );

      // Map to flipflop format
      const mappedProducts = enrichedProducts.map((product) =>
        this.mapAllegroProductToFlipflop(product),
      );

      this.logger.log('Products synced from catalog-microservice', {
        count: mappedProducts.length,
        syncAll,
        productCodesCount: productCodes?.length || 0,
      });

      return {
        total: mappedProducts.length,
        products: mappedProducts,
        message: `Successfully fetched ${mappedProducts.length} products from catalog-microservice. Use Product Service API to create/update them.`,
      };
    } catch (error: any) {
      this.logger.error('Failed to sync products from catalog-microservice', {
        error: error.message,
        errorStack: error.stack,
      });
      throw error;
    }
  }
}

