/**
 * Migration Script: flipflop-service -> catalog-microservice + warehouse-microservice
 *
 * - Upserts products/variants into catalog-microservice
 * - Syncs stock into warehouse-microservice (default warehouse)
 * - Writes mapping JSON for downstream linking (catalogProductId per SKU)
 *
 * Usage:
 *   ts-node scripts/migrate-products-to-catalog.ts
 *   ts-node scripts/migrate-products-to-catalog.ts --dry-run
 *   ts-node scripts/migrate-products-to-catalog.ts --skip-stock
 *   ts-node scripts/migrate-products-to-catalog.ts --mapping-output tmp/migration/flipflop-catalog-mapping.json
 */

import { PrismaClient } from '@prisma/client';
import axios, { AxiosInstance } from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

interface MigrationStats {
  products: number;
  variants: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  stockSynced: number;
  stockSkipped: number;
  errorDetails: Array<{ id: string; sku: string; error: string }>;
}

interface MappingRecord {
  source: 'Product' | 'Variant';
  legacyId: string;
  parentId?: string;
  sku: string;
  catalogProductId: string;
  stockQuantity: number;
}

class FlipflopMigrationService {
  private prisma: PrismaClient;
  private catalogClient: AxiosInstance;
  private warehouseClient: AxiosInstance;
  private stats: MigrationStats;
  private dryRun: boolean;
  private skipStock: boolean;
  private defaultWarehouseId: string | null = null;
  private mappingPath: string;
  private mappings: MappingRecord[] = [];

