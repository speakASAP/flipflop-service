/**
 * Payment Service
 * Service to handle payments via external payments-microservice
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  CreatePaymentDto,
  PaymentResponse,
  PaymentStatusResponse,
  RefundPaymentDto,
  RefundResponse,
  PaymentStatus,
} from './payment.interface';
import { CircuitBreakerService } from '../resilience/circuit-breaker.service';
import { RetryService } from '../resilience/retry.service';
import { ResilienceMonitor } from '../resilience/resilience.monitor';

@Injectable()
export class PaymentService {
  private readonly paymentServiceUrl: string;
  private readonly logger: LoggerService;
  private readonly circuitBreakerService: CircuitBreakerService;
  private readonly retryService: RetryService;
  private readonly resilienceMonitor: ResilienceMonitor;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    logger: LoggerService,
    circuitBreakerService: CircuitBreakerService,
    retryService: RetryService,
    resilienceMonitor: ResilienceMonitor,
  ) {
    this.paymentServiceUrl =
      this.configService.get<string>('PAYMENT_SERVICE_URL') ||
      'https://payments.statex.cz';
    this.logger = logger;
    this.circuitBreakerService = circuitBreakerService;
    this.retryService = retryService;
    this.resilienceMonitor = resilienceMonitor;
  }

  /**
   * Internal method to call payments-microservice via HTTP
   */
  private async callPaymentService<T>(
    endpoint: string,
    data?: any,
    method: 'GET' | 'POST' | 'PUT' = 'POST',
  ): Promise<T> {
    const url = `${this.paymentServiceUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.configService.get<string>('PAYMENT_API_KEY') || '',
      },
      timeout: 30000,
    };

    let response;
    if (method === 'GET') {
      response = await firstValueFrom(this.httpService.get<T>(url, config));
    } else if (method === 'PUT') {
      response = await firstValueFrom(this.httpService.put<T>(url, data, config));
    } else {
      response = await firstValueFrom(this.httpService.post<T>(url, data, config));
    }

    return response.data;
  }

  /**
   * Create payment for an order
   */
  async createPayment(dto: CreatePaymentDto): Promise<PaymentResponse> {
    const callFn = async () => this.callPaymentService<PaymentResponse>('/payments/create', dto);

    const breaker = this.circuitBreakerService.create(
      'payment-service',
      callFn,
    );

    if (this.circuitBreakerService.isOpen('payment-service')) {
      this.logger.warn('Payment service circuit breaker is open', {
        action: 'createPayment',
        orderId: dto.orderId,
      });
      throw new BadRequestException('Payment service is temporarily unavailable');
    }

    try {
      const response = await this.retryService.execute(
        async () => {
          return await breaker.fire();
        },
        {
          retryable: (error: any) => {
            return error.code !== 'VALIDATION_ERROR' && error.code !== 'BAD_REQUEST';
          },
        },
      );

      this.resilienceMonitor.recordRetryAttempt('payment-service', true);

      this.logger.log(`Payment created successfully`, {
        orderId: dto.orderId,
        paymentId: (response as PaymentResponse)?.data?.id,
      });

      return response as PaymentResponse;
    } catch (error: any) {
      this.resilienceMonitor.recordRetryAttempt('payment-service', false);

      this.logger.error('Failed to create payment', {
        error: error.message,
        orderId: dto.orderId,
        stack: error.stack,
      });

      throw error;
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
    const callFn = async () =>
      this.callPaymentService<PaymentStatusResponse>(`/payments/${paymentId}/status`, undefined, 'GET');

    const breaker = this.circuitBreakerService.create(
      'payment-service',
      callFn,
    );

    if (this.circuitBreakerService.isOpen('payment-service')) {
      this.logger.warn('Payment service circuit breaker is open', {
        action: 'getPaymentStatus',
        paymentId,
      });
      throw new BadRequestException('Payment service is temporarily unavailable');
    }

    try {
      const response = await this.retryService.execute(
        async () => {
          return await breaker.fire();
        },
        {
          retryable: (error: any) => {
            return error.code !== 'NOT_FOUND';
          },
        },
      );

      this.resilienceMonitor.recordRetryAttempt('payment-service', true);

      return response as PaymentStatusResponse;
    } catch (error: any) {
      this.resilienceMonitor.recordRetryAttempt('payment-service', false);

      this.logger.error('Failed to get payment status', {
        error: error.message,
        paymentId,
        stack: error.stack,
      });

      throw error;
    }
  }

  /**
   * Process refund (full or partial)
   */
  async processRefund(dto: RefundPaymentDto): Promise<RefundResponse> {
    const callFn = async () =>
      this.callPaymentService<RefundResponse>(`/payments/${dto.paymentId}/refund`, dto, 'PUT');

    const breaker = this.circuitBreakerService.create(
      'payment-service',
      callFn,
    );

    if (this.circuitBreakerService.isOpen('payment-service')) {
      this.logger.warn('Payment service circuit breaker is open', {
        action: 'processRefund',
        paymentId: dto.paymentId,
      });
      throw new BadRequestException('Payment service is temporarily unavailable');
    }

    try {
      const response = await this.retryService.execute(
        async () => {
          return await breaker.fire();
        },
        {
          retryable: (error: any) => {
            return error.code !== 'VALIDATION_ERROR' && error.code !== 'BAD_REQUEST';
          },
        },
      );

      this.resilienceMonitor.recordRetryAttempt('payment-service', true);

      this.logger.log(`Refund processed successfully`, {
        paymentId: dto.paymentId,
        refundId: (response as RefundResponse)?.data?.id,
      });

      return response as RefundResponse;
    } catch (error: any) {
      this.resilienceMonitor.recordRetryAttempt('payment-service', false);

      this.logger.error('Failed to process refund', {
        error: error.message,
        paymentId: dto.paymentId,
        stack: error.stack,
      });

      throw error;
    }
  }
}

