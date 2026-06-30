import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';
import { createHash } from 'crypto';
import { LoggerService } from '../logger/logger.service';
import { PrismaService } from '../database/prisma.service';

const TERMINAL_STATUSES = ['SUCCEEDED', 'FAILED', 'BLOCKED'] as const;
const SECRET_KEYS = ['authorization', 'token', 'accessToken', 'refreshToken', 'clientSecret', 'secret', 'apiKey', 'password'];

type StockEventType = 'stock.updated' | 'stock.low' | 'stock.out';

type WarehouseStockEvent = {
  type: StockEventType;
  productId?: string;
  available?: number;
  eventId?: string;
  occurredAt?: string;
  [key: string]: unknown;
};

/**
 * RabbitMQ subscriber for Warehouse stock events.
 * Warehouse is the only source of sellable quantity; this service mirrors it
 * into FlipFlop product-cache sellability and records durable sync attempts.
 */
@Injectable()
export class StockEventsSubscriber implements OnModuleInit, OnModuleDestroy {
  private connection: any = null;
  private channel: amqp.Channel | null = null;
  private readonly exchangeName = 'stock.events';
  private readonly queueName = 'stock.flipflop-service';
  private readonly rateLimitMs = Math.max(parseInt(process.env.FLIPFLOP_STOCK_SYNC_RATE_LIMIT_MS || '1000', 10) || 1000, 0);

  constructor(
    private readonly logger: LoggerService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.ensureAttemptTable();
    await this.connect();
    await this.subscribe();
  }

