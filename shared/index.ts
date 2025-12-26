/**
 * Shared Module Index
 * Export all shared utilities, types, and modules
 */

// Database
export * from './database/prisma.module';
export * from './database/prisma.service';
// Export Prisma types
export { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';

// Redis
export * from './redis/redis.config';
export * from './redis/redis.module';

// Logger
export * from './logger/logger.module';
export * from './logger/logger.service';

// Notifications
export * from './notifications/notification.module';
export * from './notifications/notification.service';
export * from './notifications/notification.interface';

// Auth
export * from './auth/auth.module';
export * from './auth/auth.service';
export * from './auth/auth.interface';
export * from './auth/jwt-auth.guard';

// Payments
export * from './payments/payment.module';
export * from './payments/payment.service';
export * from './payments/payment.interface';

// Types
export * from './types/common.types';

// Interfaces
export * from './interfaces/logger.interface';

// Utils
export * from './utils/api-response.util';
export * from './utils/error-handler.util';

// Export ApiResponse helper
export { ApiResponseUtil as ApiResponse } from './utils/api-response.util';

// Health
export * from './health/health.module';
export * from './health/health.service';

// Resilience
export * from './resilience/resilience.module';
export * from './resilience/circuit-breaker.service';
export * from './resilience/retry.service';
export * from './resilience/fallback.service';
export * from './resilience/resilience.monitor';
export * from './resilience/resilience.config';

// Central Microservices Clients
export { ClientsModule } from './clients/clients.module';
export * from './clients/catalog-client.service';
export * from './clients/warehouse-client.service';
export * from './clients/order-client.service';

// RabbitMQ
export * from './rabbitmq/rabbitmq.module';
export * from './rabbitmq/stock-events.subscriber';
