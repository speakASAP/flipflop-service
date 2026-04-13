import { Injectable, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';
import { LoggerService } from '../logger/logger.service';

export type InventoryLowStockPayload = {
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  timestamp: string;
};

/**
 * Publishes inventory alerts to RabbitMQ for business-orchestrator / reorder workflows.
 * Exchange: inventory.events, routing key: inventory.low_stock
 */
@Injectable()
export class InventoryEventsPublisher implements OnModuleDestroy {
  private connection: any = null;
  private channel: amqp.Channel | null = null;
  private readonly exchangeName = 'inventory.events';
  private readonly routingKey = 'inventory.low_stock';
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
          `InventoryEventsPublisher: exchange ${this.exchangeName} ready`,
          'InventoryEventsPublisher',
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`InventoryEventsPublisher: connect failed: ${message}`, 'InventoryEventsPublisher');
        this.channel = null;
        this.connection = null;
      } finally {
        this.connectPromise = null;
      }
    })();
    await this.connectPromise;
    return this.channel;
  }

  /**
   * Fire-and-forget friendly: logs failures, never throws to callers.
   */
  async publishLowStock(payload: InventoryLowStockPayload): Promise<void> {
    try {
      const ch = await this.ensureConnected();
      if (!ch) {
        return;
      }
      const body = Buffer.from(JSON.stringify(payload));
      ch.publish(this.exchangeName, this.routingKey, body, {
        persistent: true,
        contentType: 'application/json',
      });
      this.logger.log(
        `Published ${this.routingKey} for product ${payload.productId} stock=${payload.currentStock}`,
        'InventoryEventsPublisher',
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`InventoryEventsPublisher: publish failed: ${message}`, 'InventoryEventsPublisher');
    }
  }
}
