import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from '../logger/logger.service';

/**
 * API client for orders-microservice
 * Forwards orders from FlipFlop to central order processing
 */
@Injectable()
export class OrderClientService {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly logger: LoggerService,
  ) {
    this.baseUrl = process.env.ORDER_SERVICE_URL || 'http://orders-microservice:3203';
  }

  async createOrder(orderData: {
    externalOrderId: string;
    channel: string;
    channelAccountId?: string;
    customer?: any;
    shippingAddress?: any;
    billingAddress?: any;
    items: Array<{
      productId: string;
      sku?: string;
      title: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    subtotal: number;
    shippingCost: number;
    taxAmount: number;
    total: number;
    currency: string;
    paymentMethod?: string;
    paymentStatus?: string;
    shippingMethod?: string;
    customerNote?: string;
    orderedAt?: Date;
  }): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/orders`, orderData)
      );
      this.logger.log(`Order created in orders-microservice: ${response.data.data?.id}`, 'OrderClient');
      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to create order: ${errorMessage}`, errorStack, 'OrderClient');
      throw new HttpException(`Failed to create order: ${errorMessage}`, HttpStatus.BAD_REQUEST);
    }
  }
}

