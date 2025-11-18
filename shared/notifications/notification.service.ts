/**
 * Notification Service
 * Service to send notifications via notifications-microservice
 */

import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  SendNotificationDto,
  NotificationResponse,
  NotificationChannel,
} from './notification.interface';
import { CircuitBreakerService } from '../resilience/circuit-breaker.service';
import { RetryService } from '../resilience/retry.service';
import { FallbackService } from '../resilience/fallback.service';
import { ResilienceMonitor } from '../resilience/resilience.monitor';

@Injectable()
export class NotificationService {
  private readonly notificationServiceUrl: string;
  private readonly logger: LoggerService;
  private readonly circuitBreakerService: CircuitBreakerService;
  private readonly retryService: RetryService;
  private readonly fallbackService: FallbackService;
  private readonly resilienceMonitor: ResilienceMonitor;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    logger: LoggerService,
    circuitBreakerService: CircuitBreakerService,
    retryService: RetryService,
    fallbackService: FallbackService,
    resilienceMonitor: ResilienceMonitor,
  ) {
    this.notificationServiceUrl =
      this.configService.get<string>('NOTIFICATION_SERVICE_URL') ||
      'https://notifications.statex.cz';
    this.logger = logger;
    this.circuitBreakerService = circuitBreakerService;
    this.retryService = retryService;
    this.fallbackService = fallbackService;
    this.resilienceMonitor = resilienceMonitor;
  }

  /**
   * Internal method to send notification via HTTP
   */
  private async sendNotificationHttp(dto: SendNotificationDto): Promise<NotificationResponse> {
    const response = await firstValueFrom(
      this.httpService.post<NotificationResponse>(
        `${this.notificationServiceUrl}/notifications/send`,
        dto,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      ),
    );
    return response.data;
  }

  /**
   * Send notification via notifications-microservice with resilience patterns
   */
  async sendNotification(
    dto: SendNotificationDto,
  ): Promise<NotificationResponse> {
    // Create a function that captures the dto in closure
    const callFn = async () => this.sendNotificationHttp(dto);
    
    // Get or create circuit breaker (reuses same instance by service name)
    const breaker = this.circuitBreakerService.create(
      'notification-service',
      callFn,
    );

    // Check if circuit breaker is open
    if (this.circuitBreakerService.isOpen('notification-service')) {
      this.logger.warn('Notification service circuit breaker is open, using fallback', {
        channel: dto.channel,
        type: dto.type,
        recipient: dto.recipient,
      });

      const fallbackResult = await this.fallbackService.handleNotificationFallback(dto);
      this.resilienceMonitor.recordFallback('notification-service', 'queue');

      return {
        success: true,
        data: {
          id: `fallback-${Date.now()}`,
          status: 'queued',
          channel: dto.channel,
          recipient: dto.recipient,
        },
      };
    }

    try {
      // Use retry service with circuit breaker
      const response = await this.retryService.execute(
        async () => {
          return await breaker.fire();
        },
        {
          retryable: (error: any) => {
            // Don't retry on validation errors
            return error.code !== 'VALIDATION_ERROR' && error.code !== 'NOT_FOUND';
          },
        },
      );

      // Record successful retry
      this.resilienceMonitor.recordRetryAttempt('notification-service', true);

      this.logger.log(`Notification sent successfully`, {
        channel: dto.channel,
        type: dto.type,
        recipient: dto.recipient,
        notificationId: (response as NotificationResponse)?.data?.id,
      });

      return (response as NotificationResponse) || {
        success: true,
        data: {
          id: `sent-${Date.now()}`,
          status: 'sent',
          channel: dto.channel,
          recipient: dto.recipient,
        },
      };
    } catch (error: any) {
      // Record failed retry
      this.resilienceMonitor.recordRetryAttempt('notification-service', false);

      // Log error but don't throw - notifications are non-critical
      this.logger.error('Failed to send notification', {
        error: error.message,
        channel: dto.channel,
        type: dto.type,
        recipient: dto.recipient,
        stack: error.stack,
      });

      // Use fallback strategy
      const fallbackResult = await this.fallbackService.handleNotificationFallback(dto);
      this.resilienceMonitor.recordFallback('notification-service', 'queue');

      // Return success even if queued (non-blocking)
      return {
        success: true,
        data: {
          id: `fallback-${Date.now()}`,
          status: 'queued',
          channel: dto.channel,
          recipient: dto.recipient,
        },
      };
    }
  }

  /**
   * Send order confirmation notification
   */
  async sendOrderConfirmation(
    recipient: string,
    orderNumber: string,
    orderTotal: number,
    channel: NotificationChannel = 'email',
  ): Promise<NotificationResponse> {
    return this.sendNotification({
      channel,
      type: 'order_confirmation',
      recipient,
      subject: `Potvrzení objednávky ${orderNumber}`,
      message: `Vaše objednávka {{orderNumber}} byla úspěšně vytvořena. Celková částka: {{orderTotal}} Kč.`,
      templateData: {
        orderNumber,
        orderTotal: orderTotal.toFixed(2),
      },
    });
  }

  /**
   * Send payment confirmation notification
   */
  async sendPaymentConfirmation(
    recipient: string,
    orderNumber: string,
    paymentAmount: number,
    channel: NotificationChannel = 'email',
  ): Promise<NotificationResponse> {
    return this.sendNotification({
      channel,
      type: 'payment_confirmation',
      recipient,
      subject: `Potvrzení platby za objednávku ${orderNumber}`,
      message: `Platba za objednávku {{orderNumber}} byla úspěšně přijata. Částka: {{paymentAmount}} Kč.`,
      templateData: {
        orderNumber,
        paymentAmount: paymentAmount.toFixed(2),
      },
    });
  }

  /**
   * Send order status update notification
   */
  async sendOrderStatusUpdate(
    recipient: string,
    orderNumber: string,
    status: string,
    channel: NotificationChannel = 'email',
  ): Promise<NotificationResponse> {
    return this.sendNotification({
      channel,
      type: 'order_status_update',
      recipient,
      subject: `Aktualizace stavu objednávky ${orderNumber}`,
      message: `Stav vaší objednávky {{orderNumber}} byl aktualizován na: {{status}}.`,
      templateData: {
        orderNumber,
        status,
      },
    });
  }

  /**
   * Send shipment tracking notification
   */
  async sendShipmentTracking(
    recipient: string,
    orderNumber: string,
    trackingNumber: string,
    channel: NotificationChannel = 'email',
  ): Promise<NotificationResponse> {
    return this.sendNotification({
      channel,
      type: 'shipment_tracking',
      recipient,
      subject: `Informace o odeslání objednávky ${orderNumber}`,
      message: `Vaše objednávka {{orderNumber}} byla odeslána. Sledovací číslo: {{trackingNumber}}.`,
      templateData: {
        orderNumber,
        trackingNumber,
      },
    });
  }
}
