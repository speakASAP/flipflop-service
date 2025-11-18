import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { SendNotificationDto, NotificationResponse, NotificationChannel } from './notification.interface';
import { CircuitBreakerService } from '../resilience/circuit-breaker.service';
import { RetryService } from '../resilience/retry.service';
import { FallbackService } from '../resilience/fallback.service';
import { ResilienceMonitor } from '../resilience/resilience.monitor';
export declare class NotificationService {
    private readonly httpService;
    private readonly configService;
    private readonly notificationServiceUrl;
    private readonly logger;
    private readonly circuitBreakerService;
    private readonly retryService;
    private readonly fallbackService;
    private readonly resilienceMonitor;
    constructor(httpService: HttpService, configService: ConfigService, logger: LoggerService, circuitBreakerService: CircuitBreakerService, retryService: RetryService, fallbackService: FallbackService, resilienceMonitor: ResilienceMonitor);
    private sendNotificationHttp;
    sendNotification(dto: SendNotificationDto): Promise<NotificationResponse>;
    sendOrderConfirmation(recipient: string, orderNumber: string, orderTotal: number, channel?: NotificationChannel): Promise<NotificationResponse>;
    sendPaymentConfirmation(recipient: string, orderNumber: string, paymentAmount: number, channel?: NotificationChannel): Promise<NotificationResponse>;
    sendOrderStatusUpdate(recipient: string, orderNumber: string, status: string, channel?: NotificationChannel): Promise<NotificationResponse>;
    sendShipmentTracking(recipient: string, orderNumber: string, trackingNumber: string, channel?: NotificationChannel): Promise<NotificationResponse>;
}
