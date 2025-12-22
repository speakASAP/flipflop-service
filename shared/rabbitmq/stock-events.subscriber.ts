import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';
import { LoggerService } from '../logger/logger.service';
import { PrismaService } from '../database/prisma.service';

/**
 * RabbitMQ subscriber for stock events from warehouse-microservice
 * Updates product stock quantities in real-time
 */
@Injectable()
export class StockEventsSubscriber implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private readonly exchangeName = 'stock.events';
  private readonly queueName = 'stock.flipflop-service';

  constructor(
    private readonly logger: LoggerService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.connect();
    await this.subscribe();
  }

  async onModuleDestroy() {
    if (this.channel) {
      try {
        await (this.channel as any).close();
      } catch (error: unknown) {
        // Ignore errors during cleanup
      }
    }
    if (this.connection) {
      try {
        await (this.connection as any).close();
      } catch (error: unknown) {
        // Ignore errors during cleanup
      }
    }
  }

  private async connect() {
    try {
      const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@statex_rabbitmq:5672';
      this.logger.log(`Connecting to RabbitMQ: ${url}`, 'StockEventsSubscriber');

      const conn = await amqp.connect(url);
      this.connection = conn as unknown as amqp.Connection;
      if (!this.connection) {
        throw new Error('Failed to establish RabbitMQ connection');
      }
      const ch = await (conn as any).createChannel();
      this.channel = ch as unknown as amqp.Channel;
      if (!this.channel) {
        throw new Error('Failed to create RabbitMQ channel');
      }

      await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });
      await this.channel.assertQueue(this.queueName, { durable: true });
      await this.channel.bindQueue(this.queueName, this.exchangeName, 'stock.#');

      this.logger.log('Connected to RabbitMQ and subscribed to stock events', 'StockEventsSubscriber');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to connect to RabbitMQ: ${errorMessage}`, errorStack, 'StockEventsSubscriber');
    }
  }

  private async subscribe() {
    if (!this.channel) return;

    try {
      await this.channel.consume(
        this.queueName,
        async (msg) => {
          if (!msg) return;

          try {
            const event = JSON.parse(msg.content.toString());
            await this.handleStockEvent(event);
            if (this.channel) {
              this.channel.ack(msg);
            }
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Error processing stock event: ${errorMessage}`, errorStack, 'StockEventsSubscriber');
            if (this.channel) {
              this.channel.nack(msg, false, false);
            }
          }
        },
        { noAck: false }
      );

      this.logger.log('Subscribed to stock events queue', 'StockEventsSubscriber');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to subscribe to stock events: ${errorMessage}`, errorStack, 'StockEventsSubscriber');
    }
  }

  private async handleStockEvent(event: any) {
    const { type, productId, available } = event;

    this.logger.log(`Received stock event: ${type} for product ${productId}, available: ${available}`, 'StockEventsSubscriber');

    switch (type) {
      case 'stock.updated':
        await this.updateProductStock(productId, available);
        break;
      case 'stock.low':
        this.logger.warn(`Low stock alert for product ${productId}: ${available} available`, 'StockEventsSubscriber');
        // Optionally update stock quantity
        if (available !== undefined) {
          await this.updateProductStock(productId, available);
        }
        break;
      case 'stock.out':
        await this.handleOutOfStock(productId);
        break;
      default:
        this.logger.warn(`Unknown stock event type: ${type}`, 'StockEventsSubscriber');
    }
  }

  private async updateProductStock(productId: string, available: number) {
    try {
      // Note: event.productId is the catalog-microservice product ID
      // We need to find local products by catalogProductId
      // For now, we'll use the event's available value
      // In the future, we could fetch total available from warehouse-microservice
      // to get accurate total across all warehouses

      // Find all products linked to this catalog product
      const result = await this.prisma.product.updateMany({
        where: {
          catalogProductId: productId,
          trackInventory: true,
        },
        data: {
          stockQuantity: available,
          updatedAt: new Date(),
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `Updated ${result.count} product(s) stock to ${available} for catalog product ${productId}`,
          'StockEventsSubscriber'
        );
      } else {
        this.logger.warn(
          `No products found with catalogProductId ${productId}`,
          'StockEventsSubscriber'
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to update product stock: ${error.message}`,
        error.stack,
        'StockEventsSubscriber'
      );
    }
  }

  private async handleOutOfStock(productId: string) {
    try {
      // Set stockQuantity to 0 for all products linked to this catalog product
      const result = await this.prisma.product.updateMany({
        where: {
          catalogProductId: productId,
          trackInventory: true,
        },
        data: {
          stockQuantity: 0,
          updatedAt: new Date(),
          // Optionally: isActive: false, // Uncomment if you want to hide out-of-stock products
        },
      });

      if (result.count > 0) {
        this.logger.warn(
          `Marked ${result.count} product(s) as out of stock for catalog product ${productId}`,
          'StockEventsSubscriber'
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to handle out of stock: ${error.message}`,
        error.stack,
        'StockEventsSubscriber'
      );
    }
  }
}