  constructor(dryRun: boolean = false, skipStock: boolean = false, mappingPath?: string) {
    this.dryRun = dryRun;
    this.skipStock = skipStock;
    this.mappingPath = mappingPath || path.resolve(process.cwd(), 'tmp/migration/flipflop-catalog-mapping.json');

    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    const catalogUrl = process.env.CATALOG_SERVICE_URL || 'http://catalog-microservice:3200';
    this.catalogClient = axios.create({
      baseURL: catalogUrl,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    const warehouseUrl = process.env.WAREHOUSE_SERVICE_URL || 'http://warehouse-microservice:3201';
    this.warehouseClient = axios.create({
      baseURL: warehouseUrl,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.stats = {
      products: 0,
      variants: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      stockSynced: 0,
      stockSkipped: 0,
      errorDetails: [],
    };
  }

  private normalizeSku(value?: string | null): string | null {
    if (!value) return null;
    const normalized = value.trim().toUpperCase();
    return normalized.length > 0 ? normalized : null;
  }

  private async findProductInCatalog(sku: string): Promise<any | null> {
    try {
      const response = await this.catalogClient.get(`/api/products/sku/${sku}`);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch {
      // not found, continue
    }
    return null;
  }

  private mapToCatalog(product: any, variant?: any): any {
    const sku = variant ? variant.sku : product.sku;
    const title = variant?.name ? `${product.name} - ${variant.name}` : product.name;
    const payload: any = {
      sku,
      title: title || 'Product',
      description: product.description || product.shortDescription || null,
      brand: product.brand || null,
      manufacturer: product.manufacturer || null,
      isActive: product.isActive !== false && (variant ? variant.isActive !== false : true),
    };

    if (product.seoTitle || product.seoDescription || product.seoKeywords) {
      payload.seoData = {
        metaTitle: product.seoTitle || null,
        metaDescription: product.seoDescription || null,
        keywords: product.seoKeywords ? product.seoKeywords.split(',').map((k: string) => k.trim()) : [],
      };
    }

    return payload;
  }

  private async createOrUpdateProduct(payload: any, existing?: any): Promise<any> {
    if (this.dryRun) {
      return { id: existing?.id || `mock-${Date.now()}`, ...payload };
    }

    try {
      if (existing) {
        const response = await this.catalogClient.put(`/api/products/${existing.id}`, payload);
        return response.data?.data;
      }
      const response = await this.catalogClient.post('/api/products', payload);
      return response.data?.data;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Unknown error';
      throw new Error(message);
    }
  }

  private async resolveDefaultWarehouseId(): Promise<void> {
    if (this.skipStock) {
      return;
    }

    if (process.env.DEFAULT_WAREHOUSE_ID) {
      this.defaultWarehouseId = process.env.DEFAULT_WAREHOUSE_ID;
      return;
    }

    try {
      const response = await this.warehouseClient.get('/api/warehouses');
      const warehouses = response.data?.data || [];
      if (warehouses.length > 0) {
        this.defaultWarehouseId = warehouses[0].id;
        return;
      }
      console.warn('⚠️  No active warehouses found; stock sync will be skipped.');
    } catch (error: any) {
      console.warn(`⚠️  Failed to resolve default warehouse: ${error?.message || error}`);
    }

    this.defaultWarehouseId = null;
  }

  private async syncStock(catalogProductId: string, quantity: number, sku: string, source: string): Promise<void> {
    if (this.dryRun || this.skipStock) {
      this.stats.stockSkipped++;
      return;
    }

    if (!this.defaultWarehouseId) {
      this.stats.stockSkipped++;
      return;
    }

    try {
      await this.warehouseClient.post('/api/stock/set', {
        productId: catalogProductId,
        warehouseId: this.defaultWarehouseId,
        quantity: Number.isFinite(quantity) ? quantity : 0,
        reason: `Initial migration from ${source}`,
      });
      this.stats.stockSynced++;
      console.log(`   ↳ Stock synced (${quantity}) for ${sku}`);
    } catch (error: any) {
      this.stats.stockSkipped++;
      console.warn(`⚠️  Failed to sync stock for ${sku}: ${error?.message || error}`);
    }
  }

  private recordMapping(record: MappingRecord): void {
    this.mappings.push(record);
  }

  private saveMappings(): void {
    if (this.dryRun) {
      console.log(`\nℹ️  Dry-run: mapping not written (target: ${this.mappingPath})`);
      return;
    }

    fs.mkdirSync(path.dirname(this.mappingPath), { recursive: true });
    const payload = {
      generatedAt: new Date().toISOString(),
      defaultWarehouseId: this.defaultWarehouseId,
      total: this.mappings.length,
      items: this.mappings,
    };
    fs.writeFileSync(this.mappingPath, JSON.stringify(payload, null, 2), 'utf-8');
    console.log(`\n✅ Mapping saved to ${this.mappingPath}`);
  }

  private async migrateVariant(product: any, variant: any): Promise<void> {
    const sku = this.normalizeSku(variant.sku);
    if (!sku) {
      this.stats.skipped++;
      return;
    }

    try {
      const existing = await this.findProductInCatalog(sku);
      const payload = this.mapToCatalog(product, variant);
      const catalogProduct = await this.createOrUpdateProduct(payload, existing);
      const quantity = variant.stockQuantity ?? 0;

      await this.syncStock(catalogProduct.id, quantity, sku, 'flipflop Variant');

      if (existing) {
        this.stats.updated++;
      } else {
        this.stats.created++;
      }

      this.recordMapping({
        source: 'Variant',
        legacyId: variant.id,
        parentId: product.id,
        sku,
        catalogProductId: catalogProduct.id,
        stockQuantity: quantity,
      });
    } catch (error: any) {
      this.stats.errors++;
      this.stats.errorDetails.push({
        id: variant.id,
        sku: variant.sku || 'N/A',
        error: error?.message || String(error),
      });
      console.error(`❌ Error migrating variant ${variant.sku}: ${error?.message || error}`);
    }
  }

  private async migrateBaseProduct(product: any): Promise<void> {
    const sku = this.normalizeSku(product.sku);
    if (!sku) {
      this.stats.skipped++;
      return;
    }

    try {
      const existing = await this.findProductInCatalog(sku);
      const payload = this.mapToCatalog(product);
      const catalogProduct = await this.createOrUpdateProduct(payload, existing);
      const quantity = product.trackInventory ? product.stockQuantity ?? 0 : 0;

      await this.syncStock(catalogProduct.id, quantity, sku, 'flipflop Product');

      if (existing) {
        this.stats.updated++;
      } else {
        this.stats.created++;
      }

      this.recordMapping({
        source: 'Product',
        legacyId: product.id,
        sku,
        catalogProductId: catalogProduct.id,
        stockQuantity: quantity,
      });
    } catch (error: any) {
      this.stats.errors++;
      this.stats.errorDetails.push({
        id: product.id,
        sku: product.sku || 'N/A',
        error: error?.message || String(error),
      });
      console.error(`❌ Error migrating product ${product.sku}: ${error?.message || error}`);
    }
  }

  private printStats(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Statistics');
    console.log('='.repeat(60));
    console.log(`Products processed: ${this.stats.products}`);
    console.log(`Variants processed: ${this.stats.variants}`);
    console.log(`✅ Created: ${this.stats.created}`);
    console.log(`🔄 Updated: ${this.stats.updated}`);
    console.log(`⏭️  Skipped: ${this.stats.skipped}`);
    console.log(`❌ Errors: ${this.stats.errors}`);
    console.log(`📦 Stock synced: ${this.stats.stockSynced}`);
    console.log(`📦 Stock skipped: ${this.stats.stockSkipped}`);
    console.log('='.repeat(60));

    if (this.stats.errorDetails.length > 0) {
      console.log('\n❌ Error Details:');
      this.stats.errorDetails.forEach((error, index) => {
        console.log(`${index + 1}. ID: ${error.id}, SKU: ${error.sku}`);
        console.log(`   Error: ${error.error}\n`);
      });
    }
  }

  async run(): Promise<void> {
    try {
      console.log(
        `${this.dryRun ? '🔍 DRY-RUN MODE (no changes will be made)' : '🚀 LIVE MODE'} - Starting flipflop product migration...\n`,
      );
      console.log(`Catalog Service URL: ${process.env.CATALOG_SERVICE_URL || 'http://catalog-microservice:3200'}`);
      console.log(`Warehouse Service URL: ${process.env.WAREHOUSE_SERVICE_URL || 'http://warehouse-microservice:3201'}\n`);

      await this.resolveDefaultWarehouseId();

      const products = await this.prisma.product.findMany({
        include: { product_variants: true },
        orderBy: { createdAt: 'asc' },
      });

      this.stats.products = products.length;

      for (const product of products) {
        if (product.product_variants && product.product_variants.length > 0) {
          this.stats.variants += product.product_variants.length;
          for (const variant of product.product_variants) {
            await this.migrateVariant(product, variant);
          }
        } else {
          await this.migrateBaseProduct(product);
        }
      }

      this.printStats();
      this.saveMappings();
      console.log('\n✅ Migration completed!');
    } finally {
      await this.prisma.$disconnect();
    }
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const skipStock = args.includes('--skip-stock');

  let mappingPath: string | undefined;
  const mappingArgIndex = args.findIndex((arg) => arg === '--mapping-output' || arg === '-m');
  const inlineMappingArg = args.find((arg) => arg.startsWith('--mapping-output='));

  if (inlineMappingArg) {
    mappingPath = inlineMappingArg.split('=')[1];
  } else if (mappingArgIndex !== -1 && args[mappingArgIndex + 1]) {
    mappingPath = args[mappingArgIndex + 1];
  }

  if (dryRun) {
    console.log('🔍 Running in DRY-RUN mode - no changes will be made\n');
  }

  if (skipStock) {
    console.log('ℹ️  Stock sync disabled via --skip-stock');
  }

  const migration = new FlipflopMigrationService(dryRun, skipStock, mappingPath);
  migration
    .run()
    .then(() => {
      if (dryRun) {
        console.log('\n✅ Dry-run completed successfully - no changes were made');
      } else {
        console.log('\n✅ Migration script finished successfully');
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:', error);
      process.exit(1);
    });
}

export { FlipflopMigrationService };

