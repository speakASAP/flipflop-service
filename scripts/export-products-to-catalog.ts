/**
 * Export flipflop-service legacy products/variants into normalized payloads
 * ready for catalog/warehouse migration (Agent M1 scope).
 *
 * Usage:
 *   ts-node scripts/export-products-to-catalog.ts --output ./tmp/migration/flipflop-products.json
 *   ts-node scripts/export-products-to-catalog.ts --no-variants
 */

import { PrismaClient, Product, ProductVariant } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Logger } = require('../utils/logger');

interface NormalizedRecord {
  source: 'flipflop-product' | 'flipflop-variant';
  legacyId: string;
  sku: string | null;
  ean: string | null;
  name: string | null;
  stockQuantity: number;
  price: number | null;
  currency: string | null;
  updatedAt?: string | null;
  needsManualReview: boolean;
  notes: string[];
  catalogProductId?: string | null;
  catalogPayload: any;
}

class FlipflopExportService {
  private prisma = new PrismaClient();
  private logger = new Logger({ serviceName: 'flipflop-export' });
  private outputPath: string;
  private includeVariants: boolean;
  private currency: string;

  constructor(outputPath: string, includeVariants: boolean) {
    this.outputPath = outputPath;
    this.includeVariants = includeVariants;
    this.currency = process.env.DEFAULT_CURRENCY || 'CZK';
  }

  private normalizeSku(value?: string | null): string | null {
    if (!value) return null;
    const normalized = value.trim().toUpperCase();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeEan(value?: string | null): string | null {
    if (!value) return null;
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length < 8 || digitsOnly.length > 14) {
      return null;
    }
    return digitsOnly;
  }

  private dedupe(records: NormalizedRecord[]): NormalizedRecord[] {
    const map = new Map<string, NormalizedRecord>();

    for (const record of records) {
      const key = record.sku || record.ean;
      if (!key) {
        map.set(`__missing__${record.legacyId}`, record);
        continue;
      }

      const existing = map.get(key);
      if (!existing) {
        map.set(key, record);
        continue;
      }

      const existingUpdated = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      const currentUpdated = record.updatedAt ? new Date(record.updatedAt).getTime() : 0;
      const chooseCurrent =
        record.stockQuantity > existing.stockQuantity ||
        (record.stockQuantity === existing.stockQuantity && currentUpdated > existingUpdated);

      if (chooseCurrent) {
        map.set(key, record);
      }
    }

    return Array.from(map.values());
  }

  private mapProductToCatalog(product: Product) {
    return {
      sku: product.sku,
      title: product.name,
      description: product.description || product.shortDescription || null,
      ean: null,
      brand: product.brand || null,
      manufacturer: product.manufacturer || null,
      isActive: product.isActive,
      pricing: {
        basePrice: Number(product.price),
        currency: this.currency,
      },
      media: {
        mainImageUrl: product.mainImageUrl,
        imageUrls: product.imageUrls || [],
        videoUrls: product.videoUrls || [],
      },
      attributes: product.attributes || {},
      catalogProductId: (product as any).catalogProductId || null,
    };
  }

  private mapVariantToCatalog(variant: any, productLookup: Map<string, any>) {
    const product = productLookup.get(variant.productId);
    const baseTitle = product?.name || 'Variant';
    return {
      sku: variant.sku,
      title: `${baseTitle} - ${variant.name || variant.sku}`,
      description: product?.description || product?.shortDescription || null,
      ean: null,
      brand: product?.brand || null,
      manufacturer: product?.manufacturer || null,
      isActive: variant.isActive && (product?.isActive ?? true),
      pricing: {
        basePrice: Number(variant.price),
        currency: this.currency,
      },
      media: {
        imageUrl: variant.imageUrl,
      },
      attributes: variant.options || {},
      catalogProductId: (product as any)?.catalogProductId || null,
      parentProductId: variant.productId,
    };
  }

