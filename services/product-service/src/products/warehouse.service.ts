/**
 * Warehouse Service
 * Fetches warehouse/stock data from Allegro via Supplier Service
 */

import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from '@flipflop/shared';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

@Injectable()
export class WarehouseService {
  private readonly logger: LoggerService;
  private readonly supplierServiceUrl: string;
  private readonly cacheTTL = 300; // 5 minutes cache TTL

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    loggerService: LoggerService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    this.logger = loggerService;
    this.logger.setContext('WarehouseService');

    const supplierPort = this.configService.get('SUPPLIER_SERVICE_PORT') || '3006';
    this.supplierServiceUrl = 
      this.configService.get('SUPPLIER_SERVICE_URL') || 
      `http://localhost:${supplierPort}`;
  }

  /**
   * Get warehouse data for product codes (with caching)
   */
  async getWarehouseData(productCodes: string[]): Promise<Map<string, any>> {
    if (!productCodes || productCodes.length === 0) {
      return new Map();
    }

    const warehouseMap = new Map<string, any>();
    const uncachedCodes: string[] = [];

    // Try to get from cache first
    try {
      const cacheKeys = productCodes.map((code) => `warehouse:${code}`);
      const cachedValues = await this.redis.mget(...cacheKeys);

      productCodes.forEach((code, index) => {
        const cached = cachedValues[index];
        if (cached) {
          try {
            warehouseMap.set(code, JSON.parse(cached));
          } catch (e) {
            uncachedCodes.push(code);
          }
        } else {
          uncachedCodes.push(code);
        }
      });

      if (uncachedCodes.length === 0) {
        this.logger.log('Fetched warehouse data from cache', {
          requested: productCodes.length,
          cached: warehouseMap.size,
        });
        return warehouseMap;
      }
    } catch (error: any) {
      // If cache fails, fetch all codes
      this.logger.error('Cache read failed, fetching all', { error: error.message });
      uncachedCodes.push(...productCodes);
    }

    // Fetch uncached codes from supplier service
    if (uncachedCodes.length > 0) {
      try {
        const codesParam = uncachedCodes.join(',');
        const response = await firstValueFrom(
          this.httpService.get(`${this.supplierServiceUrl}/allegro/warehouse`, {
            params: { codes: codesParam },
          }),
        );

        if (response.data?.success && response.data?.data) {
          const warehouseData = response.data.data;
          
          // Store in cache and add to map
          const cachePromises: Promise<any>[] = [];
          warehouseData.forEach((item: any) => {
            const warehouseItem = {
              stockQuantity: item.stockQuantity || 0,
              trackInventory: item.trackInventory !== false,
              availability: item.availability,
              minimumRequiredStockQuantity: item.minimumRequiredStockQuantity,
              updatedAt: item.updatedAt,
            };
            warehouseMap.set(item.code, warehouseItem);
            
            // Cache with TTL
            cachePromises.push(
              this.redis.setex(
                `warehouse:${item.code}`,
                this.cacheTTL,
                JSON.stringify(warehouseItem),
              ).catch((err) => {
                this.logger.error('Failed to cache warehouse data', {
                  code: item.code,
                  error: err.message,
                });
              }),
            );
          });

          await Promise.all(cachePromises);

          this.logger.log('Fetched warehouse data from Allegro', {
            requested: uncachedCodes.length,
            received: warehouseData.length,
            cached: warehouseMap.size - warehouseData.length,
          });
        }
      } catch (error: any) {
        // Don't fail the entire request if warehouse data is unavailable
        this.logger.error('Failed to fetch warehouse data from Allegro', {
          error: error.message,
          productCodes: uncachedCodes.length,
        });
      }
    }

    return warehouseMap;
  }

  /**
   * Invalidate cache for product codes
   */
  async invalidateCache(productCodes: string[]): Promise<void> {
    if (!productCodes || productCodes.length === 0) {
      return;
    }

    try {
      const cacheKeys = productCodes.map((code) => `warehouse:${code}`);
      await this.redis.del(...cacheKeys);
      this.logger.log('Invalidated warehouse cache', { codes: productCodes.length });
    } catch (error: any) {
      this.logger.error('Failed to invalidate cache', { error: error.message });
    }
  }

  /**
   * Get warehouse data for a single product code
   */
  async getProductWarehouseData(productCode: string): Promise<any | null> {
    const warehouseMap = await this.getWarehouseData([productCode]);
    return warehouseMap.get(productCode) || null;
  }
}