  async onModuleDestroy() {
    try {
      if (this.channel) await (this.channel as any).close();
      if (this.connection) await this.connection.close();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Error closing RabbitMQ connection: ${errorMessage}`, 'StockEventsSubscriber');
    }
  }

  private async connect() {
    try {
      const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@statex_rabbitmq:5672';
      this.logger.log(`Connecting to RabbitMQ: ${url}`, 'StockEventsSubscriber');

      const conn = await amqp.connect(url);
      this.connection = conn;
      if (!this.connection) throw new Error('Failed to establish RabbitMQ connection');
      const ch = await this.connection.createChannel();
      this.channel = ch as unknown as amqp.Channel;
      if (!this.channel) throw new Error('Failed to create RabbitMQ channel');

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
            this.channel?.ack(msg);
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Error processing stock event: ${errorMessage}`, errorStack, 'StockEventsSubscriber');
            this.channel?.nack(msg, false, false);
          }
        },
        { noAck: false },
      );

      this.logger.log('Subscribed to stock events queue', 'StockEventsSubscriber');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to subscribe to stock events: ${errorMessage}`, errorStack, 'StockEventsSubscriber');
    }
  }

  private async handleStockEvent(event: WarehouseStockEvent) {
    const { type, productId } = event;
    if (!productId) {
      this.logger.warn(`Ignoring stock event without productId: ${JSON.stringify(this.redact(event))}`, 'StockEventsSubscriber');
      return;
    }

    this.logger.log(`Received stock event: ${type} for product ${productId}, available: ${event.available}`, 'StockEventsSubscriber');

    switch (type) {
      case 'stock.updated':
        await this.syncWarehouseQuantityToFlipFlop(event, this.requireAvailable(event));
        break;
      case 'stock.low':
        this.logger.warn(`Low stock alert for product ${productId}: ${event.available} available`, 'StockEventsSubscriber');
        break;
      case 'stock.out':
        await this.syncWarehouseQuantityToFlipFlop(event, 0);
        break;
      default:
        this.logger.warn(`Ignoring unsupported stock event type: ${type}`, 'StockEventsSubscriber');
    }
  }

  private async syncWarehouseQuantityToFlipFlop(event: WarehouseStockEvent, targetQuantity: number) {
    if (!Number.isInteger(targetQuantity) || targetQuantity < 0) {
      throw new Error(`Warehouse stock target must be a non-negative integer, got ${targetQuantity}`);
    }

    const productId = event.productId as string;
    const prismaAny = this.prisma as any;
    const products = await this.prisma.product.findMany({
      where: { catalogProductId: productId, trackInventory: true },
      select: { id: true, sku: true, name: true, catalogProductId: true, stockQuantity: true, isActive: true },
      orderBy: { id: 'asc' },
    });

    const attempt = await this.createWarehouseAttempt(event, targetQuantity, products);
    if ((TERMINAL_STATUSES as readonly string[]).includes(attempt.status)) {
      this.logger.log(`Warehouse stock sync idempotency hit for ${productId}: ${attempt.status}`, 'StockEventsSubscriber');
      return;
    }

    if (products.length === 0) {
      await prismaAny.flipflopStockSyncAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'BLOCKED',
          completedAt: new Date(),
          blockedReasons: [{ gate: 'linked-product', reason: 'No trackInventory FlipFlop products linked by catalogProductId' }],
          remediationContext: { nextAction: 'Link the Catalog product to a FlipFlop product before Warehouse stock events can mirror sellability.' },
        },
      });
      this.logger.warn(`No FlipFlop products found with catalogProductId ${productId}`, 'StockEventsSubscriber');
      return;
    }

    await prismaAny.flipflopStockSyncAttempt.update({
      where: { id: attempt.id },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    const results: any[] = [];
    try {
      for (let index = 0; index < products.length; index += 1) {
        const product = products[index];
        if (index > 0) await this.sleep(this.rateLimitMs);

        const updated = await this.prisma.product.update({
          where: { id: product.id },
          data: {
            stockQuantity: targetQuantity,
            updatedAt: new Date(),
          },
          select: { id: true, sku: true, stockQuantity: true, isActive: true, updatedAt: true },
        });
        results.push(updated);
      }

      await prismaAny.flipflopStockSyncAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'SUCCEEDED',
          completedAt: new Date(),
          resultSnapshot: this.redact({
            updatedProducts: results,
            sellabilityPolicy: targetQuantity === 0
              ? 'stockQuantity=0; existing storefront/cart contract treats the listing as not sellable'
              : 'stockQuantity mirrors Warehouse available quantity',
          }),
        },
      });
      this.logger.log(`Updated ${results.length} FlipFlop product(s) stock to ${targetQuantity} for catalog product ${productId}`, 'StockEventsSubscriber');
    } catch (error: any) {
      await prismaAny.flipflopStockSyncAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          resultSnapshot: this.redact({ updatedProducts: results }),
          failureContext: this.redact({ code: error?.code || 'FLIPFLOP_STOCK_SYNC_FAILED', message: error?.message || 'Warehouse stock sync failed', details: error?.meta || null }),
          remediationContext: { nextAction: 'Review Warehouse event, linked product records, database availability, and retry with Warehouse as source of truth.' },
        },
      });
      throw error;
    }
  }

  private async createWarehouseAttempt(event: WarehouseStockEvent, targetQuantity: number, products: any[]) {
    const prismaAny = this.prisma as any;
    const idempotencyKey = this.buildIdempotencyKey(event, targetQuantity, products.map((product) => product.id));
    const existing = await prismaAny.flipflopStockSyncAttempt.findUnique({ where: { idempotencyKey } });
    if (existing) return existing;

    const now = new Date();
    return prismaAny.flipflopStockSyncAttempt.create({
      data: {
        status: 'QUEUED',
        idempotencyKey,
        eventType: event.type,
        eventId: event.eventId || null,
        warehouseProductId: event.productId || null,
        targetQuantity,
        matchedProductCount: products.length,
        requestPayload: this.redact(event),
        policySnapshot: {
          contractVersion: 'flipflop.warehouse-stock-orchestration.v1',
          sourceOfTruth: 'warehouse',
          triggers: ['stock.updated', 'stock.out'],
          triggerReceived: event.type,
          warehouseAvailableFieldUsed: event.type === 'stock.updated' ? 'available' : null,
          approvalRequired: false,
          approvalMode: 'automatic_execute',
          mutatesWarehouse: false,
          mutatesCatalog: false,
          mutatesFlipFlopProductCache: true,
          rateLimit: { scope: 'flipflop-product-cache-write', minIntervalMs: this.rateLimitMs, maxRequestsPerSecond: this.rateLimitMs >= 1000 ? 1 : null },
          zeroQuantityPolicy: 'set_flipflop_product_stockQuantity_to_0_so_existing_storefront_and_cart_contract_treats_product_as_not_sellable',
          unavailableFacts: ['[UNKNOWN: whether Warehouse getTotalAvailable includes reservations or only physical available stock]'],
        },
        queuedAt: now,
      },
    });
  }

  private requireAvailable(event: WarehouseStockEvent): number {
    const value = Number(event.available);
    if (!Number.isInteger(value) || value < 0) throw new Error(`stock.updated requires non-negative integer available, got ${event.available}`);
    return value;
  }

  private buildIdempotencyKey(event: WarehouseStockEvent, targetQuantity: number, productIds: string[]): string {
    return `ff-stock-wh-${createHash('sha256').update(this.stableStringify({ eventId: event.eventId || event.occurredAt || null, type: event.type, warehouseProductId: event.productId, targetQuantity, productIds })).digest('hex').slice(0, 48)}`;
  }

  private stableStringify(value: unknown): string {
    return JSON.stringify(this.sortJson(value));
  }

  private sortJson(value: any): any {
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map((item) => this.sortJson(item));
    if (!value || typeof value !== 'object') return value;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) sorted[key] = this.sortJson(value[key]);
    return sorted;
  }

  private redact(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((item) => this.redact(item));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => {
        const lowerKey = key.toLowerCase();
        if (SECRET_KEYS.some((secretKey) => lowerKey.includes(secretKey.toLowerCase()))) return [key, '[REDACTED]'];
        return [key, this.redact(item)];
      }));
    }
    return value;
  }

  private async ensureAttemptTable() {
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "flipflop_stock_sync_attempts" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "status" VARCHAR(50) NOT NULL,
        "idempotencyKey" VARCHAR(180) NOT NULL,
        "eventType" VARCHAR(50) NOT NULL,
        "eventId" VARCHAR(255),
        "warehouseProductId" VARCHAR(255),
        "targetQuantity" INTEGER NOT NULL,
        "matchedProductCount" INTEGER NOT NULL DEFAULT 0,
        "requestPayload" JSONB,
        "policySnapshot" JSONB NOT NULL,
        "blockedReasons" JSONB,
        "resultSnapshot" JSONB,
        "failureContext" JSONB,
        "remediationContext" JSONB,
        "queuedAt" TIMESTAMP(6),
        "startedAt" TIMESTAMP(6),
        "completedAt" TIMESTAMP(6),
        "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "flipflop_stock_sync_attempts_pkey" PRIMARY KEY ("id")
      );
    `);
    await this.prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "flipflop_stock_sync_attempts_idempotencyKey_key" ON "flipflop_stock_sync_attempts"("idempotencyKey");');
    await this.prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "IDX_flipflop_stock_sync_attempts_status" ON "flipflop_stock_sync_attempts"("status");');
    await this.prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "IDX_flipflop_stock_sync_attempts_warehouseProductId" ON "flipflop_stock_sync_attempts"("warehouseProductId");');
    await this.prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "IDX_flipflop_stock_sync_attempts_eventType" ON "flipflop_stock_sync_attempts"("eventType");');
    await this.prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "IDX_flipflop_stock_sync_attempts_createdAt" ON "flipflop_stock_sync_attempts"("createdAt");');
  }

  private sleep(ms: number): Promise<void> {
    return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
  }
}
