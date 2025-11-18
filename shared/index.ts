/**
 * Shared Module Index
 * Export all shared utilities, types, and modules
 */

// Database
export * from './database/database.config';
export * from './database/database.module';

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

// Entities
export * from './entities';

// Types
export * from './types/common.types';

// Interfaces
export * from './interfaces/logger.interface';

// Utils
export * from './utils/api-response.util';
export * from './utils/error-handler.util';

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
