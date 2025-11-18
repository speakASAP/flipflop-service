/**
 * Gateway Service
 * Routes requests to appropriate microservices
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);
  private readonly serviceUrls: Record<string, string>;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.serviceUrls = {
      auth: this.configService.get('AUTH_SERVICE_URL') || 'https://auth.statex.cz',
      products: this.configService.get('PRODUCT_SERVICE_URL') || 'http://e-commerce-product-service:3002',
      cart: this.configService.get('CART_SERVICE_URL') || 'http://e-commerce-cart-service:3009',
      orders: this.configService.get('ORDER_SERVICE_URL') || 'http://e-commerce-order-service:3003',
      warehouse: this.configService.get('WAREHOUSE_SERVICE_URL') || 'http://e-commerce-warehouse-service:3005',
      users: this.configService.get('USER_SERVICE_URL') || 'http://e-commerce-user-service:3004',
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
    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      timeout: 30000,
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

