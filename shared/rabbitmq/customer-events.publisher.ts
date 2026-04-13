import { Injectable, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';
import { LoggerService } from '../logger/logger.service';

export type CustomerReviewRequestPayload = {
  orderId: string;
  customerId: string;
  customerEmail: string;
  productNames: string[];
  fulfilledAt: string;
};

/**
 * Publishes customer lifecycle events for notifications / orchestrator.
 * Exchange: customer.events, routing key: customer.review_request
 */
@Injectable()
export class CustomerEventsPublisher implements OnModuleDestroy {
  private connection: any = null;
  private channel: amqp.Channel | null = null;
  private readonly exchangeName = 'customer.events';
  private readonly routingKey = 'customer.review_request';
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
        const ch = await this.connection.createChannel();
        this.channel = ch as unknown as amqp.Channel;
        await ch.assertExchange(this.exchangeName, 'topic', { durable: true });
        this.logger.log(
          `CustomerEventsPublisher: exchange ${this.exchangeName} ready`,
          'CustomerEventsPublisher',
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`CustomerEventsPublisher: connect failed: ${message}`, 'CustomerEventsPublisher');
        this.channel = null;
        this.connection = null;
      } finally {
        this.connectPromise = null;
      }
    })();
    await this.connectPromise;
    return this.channel;
  }

  /** @returns false if RabbitMQ was unavailable or publish threw */
  async publishReviewRequest(payload: CustomerReviewRequestPayload): Promise<boolean> {
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
        `Published ${this.routingKey} for order ${payload.orderId}`,
        'CustomerEventsPublisher',
      );
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`CustomerEventsPublisher: publish failed: ${message}`, 'CustomerEventsPublisher');
      return false;
    }
  }
}
