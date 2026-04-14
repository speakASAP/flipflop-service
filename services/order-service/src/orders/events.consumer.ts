import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { LoggerService } from '@flipflop/shared';

type ReviewRequestPayload = {
  orderId: string;
  customerId: string;
  customerEmail: string;
  orderNumber?: string;
  deliveredAt?: string;
  fulfilledAt?: string;
};

type LowStockPayload = {
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  timestamp: string;
};

type PriceChangedPayload = {
  productId: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  approvedAt: string;
};

@Injectable()
export class EventsConsumerService implements OnModuleInit, OnModuleDestroy {
  private connection: any = null;
  private channel: amqp.Channel | null = null;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private reconnectAttempts = 0;
  private isConnecting = false;
  private isSubscribed = false;
  private isShuttingDown = false;
  private readonly queueName = 'order-service.events.consumer';
  private readonly defaultAdminEmail = 'admin@flipflop.statex.cz';
  private readonly reviewExchange = 'customer.events';
  private readonly lowStockExchange = 'inventory.events';
  private readonly pricingExchange = 'pricing.events';
  private readonly reconnectBaseDelayMs = 1000;
  private readonly reconnectMaxDelayMs = 30000;

  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureConnectedAndSubscribed();
  }

  async onModuleDestroy(): Promise<void> {
    this.isShuttingDown = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    try {
      if (this.channel) {
        await (this.channel as any).close();
      }
    } catch {
      // ignore
    }
    try {
      if (this.connection) {
        await this.connection.close();
      }
    } catch {
      // ignore
    }
    this.isSubscribed = false;
    this.isConnecting = false;
    this.channel = null;
    this.connection = null;
  }

  private async ensureConnectedAndSubscribed(): Promise<void> {
    if (this.isShuttingDown || this.isConnecting) {
      return;
    }
    this.isConnecting = true;
    try {
      await this.connect();
      await this.subscribe();
      this.reconnectAttempts = 0;
    } finally {
      this.isConnecting = false;
    }
  }

  private scheduleReconnect(reason: string): void {
    if (this.isShuttingDown || this.reconnectTimer) {
      return;
    }
    this.reconnectAttempts += 1;
    const delayMs = Math.min(
      this.reconnectBaseDelayMs * 2 ** Math.max(0, this.reconnectAttempts - 1),
      this.reconnectMaxDelayMs,
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.ensureConnectedAndSubscribed();
    }, delayMs);
    void this.logger.warn('EventsConsumerService scheduling RabbitMQ reconnect', {
      timestamp: new Date().toISOString(),
      reason,
      reconnect_attempt: this.reconnectAttempts,
      delay_ms: delayMs,
    });
  }

  private async connect(): Promise<void> {
    if (this.connection && this.channel) {
      return;
    }
    try {
      const url = this.configService.get<string>('RABBITMQ_URL') || 'amqp://guest:guest@statex_rabbitmq:5672';
      const connection = await amqp.connect(url);
      this.connection = connection;
      this.connection.on('error', (error: unknown) => {
        void this.logger.warn('EventsConsumerService RabbitMQ connection error', {
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
        });
        this.scheduleReconnect('connection_error');
      });
      this.connection.on('close', () => {
        void this.logger.warn('EventsConsumerService RabbitMQ connection closed', {
          timestamp: new Date().toISOString(),
        });
        this.isSubscribed = false;
        this.channel = null;
        this.connection = null;
        this.scheduleReconnect('connection_closed');
      });
      const channel = await this.connection.createChannel();
      this.channel = channel as unknown as amqp.Channel;
      this.channel.on('error', (error: unknown) => {
        void this.logger.warn('EventsConsumerService RabbitMQ channel error', {
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
        });
        this.scheduleReconnect('channel_error');
      });
      this.channel.on('close', () => {
        void this.logger.warn('EventsConsumerService RabbitMQ channel closed', {
          timestamp: new Date().toISOString(),
        });
        this.isSubscribed = false;
        this.channel = null;
        this.scheduleReconnect('channel_closed');
      });

      await this.channel.assertExchange(this.reviewExchange, 'topic', { durable: true });
      await this.channel.assertExchange(this.lowStockExchange, 'topic', { durable: true });
      await this.channel.assertExchange(this.pricingExchange, 'topic', { durable: true });
      await this.channel.assertQueue(this.queueName, { durable: true });
      await this.channel.bindQueue(this.queueName, this.reviewExchange, 'customer.review_request');
      await this.channel.bindQueue(this.queueName, this.lowStockExchange, 'inventory.low_stock');
      await this.channel.bindQueue(this.queueName, this.pricingExchange, 'pricing.price_changed');

      await this.logger.log('EventsConsumerService connected and queue bindings ready', {
        timestamp: new Date().toISOString(),
        queue: this.queueName,
      });
    } catch (error: unknown) {
      this.isSubscribed = false;
      this.channel = null;
      this.connection = null;
      await this.logger.error('EventsConsumerService failed to connect', {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      });
      this.scheduleReconnect('connect_failed');
    }
  }

  private async subscribe(): Promise<void> {
    if (!this.channel || this.isSubscribed) {
      return;
    }
    await this.channel.consume(
      this.queueName,
      async (message) => {
        if (!message) {
          return;
        }

        const receivedAt = new Date().toISOString();
        const routingKey = message.fields.routingKey;
        try {
          const parsed = JSON.parse(message.content.toString()) as
            | ReviewRequestPayload
            | LowStockPayload
            | PriceChangedPayload;

          if (routingKey === 'customer.review_request') {
            await this.handleReviewRequest(parsed as ReviewRequestPayload, receivedAt);
          } else if (routingKey === 'inventory.low_stock') {
            await this.handleLowStock(parsed as LowStockPayload, receivedAt);
          } else if (routingKey === 'pricing.price_changed') {
            await this.handlePriceChanged(parsed as PriceChangedPayload, receivedAt);
          } else {
            await this.logger.warn('EventsConsumerService received unsupported routing key', {
              timestamp: receivedAt,
              routing_key: routingKey,
            });
          }

          if (this.channel) {
            this.channel.ack(message);
          }
        } catch (error: unknown) {
          await this.logger.error('EventsConsumerService failed to process message', {
            timestamp: receivedAt,
            routing_key: routingKey,
            error: error instanceof Error ? error.message : String(error),
          });
          if (this.channel) {
            this.channel.nack(message, false, false);
          }
        }
      },
      { noAck: false },
    );
    this.isSubscribed = true;
    await this.logger.log('EventsConsumerService subscribed to queue', {
      timestamp: new Date().toISOString(),
      queue: this.queueName,
    });
  }

  private async handleReviewRequest(payload: ReviewRequestPayload, timestamp: string): Promise<void> {
    const notificationsServiceUrl =
      this.configService.get<string>('NOTIFICATIONS_SERVICE_URL') ||
      this.configService.get<string>('NOTIFICATION_SERVICE_URL');
    if (!notificationsServiceUrl) {
      await this.logger.warn('review_request skipped: NOTIFICATIONS_SERVICE_URL missing', {
        timestamp,
        order_id: payload.orderId,
      });
      return;
    }

    const url = `${notificationsServiceUrl.replace(/\/$/, '')}/notifications/email`;
    const orderNumber = payload.orderNumber || payload.orderId;
    const deliveredAt = payload.deliveredAt || payload.fulfilledAt;
    try {
      await this.httpService.axiosRef.post(url, {
        to: payload.customerEmail,
        template: 'review_request',
        data: {
          orderNumber,
          reviewUrl: `https://flipflop.statex.cz/review/${payload.orderId}`,
        },
      });
      await this.logger.log('review_request notification sent', {
        timestamp,
        order_id: payload.orderId,
        customer_email: payload.customerEmail,
        delivered_at: deliveredAt || null,
      });
    } catch (error: unknown) {
      await this.logger.warn('review_request notification failed', {
        timestamp,
        order_id: payload.orderId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleLowStock(payload: LowStockPayload, timestamp: string): Promise<void> {
    const notificationsServiceUrl =
      this.configService.get<string>('NOTIFICATIONS_SERVICE_URL') ||
      this.configService.get<string>('NOTIFICATION_SERVICE_URL');
    if (!notificationsServiceUrl) {
      await this.logger.warn('low_stock skipped: NOTIFICATIONS_SERVICE_URL missing', {
        timestamp,
        product_id: payload.productId,
      });
      return;
    }

    const adminEmail = this.configService.get<string>('ADMIN_EMAIL') || this.defaultAdminEmail;
    const url = `${notificationsServiceUrl.replace(/\/$/, '')}/notifications/email`;
    try {
      await this.httpService.axiosRef.post(url, {
        to: adminEmail,
        template: 'low_stock_alert',
        data: {
          productName: payload.productName,
          currentStock: payload.currentStock,
          threshold: payload.threshold,
        },
      });
      await this.logger.log('low_stock alert sent', {
        timestamp,
        product_id: payload.productId,
        current_stock: payload.currentStock,
        threshold: payload.threshold,
      });
    } catch (error: unknown) {
      await this.logger.warn('low_stock alert failed', {
        timestamp,
        product_id: payload.productId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handlePriceChanged(payload: PriceChangedPayload, timestamp: string): Promise<void> {
    await this.logger.log('pricing.price_changed audit', {
      timestamp,
      product_id: payload.productId,
      product_name: payload.productName,
      old_price: payload.oldPrice,
      new_price: payload.newPrice,
      change_percent: payload.changePercent,
      approved_at: payload.approvedAt,
    });
  }
}
