import { Injectable, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';
import { LoggerService } from '../logger/logger.service';

export type PricingPriceChangedPayload = {
  productId: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  approvedAt: string;
};

@Injectable()
export class PricingEventsPublisher implements OnModuleDestroy {
  private connection: any = null;
  private channel: amqp.Channel | null = null;
  private readonly exchangeName = 'pricing.events';
  private readonly routingKey = 'pricing.price_changed';
  private connectPromise: Promise<void> | null = null;

  constructor(private readonly logger: LoggerService) {}

  async onModuleDestroy(): Promise<void> {
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
    this.channel = null;
    this.connection = null;
  }

  private async ensureConnected(): Promise<amqp.Channel | null> {
    if (this.channel) {
      return this.channel;
    }
    if (this.connectPromise) {
      await this.connectPromise;
      return this.channel;
    }
    this.connectPromise = (async () => {
      try {
        const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@statex_rabbitmq:5672';
        const conn = await amqp.connect(url);
        this.connection = conn;
        this.connection.on('error', (error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.warn(`PricingEventsPublisher: connection error: ${message}`, 'PricingEventsPublisher');
        });
        this.connection.on('close', () => {
          this.logger.warn('PricingEventsPublisher: connection closed', 'PricingEventsPublisher');
          this.channel = null;
          this.connection = null;
        });
        const ch = await this.connection.createChannel();
        this.channel = ch as unknown as amqp.Channel;
        this.channel.on('error', (error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.warn(`PricingEventsPublisher: channel error: ${message}`, 'PricingEventsPublisher');
        });
        this.channel.on('close', () => {
          this.logger.warn('PricingEventsPublisher: channel closed', 'PricingEventsPublisher');
          this.channel = null;
        });
        await ch.assertExchange(this.exchangeName, 'topic', { durable: true });
        this.logger.log(
          `PricingEventsPublisher: exchange ${this.exchangeName} ready`,
          'PricingEventsPublisher',
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`PricingEventsPublisher: connect failed: ${message}`, 'PricingEventsPublisher');
        this.channel = null;
        this.connection = null;
      } finally {
        this.connectPromise = null;
      }
    })();
    await this.connectPromise;
    return this.channel;
  }

  async publishPriceChanged(payload: PricingPriceChangedPayload): Promise<boolean> {
    try {
      const ch = await this.ensureConnected();
      if (!ch) {
        return false;
      }
      const body = Buffer.from(JSON.stringify(payload));
      ch.publish(this.exchangeName, this.routingKey, body, {
        persistent: true,
        contentType: 'application/json',
      });
      this.logger.log(
        `Published ${this.routingKey} for product ${payload.productId}`,
        'PricingEventsPublisher',
      );
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`PricingEventsPublisher: publish failed: ${message}`, 'PricingEventsPublisher');
      return false;
    }
  }
}
