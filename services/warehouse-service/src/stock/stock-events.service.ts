import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';
import { LoggerService } from '@flipflop/shared';

/**
 * Service for publishing stock events to RabbitMQ
 */
@Injectable()
export class StockEventsService implements OnModuleInit, OnModuleDestroy {
  private connection: any = null;
  private channel: amqp.Channel | null = null;
  private readonly exchangeName = 'stock.events';

  constructor(private readonly logger: LoggerService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    try {
      const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@statex_rabbitmq:5672';
      this.logger.log(`Connecting to RabbitMQ: ${url}`, 'StockEventsService');

      const conn = await amqp.connect(url);
      this.connection = conn;
      if (!this.connection) {
        throw new Error('Failed to establish RabbitMQ connection');
      }
      const ch = await this.connection.createChannel();
      this.channel = ch as unknown as amqp.Channel;
      if (!this.channel) {
        throw new Error('Failed to create RabbitMQ channel');
      }

      // Declare exchange for stock events
      await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });

      this.logger.log('Connected to RabbitMQ', 'StockEventsService');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to connect to RabbitMQ: ${errorMessage}`, errorStack, 'StockEventsService');
    }
  }

  private async disconnect() {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      this.logger.log('Disconnected from RabbitMQ', 'StockEventsService');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error disconnecting from RabbitMQ: ${errorMessage}`, errorStack, 'StockEventsService');
    }
  }

  /**
   * Publish stock.updated event
   */
  async publishStockUpdated(productId: string, warehouseId: string, quantity: number, available: number) {
    const event = {
      type: 'stock.updated',
      productId,
      warehouseId,
      quantity,
      available,
      timestamp: new Date().toISOString(),
    };

    await this.publish('stock.updated', event);
    this.logger.log(`Published stock.updated for product ${productId}: available=${available}`, 'StockEventsService');
  }

  /**
   * Publish stock.low event when stock falls below threshold
   */
  async publishStockLow(productId: string, warehouseId: string, available: number, threshold: number) {
    const event = {
      type: 'stock.low',
      productId,
      warehouseId,
      available,
      threshold,
      timestamp: new Date().toISOString(),
    };

    await this.publish('stock.low', event);
    this.logger.warn(`Published stock.low for product ${productId}: available=${available}, threshold=${threshold}`, 'StockEventsService');
  }

  /**
   * Publish stock.out event when stock reaches zero
   */
  async publishStockOut(productId: string, warehouseId: string) {
    const event = {
      type: 'stock.out',
      productId,
      warehouseId,
      timestamp: new Date().toISOString(),
    };

    await this.publish('stock.out', event);
    this.logger.warn(`Published stock.out for product ${productId}`, 'StockEventsService');
  }

  private async publish(routingKey: string, event: object) {
    if (!this.channel) {
      this.logger.error('RabbitMQ channel not available', '', 'StockEventsService');
      return;
    }

    try {
      const message = JSON.stringify(event);
      this.channel.publish(this.exchangeName, routingKey, Buffer.from(message), {
        persistent: true,
        contentType: 'application/json',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to publish event: ${errorMessage}`, errorStack, 'StockEventsService');
    }
  }
}

