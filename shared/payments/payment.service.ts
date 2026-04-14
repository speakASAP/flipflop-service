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
  private readonly paymentServiceFallbackUrls: string[];
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
    this.paymentServiceFallbackUrls = this.buildPaymentServiceFallbackUrls();
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
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.configService.get<string>('PAYMENT_API_KEY') || '',
      },
      timeout: 30000,
    };
    const candidateUrls = [this.paymentServiceUrl, ...this.paymentServiceFallbackUrls];
    const callStartedAt = Date.now();
    let lastError: unknown;

    for (let i = 0; i < candidateUrls.length; i += 1) {
      const baseUrl = candidateUrls[i];
      const url = `${baseUrl}${endpoint}`;
      try {
        let response;
        if (method === 'GET') {
          response = await firstValueFrom(this.httpService.get<T>(url, config));
        } else if (method === 'PUT') {
          response = await firstValueFrom(this.httpService.put<T>(url, data, config));
        } else {
          response = await firstValueFrom(this.httpService.post<T>(url, data, config));
        }

        if (i > 0) {
          this.logger.warn('Payment service fallback URL succeeded', {
            timestamp: new Date().toISOString(),
            duration_ms: Date.now() - callStartedAt,
            endpoint,
            method,
            fallbackUrl: baseUrl,
          });
        }
        return response.data;
      } catch (error: unknown) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        const code =
          typeof error === 'object' && error !== null && 'code' in error
            ? String((error as { code?: string }).code || '')
            : '';
        const isDnsFailure =
          code === 'EAI_AGAIN' ||
          code === 'ENOTFOUND' ||
          message.includes('EAI_AGAIN') ||
          message.includes('ENOTFOUND');
        const hasMoreCandidates = i < candidateUrls.length - 1;

        if (isDnsFailure && hasMoreCandidates) {
          this.logger.warn('Payment service URL resolution failed, trying fallback', {
            timestamp: new Date().toISOString(),
            duration_ms: Date.now() - callStartedAt,
            endpoint,
            method,
            failedUrl: baseUrl,
            nextUrl: candidateUrls[i + 1],
            error: message,
          });
          continue;
        }
        throw error;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new BadRequestException('Payment service request failed');
  }

  private buildPaymentServiceFallbackUrls(): string[] {
    const configuredFallback = this.configService.get<string>('PAYMENT_SERVICE_FALLBACK_URL');
    const discoveredFallback = this.swapServiceHost(this.paymentServiceUrl);
    const urls = [configuredFallback, discoveredFallback].filter(
      (url): url is string => !!url && url !== this.paymentServiceUrl,
    );
    return Array.from(new Set(urls));
  }

  private swapServiceHost(urlValue: string): string | undefined {
    try {
      const parsed = new URL(urlValue);
      if (parsed.hostname === 'payments-microservice') {
        parsed.hostname = 'payment-service';
        return parsed.toString().replace(/\/$/, '');
      }
      if (parsed.hostname === 'payment-service') {
        parsed.hostname = 'payments-microservice';
        return parsed.toString().replace(/\/$/, '');
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Create payment for an order
   */
  async createPayment(dto: CreatePaymentDto): Promise<PaymentResponse> {
    const payload: Record<string, unknown> = {
      orderId: dto.orderId,
      applicationId: dto.applicationId,
      amount: dto.amount,
      currency: dto.currency || 'CZK',
      paymentMethod: (dto.paymentMethod || 'webpay').toLowerCase(),
      callbackUrl: dto.callbackUrl,
      customer: dto.customer,
    };
    if (dto.description) {
      payload.description = dto.description;
    }
    if (dto.metadata) {
      payload.metadata = dto.metadata;
    }

    const callFn = async () =>
      this.callPaymentService<Record<string, unknown>>('/payments/create', payload);

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
      const raw = await this.retryService.execute(
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

      const response = this.normalizeCreatePaymentResponse(raw, dto.orderId);

      this.logger.log(`Payment created successfully`, {
        orderId: dto.orderId,
        paymentId: response?.data?.id,
      });

      return response;
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
      this.callPaymentService<PaymentStatusResponse>(`/payments/${paymentId}`, undefined, 'GET');

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

  /**
   * Map payments-microservice POST /payments/create response to PaymentResponse.
   */
  private normalizeCreatePaymentResponse(raw: any, orderId: string): PaymentResponse {
    if (!raw || raw.success === false) {
      return raw as PaymentResponse;
    }
    const d = raw.data || {};
    const paymentId = d.paymentId || d.id;
    const redirectUri = d.redirectUrl || d.redirectUri;
    return {
      success: !!raw.success,
      data: paymentId
        ? {
            id: paymentId,
            paymentId,
            orderId: d.orderId || orderId,
            status: d.status,
            redirectUri,
            redirectUrl: d.redirectUrl,
            transactionId: d.providerTransactionId || paymentId,
          }
        : undefined,
    };
  }
}