  private buildRecords(products: any[], variants: any[]): NormalizedRecord[] {
    const records: NormalizedRecord[] = [];
    const productLookup = new Map<string, any>();
    products.forEach((p) => productLookup.set(p.id, p));

    for (const product of products) {
      const sku = this.normalizeSku(product.sku);
      const notes: string[] = [];
      if (!sku) {
        notes.push('Missing SKU');
      }

      const stock = product.trackInventory ? product.stockQuantity : 0;
      records.push({
        source: 'flipflop-product',
        legacyId: product.id,
        sku,
        ean: null,
        name: product.name,
        stockQuantity: stock,
        price: Number(product.price),
        currency: this.currency,
        updatedAt: product.updatedAt ? product.updatedAt.toISOString() : null,
        needsManualReview: !sku,
        notes,
        catalogProductId: (product as any).catalogProductId || null,
        catalogPayload: this.mapProductToCatalog(product),
      });
    }

    if (this.includeVariants) {
      for (const variant of variants) {
        const sku = this.normalizeSku(variant.sku);
        const notes: string[] = [];
        if (!sku) {
          notes.push('Missing SKU for variant');
        }

        const parentProduct = productLookup.get(variant.productId);
        records.push({
          source: 'flipflop-variant',
          legacyId: variant.id,
          sku,
          ean: null,
          name: variant.name || sku,
          stockQuantity: variant.stockQuantity,
          price: Number(variant.price),
          currency: this.currency,
          updatedAt: variant.updatedAt ? variant.updatedAt.toISOString() : null,
          needsManualReview: !sku,
          notes,
          catalogProductId: (parentProduct as any)?.catalogProductId || null,
          catalogPayload: this.mapVariantToCatalog(variant, productLookup),
        });
      }
    }

    return records;
  }

  async run() {
    await this.logger.info('Starting flipflop export', {
      outputPath: this.outputPath,
      includeVariants: this.includeVariants,
    });

    try {
      // Use select to avoid issues with catalogProductId if column doesn't exist
      const [products, variants] = await Promise.all([
        this.prisma.product.findMany({
          select: {
            id: true,
            sku: true,
            name: true,
            description: true,
            shortDescription: true,
            price: true,
            mainImageUrl: true,
            imageUrls: true,
            videoUrls: true,
            stockQuantity: true,
            trackInventory: true,
            isActive: true,
            brand: true,
            manufacturer: true,
            attributes: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
        }) as Promise<any[]>,
        this.includeVariants
          ? this.prisma.productVariant.findMany({
              select: {
                id: true,
                productId: true,
                sku: true,
                name: true,
                price: true,
                stockQuantity: true,
                imageUrl: true,
                isActive: true,
                options: true,
                updatedAt: true,
              },
              orderBy: { updatedAt: 'desc' },
            })
          : Promise.resolve([] as any[]),
      ]);

      const rawRecords = this.buildRecords(products, variants);
      const deduped = this.dedupe(rawRecords);

      const payload = {
        generatedAt: new Date().toISOString(),
        sourceTotals: {
          products: products.length,
          variants: variants.length,
        },
        totalRaw: rawRecords.length,
        totalNormalized: deduped.length,
        records: deduped,
      };

      fs.mkdirSync(path.dirname(this.outputPath), { recursive: true });
      fs.writeFileSync(this.outputPath, JSON.stringify(payload, null, 2), 'utf-8');

      await this.logger.info('Export complete', {
        outputPath: this.outputPath,
        totalRaw: rawRecords.length,
        totalNormalized: deduped.length,
      });
    } catch (error: any) {
      await this.logger.error('Export failed', { message: error.message, stack: error.stack });
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  let outputPath = path.resolve(process.cwd(), 'tmp/migration/flipflop-products-normalized.json');
  let includeVariants = true;

  const outputFlag = args.find((arg) => arg.startsWith('--output='));
  const outputIndex = args.findIndex((arg) => arg === '--output' || arg === '-o');

  if (outputFlag) {
    outputPath = path.resolve(process.cwd(), outputFlag.split('=')[1]);
  } else if (outputIndex !== -1 && args[outputIndex + 1]) {
    outputPath = path.resolve(process.cwd(), args[outputIndex + 1]);
  }

  if (args.includes('--no-variants')) {
    includeVariants = false;
  }

  const service = new FlipflopExportService(outputPath, includeVariants);
  service
    .run()
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('✅ Export finished successfully');
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('❌ Export failed', error);
      process.exit(1);
    });
}

