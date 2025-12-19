/**
 * Gateway Service
 * Routes requests to appropriate microservices
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';
import * as https from 'https';

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);
  private readonly serviceUrls: Record<string, string>;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // Ports configured in flipflop/.env: PRODUCT_SERVICE_PORT (default: 3002), CART_SERVICE_PORT (default: 3009), etc.
    const productPort = this.configService.get('PRODUCT_SERVICE_PORT') || '3002';
    const cartPort = this.configService.get('CART_SERVICE_PORT') || '3009';
    const orderPort = this.configService.get('ORDER_SERVICE_PORT') || '3003';
    const warehousePort = this.configService.get('WAREHOUSE_SERVICE_PORT') || '3005';
    const userPort = this.configService.get('USER_SERVICE_PORT') || '3004';
    const supplierPort = this.configService.get('SUPPLIER_SERVICE_PORT') || '3006';

    this.serviceUrls = {
      auth: this.configService.get('AUTH_SERVICE_URL') || 'https://auth.statex.cz',
      products: this.configService.get('PRODUCT_SERVICE_URL') || `http://flipflop-product-service:${productPort}`,
      cart: this.configService.get('CART_SERVICE_URL') || `http://flipflop-cart-service:${cartPort}`,
      orders: this.configService.get('ORDER_SERVICE_URL') || `http://flipflop-order-service:${orderPort}`,
      warehouse: this.configService.get('WAREHOUSE_SERVICE_URL') || `http://flipflop-warehouse-service:${warehousePort}`,
      users: this.configService.get('USER_SERVICE_URL') || `http://flipflop-user-service:${userPort}`,
      supplier: this.configService.get('SUPPLIER_SERVICE_URL') || `http://localhost:${supplierPort}`,
    };
  }

  /**
   * Forward request to service
   */
  async forwardRequest(
    serviceName: string,
    path: string,
    method: string,
    body?: any,
    headers?: Record<string, string>,
  ): Promise<any> {
    const baseUrl = this.serviceUrls[serviceName];
    if (!baseUrl) {
      throw new Error(`Service ${serviceName} not configured`);
    }

    const url = `${baseUrl}${path}`;
    const nodeEnv = this.configService.get('NODE_ENV') || 'development';
    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      timeout: 30000,
      // Disable SSL verification in development for external services
      httpsAgent: nodeEnv === 'development' && url.startsWith('https://')
        ? new https.Agent({ rejectUnauthorized: false })
        : undefined,
    };

    this.logger.debug(`Forwarding ${method} ${url}`);

    try {
      let response;
      switch (method.toUpperCase()) {
        case 'GET':
          response = await firstValueFrom(this.httpService.get(url, config));
          break;
        case 'POST':
          response = await firstValueFrom(this.httpService.post(url, body, config));
          break;
        case 'PUT':
          response = await firstValueFrom(this.httpService.put(url, body, config));
          break;
        case 'DELETE':
          response = await firstValueFrom(this.httpService.delete(url, config));
          break;
        case 'PATCH':
          response = await firstValueFrom(this.httpService.patch(url, body, config));
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      return response.data;
    } catch (error: any) {
      this.logger.error(`Error forwarding request to ${serviceName}: ${error.message}`);
      throw error;
    }
  }
}

