/**
 * Allegro Integration Service
 * Fetches products and warehouse data from Allegro application database
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResult } from 'pg';
import { LoggerService } from '@flipflop/shared';

@Injectable()
export class AllegroIntegrationService implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;
  private readonly logger: LoggerService;

  constructor(
    private readonly configService: ConfigService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService;
    this.logger.setContext('AllegroIntegrationService');

    // Create PostgreSQL connection pool for Allegro database
    const dbHost = this.configService.get('DB_HOST') || 'localhost';
    const dbPort = Number(this.configService.get('DB_PORT')) || 5432;
    const dbUser = this.configService.get('DB_USER') || 'dbadmin';
    const dbPassword = this.configService.get('DB_PASSWORD') || '';
    const allegroDbName = this.configService.get('ALLEGRO_DB_NAME') || 'allegro';

    this.pool = new Pool({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: allegroDbName,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    this.logger.log('Allegro database pool initialized', {
      dbHost,
      dbName: allegroDbName,
    });
  }

  async onModuleInit() {
    // Don't test connection on init - connect lazily on first use
    // This allows the service to start even if database is temporarily unavailable
    this.logger.log('Allegro database pool configured (lazy connection)');
  }

  /**
   * Ensure database connection is ready
   */
  private async ensureConnection() {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error: any) {
      this.logger.error('Failed to connect to Allegro database', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log('Allegro database connection pool closed');
  }

  /**
   * Get all products from Allegro database with warehouse data
   */
  async getAllegroProducts(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    active?: boolean;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 100;
    const skip = (page - 1) * limit;

    try {
      await this.ensureConnection();

      // Build WHERE clause for raw SQL
      let whereClause = "WHERE active = true";
      const params: any[] = [];
      let paramIndex = 1;

      if (filters?.active !== undefined) {
        whereClause += ` AND active = $${paramIndex}`;
        params.push(filters.active);
        paramIndex++;
      }

      if (filters?.search) {
        const searchParam = `%${filters.search}%`;
        whereClause += ` AND (
          name ILIKE $${paramIndex} OR 
          code ILIKE $${paramIndex} OR 
          ean ILIKE $${paramIndex} OR 
          brand ILIKE $${paramIndex}
        )`;
        params.push(searchParam);
        paramIndex++;
      }

      // Get total count
      const countResult = await this.pool.query<{ count: number }>(
        `SELECT COUNT(*)::int as count FROM products ${whereClause}`,
        params,
      );
      const total = Number(countResult.rows[0]?.count || 0);

      // Get products
      const productsResult = await this.pool.query(
        `SELECT * FROM products ${whereClause} ORDER BY updated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, skip],
      );
      const products = productsResult.rows;

      this.logger.log('Fetched products from Allegro database', {
        count: products.length,
        total,
        page,
        limit,
      });

      return {
        items: products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error: any) {
      this.logger.error('Failed to fetch products from Allegro database', {
        error: error.message,
        errorStack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get product by code from Allegro database
   */
  async getAllegroProductByCode(code: string) {
    try {
      await this.ensureConnection();
      const result = await this.pool.query(
        `SELECT * FROM products WHERE code = $1 LIMIT 1`,
        [code],
      );
      const product = result.rows[0] || null;

      if (!product) {
        return null;
      }

      this.logger.log('Fetched product from Allegro database', {
        code,
        name: product.name,
        stockQuantity: product.stockQuantity,
      });

      return product;
    } catch (error: any) {
      this.logger.error('Failed to fetch product from Allegro database', {
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
      await this.ensureConnection();
      let whereClause = "WHERE active = true AND track_inventory = true";
      const params: any[] = [];
      let paramIndex = 1;

      if (productCodes && productCodes.length > 0) {
        whereClause += ` AND code = ANY($${paramIndex})`;
        params.push(productCodes);
        paramIndex++;
      }

      const result = await this.pool.query(
        `SELECT 
          id, code, name, stock_quantity as "stockQuantity", 
          track_inventory as "trackInventory", availability, 
          minimum_required_stock_quantity as "minimumRequiredStockQuantity", 
          updated_at as "updatedAt"
        FROM products ${whereClause} ORDER BY code ASC`,
        params,
      );
      const products = result.rows;

      this.logger.log('Fetched warehouse data from Allegro database', {
        count: products.length,
        hasFilter: !!productCodes,
      });

      return products;
    } catch (error: any) {
      this.logger.error('Failed to fetch warehouse data from Allegro database', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Sync product from Allegro to flipflop format
   */
  mapAllegroProductToFlipflop(allegroProduct: any) {
    return {
      name: allegroProduct.name,
      sku: allegroProduct.code,
      description: allegroProduct.description || allegroProduct.shortDescription,
      shortDescription: allegroProduct.shortDescription,
      price: allegroProduct.sellingPrice
        ? Number(allegroProduct.sellingPrice)
        : allegroProduct.purchasePriceGrossPrice
          ? Number(allegroProduct.purchasePriceGrossPrice)
          : 0,
      compareAtPrice: allegroProduct.purchasePriceGrossPrice
        ? Number(allegroProduct.purchasePriceGrossPrice)
        : null,
      mainImageUrl: allegroProduct.mainImageUrl,
      imageUrls: allegroProduct.imageUrls || allegroProduct.galleryImages,
      stockQuantity: allegroProduct.stockQuantity || 0,
      trackInventory: allegroProduct.trackInventory !== false,
      isActive: allegroProduct.active !== false,
      brand: allegroProduct.brand,
      manufacturer: allegroProduct.manufacturer,
      attributes: {
        ean: allegroProduct.ean,
        manufacturerCode: allegroProduct.manufacturerCode,
        supplier: allegroProduct.supplier,
        weight: allegroProduct.weight,
        dimensions: {
          height: allegroProduct.height,
          width: allegroProduct.width,
          depth: allegroProduct.depth,
          length: allegroProduct.length,
        },
        ...(allegroProduct.attributes || {}),
      },
      // Store Allegro product ID for reference
      externalId: allegroProduct.id,
      externalSource: 'allegro',
    };
  }

  /**
   * Sync products from Allegro to flipflop database
   * This method fetches products from Allegro and returns them in flipflop format
   * The actual creation/update should be done via Product Service API
   */
  async syncProductsToflipflop(productCodes?: string[], syncAll?: boolean) {
    try {
      let allegroProducts: any[] = [];

      if (syncAll) {
        // Fetch all active products
        const result = await this.getAllegroProducts({
          active: true,
          limit: 1000,
        });
        allegroProducts = result.items;
      } else if (productCodes && productCodes.length > 0) {
        // Fetch specific products by code
        const products = await Promise.all(
          productCodes.map((code) => this.getAllegroProductByCode(code)),
        );
        allegroProducts = products.filter((p) => p !== null);
      } else {
        throw new Error('Either productCodes or syncAll must be provided');
      }

      // Map to flipflop format
      const mappedProducts = allegroProducts.map((product) =>
        this.mapAllegroProductToFlipflop(product),
      );

      this.logger.log('Products synced from Allegro', {
        count: mappedProducts.length,
        syncAll,
        productCodesCount: productCodes?.length || 0,
      });

      return {
        total: mappedProducts.length,
        products: mappedProducts,
        message: `Successfully fetched ${mappedProducts.length} products from Allegro. Use Product Service API to create/update them.`,
      };
    } catch (error: any) {
      this.logger.error('Failed to sync products from Allegro', {
        error: error.message,
        errorStack: error.stack,
      });
      throw error;
    }
  }
}

