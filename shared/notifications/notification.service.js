"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const circuit_breaker_service_1 = require("../resilience/circuit-breaker.service");
const retry_service_1 = require("../resilience/retry.service");
const fallback_service_1 = require("../resilience/fallback.service");
const resilience_monitor_1 = require("../resilience/resilience.monitor");
let NotificationService = class NotificationService {
    constructor(httpService, configService, logger, circuitBreakerService, retryService, fallbackService, resilienceMonitor) {
        this.httpService = httpService;
        this.configService = configService;
        this.notificationServiceUrl =
            this.configService.get('NOTIFICATION_SERVICE_URL') ||
                'https://notifications.statex.cz';
        this.logger = logger;
        this.circuitBreakerService = circuitBreakerService;
        this.retryService = retryService;
        this.fallbackService = fallbackService;
        this.resilienceMonitor = resilienceMonitor;
    }
    async sendNotificationHttp(dto) {
        const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.notificationServiceUrl}/notifications/send`, dto, {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        }));
        return response.data;
    }
    async sendNotification(dto) {
        const callFn = async () => this.sendNotificationHttp(dto);
        const breaker = this.circuitBreakerService.create('notification-service', callFn);
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
            const response = await this.retryService.execute(async () => {
                return await breaker.fire();
            }, {
                retryable: (error) => {
                    return error.code !== 'VALIDATION_ERROR' && error.code !== 'NOT_FOUND';
                },
            });
            this.resilienceMonitor.recordRetryAttempt('notification-service', true);
            this.logger.log(`Notification sent successfully`, {
                channel: dto.channel,
                type: dto.type,
                recipient: dto.recipient,
                notificationId: response?.data?.id,
            });
            return response || {
                success: true,
                data: {
                    id: `sent-${Date.now()}`,
                    status: 'sent',
                    channel: dto.channel,
                    recipient: dto.recipient,
                },
            };
        }
        catch (error) {
            this.resilienceMonitor.recordRetryAttempt('notification-service', false);
            this.logger.error('Failed to send notification', {
                error: error.message,
                channel: dto.channel,
                type: dto.type,
                recipient: dto.recipient,
                stack: error.stack,
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
    }
    async sendOrderConfirmation(recipient, orderNumber, orderTotal, channel = 'email') {
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
    async sendPaymentConfirmation(recipient, orderNumber, paymentAmount, channel = 'email') {
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
    async sendOrderStatusUpdate(recipient, orderNumber, status, channel = 'email') {
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
    async sendShipmentTracking(recipient, orderNumber, trackingNumber, channel = 'email') {
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
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService, Object, circuit_breaker_service_1.CircuitBreakerService,
        retry_service_1.RetryService,
        fallback_service_1.FallbackService,
        resilience_monitor_1.ResilienceMonitor])
], NotificationService);
//# sourceMappingURL=notification.service.js.map