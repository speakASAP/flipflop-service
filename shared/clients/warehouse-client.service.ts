import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from '../logger/logger.service';

/**
 * API client for warehouse-microservice
 * Fetches stock levels and manages stock reservations
 */
@Injectable()
export class WarehouseClientService {
  private readonly baseUrl: string;
  constructor(
    private readonly httpService: HttpService,
    private readonly logger: LoggerService,
  ) {
    this.baseUrl = process.env.WAREHOUSE_SERVICE_URL || 'http://warehouse-microservice:3201';
  }

  private requestOptions() {
    const token = (
      process.env.WAREHOUSE_SERVICE_TOKEN ||
      process.env.JWT_TOKEN ||
      process.env.SERVICE_TOKEN ||
      ''
    ).trim();

    if (!token) {
      return {};
    }

    return {
      headers: {
        Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      },
    };
  }

  async getStockByProduct(productId: string): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/stock/${productId}`, this.requestOptions())
      );
      return response.data.data || [];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Stock not found for product ${productId}: ${errorMessage}`, 'WarehouseClient');
      return [];
    }
  }

  async getTotalAvailable(productId: string): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/stock/${productId}/total`, this.requestOptions())
      );
      return response.data.data?.totalAvailable || 0;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get total stock from warehouse-microservice for product ${productId}: ${errorMessage}`, undefined, 'WarehouseClient');
      throw new HttpException(
        `Failed to get total stock from warehouse-microservice: ${errorMessage}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async reserveStock(productId: string, warehouseId: string, quantity: number, orderId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/stock/reserve`, {
          productId,
          warehouseId,
          quantity,
          orderId,
          reasonCode: 'flipflop_order_reservation',
          channel: 'flipflop',
          reference: orderId,
        }, this.requestOptions())
      );
      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to reserve stock: ${errorMessage}`, errorStack, 'WarehouseClient');
      throw new HttpException(`Failed to reserve stock: ${errorMessage}`, HttpStatus.BAD_REQUEST);
    }
  }

  async setStock(productId: string, warehouseId: string, quantity: number, reason?: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/stock/set`, {
          productId,
          warehouseId,
          quantity,
          reason,
        }, this.requestOptions())
      );
      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to set stock: ${errorMessage}`, errorStack, 'WarehouseClient');
      throw new HttpException(`Failed to set stock: ${errorMessage}`, HttpStatus.BAD_REQUEST);
    }
  }

  async incrementStock(productId: string, warehouseId: string, quantity: number, reason?: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/stock/increment`, {
          productId,
          warehouseId,
          quantity,
          reason,
        })
      );
      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to increment stock: ${errorMessage}`, errorStack, 'WarehouseClient');
      throw new HttpException(`Failed to increment stock: ${errorMessage}`, HttpStatus.BAD_REQUEST);
    }
  }

  async decrementStock(productId: string, warehouseId: string, quantity: number, reason?: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/stock/decrement`, {
          productId,
          warehouseId,
          quantity,
          reason,
        })
      );
      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to decrement stock: ${errorMessage}`, errorStack, 'WarehouseClient');
      throw new HttpException(`Failed to decrement stock: ${errorMessage}`, HttpStatus.BAD_REQUEST);
    }
  }

  async unreserveStock(productId: string, warehouseId: string, quantity: number, orderId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/stock/unreserve`, {
          productId,
          warehouseId,
          quantity,
          orderId,
          reasonCode: 'flipflop_order_reservation_release',
          channel: 'flipflop',
          reference: orderId,
        }, this.requestOptions())
      );
      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to unreserve stock: ${errorMessage}`, errorStack, 'WarehouseClient');
      throw new HttpException(`Failed to unreserve stock: ${errorMessage}`, HttpStatus.BAD_REQUEST);
    }
  }

  async getWarehouses(): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/warehouses`, this.requestOptions())
      );
      return response.data.data || [];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to get warehouses: ${errorMessage}`, 'WarehouseClient');
      return [];
    }
  }

  async getDefaultWarehouseId(): Promise<string | null> {
    try {
      const warehouses = await this.getWarehouses();
      if (warehouses.length > 0) {
        // Return first active warehouse (sorted by priority)
        return warehouses[0].id;
      }
      // Fallback to environment variable
      return process.env.DEFAULT_WAREHOUSE_ID || null;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to get default warehouse: ${errorMessage}`, 'WarehouseClient');
      return process.env.DEFAULT_WAREHOUSE_ID || null;
    }
  }
}
