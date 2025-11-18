/**
 * Health Check Service
 * Provides health check functionality with dependency checking
 */

import { Injectable, Optional } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { PrismaService } from '../database/prisma.service';
import { CircuitBreakerService } from '../resilience/circuit-breaker.service';
import { ResilienceMonitor } from '../resilience/resilience.monitor';

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'unhealthy';
  timestamp: string;
  service: string;
  dependencies?: {
    database?: {
      status: 'ok' | 'error';
      message?: string;
    };
    logging?: {
      status: 'ok' | 'error';
      message?: string;
    };
    notification?: {
      status: 'ok' | 'error';
      message?: string;
    };
    auth?: {
      status: 'ok' | 'error';
      message?: string;
    };
    redis?: {
      status: 'ok' | 'error';
      message?: string;
    };
  };
  resilience?: {
    circuitBreakers?: Array<{
      name: string;
      state: 'open' | 'closed' | 'half-open';
      failures: number;
      successes: number;
    }>;
    retryStats?: {
      [serviceName: string]: {
        totalAttempts: number;
        successRate: number;
      };
    };
    fallbackStats?: {
      [serviceName: string]: {
        totalFallbacks: number;
      };
    };
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Optional() private readonly circuitBreakerService?: CircuitBreakerService,
    @Optional() private readonly resilienceMonitor?: ResilienceMonitor,
  ) {}

  /**
   * Check database connection health
   */
  async checkDatabase(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Database connection failed',
      };
    }
  }

  /**
   * Check logging service health
   */
  async checkLoggingService(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    try {
      const loggingServiceUrl =
        this.configService.get<string>('LOGGING_SERVICE_URL') ||
        'https://logging.statex.cz';
      const url = loggingServiceUrl.replace('/api/logs', '/health');

      const response = await firstValueFrom(
        this.httpService.get(url).pipe(
          timeout(3000),
          catchError(() => {
            throw new Error('Logging service unavailable');
          }),
        ),
      );

      if (response.data?.success || response.data?.status === 'ok') {
        return { status: 'ok' };
      }

      return {
        status: 'error',
        message: 'Logging service returned unhealthy status',
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Logging service unavailable',
      };
    }
  }

  /**
   * Check notification service health
   */
  async checkNotificationService(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    try {
      const notificationServiceUrl =
        this.configService.get<string>('NOTIFICATION_SERVICE_URL') ||
        'https://notifications.statex.cz';

      const response = await firstValueFrom(
        this.httpService.get(`${notificationServiceUrl}/health`).pipe(
          timeout(3000),
          catchError(() => {
            throw new Error('Notification service unavailable');
          }),
        ),
      );

      if (response.data?.success || response.data?.status === 'ok') {
        return { status: 'ok' };
      }

      return {
        status: 'error',
        message: 'Notification service returned unhealthy status',
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Notification service unavailable',
      };
    }
  }

  /**
   * Check auth service health
   */
  async checkAuthService(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    try {
      const authServiceUrl =
        this.configService.get<string>('AUTH_SERVICE_URL') ||
        'https://auth.statex.cz';

      const response = await firstValueFrom(
        this.httpService.get(`${authServiceUrl}/health`).pipe(
          timeout(3000),
          catchError(() => {
            throw new Error('Auth service unavailable');
          }),
        ),
      );

      if (response.data?.success || response.data?.status === 'ok') {
        return { status: 'ok' };
      }

      return {
        status: 'error',
        message: 'Auth service returned unhealthy status',
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message || 'Auth service unavailable',
      };
    }
  }

  /**
   * Check Redis connection health
   */
  async checkRedis(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    // Redis check would require Redis client
    // For now, return ok if Redis is not critical
    // Can be enhanced when Redis module is used
    return { status: 'ok' };
  }

  /**
   * Get comprehensive health status
   */
  async getHealthStatus(serviceName: string): Promise<HealthStatus> {
    const dependencies: HealthStatus['dependencies'] = {};
    let overallStatus: 'ok' | 'degraded' | 'unhealthy' = 'ok';

    // Check database (critical)
    const dbHealth = await this.checkDatabase();
    dependencies.database = dbHealth;
    if (dbHealth.status === 'error') {
      overallStatus = 'unhealthy';
    }

    // Check logging service (non-critical)
    try {
      dependencies.logging = await this.checkLoggingService();
      if (dependencies.logging.status === 'error' && overallStatus === 'ok') {
        overallStatus = 'degraded';
      }
    } catch (error) {
      dependencies.logging = { status: 'error', message: 'Check failed' };
      if (overallStatus === 'ok') {
        overallStatus = 'degraded';
      }
    }

    // Check notification service (non-critical, only for order-service)
    if (serviceName === 'order-service') {
      try {
        dependencies.notification = await this.checkNotificationService();
        if (dependencies.notification.status === 'error' && overallStatus === 'ok') {
          overallStatus = 'degraded';
        }
      } catch (error) {
        dependencies.notification = { status: 'error', message: 'Check failed' };
        if (overallStatus === 'ok') {
          overallStatus = 'degraded';
        }
      }
    }

    // Check auth service (critical for user-service, non-critical for others)
    try {
      dependencies.auth = await this.checkAuthService();
      if (dependencies.auth.status === 'error') {
        if (serviceName === 'user-service') {
          overallStatus = 'unhealthy';
        } else if (overallStatus === 'ok') {
          overallStatus = 'degraded';
        }
      }
    } catch (error) {
      dependencies.auth = { status: 'error', message: 'Check failed' };
      if (serviceName === 'user-service') {
        overallStatus = 'unhealthy';
      } else if (overallStatus === 'ok') {
        overallStatus = 'degraded';
      }
    }

    // Add resilience metrics if available
    const resilience: HealthStatus['resilience'] = {};
    
    if (this.circuitBreakerService && this.resilienceMonitor) {
      const metrics = this.resilienceMonitor.getMetrics();
      
      resilience.circuitBreakers = metrics.circuitBreakers.map(cb => ({
        name: cb.name,
        state: cb.state,
        failures: cb.failures,
        successes: cb.successes,
      }));
      
      resilience.retryStats = {};
      for (const [serviceName, stats] of Object.entries(metrics.retryStats)) {
        resilience.retryStats[serviceName] = {
          totalAttempts: stats.totalAttempts,
          successRate: stats.successRate,
        };
      }
      
      resilience.fallbackStats = {};
      for (const [serviceName, stats] of Object.entries(metrics.fallbackStats)) {
        resilience.fallbackStats[serviceName] = {
          totalFallbacks: stats.totalFallbacks,
        };
      }
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: serviceName,
      dependencies,
      resilience: Object.keys(resilience).length > 0 ? resilience : undefined,
    };
  }
}
