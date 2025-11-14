/**
 * Resilience Monitor
 * Tracks circuit breaker states, retry success rates, and fallback usage
 */

import { Injectable } from '@nestjs/common';
import { CircuitBreakerService, CircuitBreakerState } from './circuit-breaker.service';

export interface ResilienceMetrics {
  circuitBreakers: CircuitBreakerState[];
  retryStats: {
    [serviceName: string]: {
      totalAttempts: number;
      successfulRetries: number;
      failedRetries: number;
      successRate: number;
    };
  };
  fallbackStats: {
    [serviceName: string]: {
      totalFallbacks: number;
      queueFallbacks: number;
      storageFallbacks: number;
      logOnlyFallbacks: number;
    };
  };
  timestamp: string;
}

@Injectable()
export class ResilienceMonitor {
  private retryStats: Map<string, {
    totalAttempts: number;
    successfulRetries: number;
    failedRetries: number;
  }> = new Map();

  private fallbackStats: Map<string, {
    totalFallbacks: number;
    queueFallbacks: number;
    storageFallbacks: number;
    logOnlyFallbacks: number;
  }> = new Map();

  constructor(
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  /**
   * Record retry attempt
   */
  recordRetryAttempt(serviceName: string, success: boolean): void {
    const stats = this.retryStats.get(serviceName) || {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
    };

    stats.totalAttempts++;
    if (success) {
      stats.successfulRetries++;
    } else {
      stats.failedRetries++;
    }

    this.retryStats.set(serviceName, stats);
  }

  /**
   * Record fallback usage
   */
  recordFallback(serviceName: string, strategy: 'queue' | 'local-storage' | 'log-only' | 'degraded'): void {
    const stats = this.fallbackStats.get(serviceName) || {
      totalFallbacks: 0,
      queueFallbacks: 0,
      storageFallbacks: 0,
      logOnlyFallbacks: 0,
    };

    stats.totalFallbacks++;
    switch (strategy) {
      case 'queue':
        stats.queueFallbacks++;
        break;
      case 'local-storage':
        stats.storageFallbacks++;
        break;
      case 'log-only':
      case 'degraded':
        stats.logOnlyFallbacks++;
        break;
    }

    this.fallbackStats.set(serviceName, stats);
  }

  /**
   * Get all resilience metrics
   */
  getMetrics(): ResilienceMetrics {
    const circuitBreakers = this.circuitBreakerService.getAllStates();
    
    const retryStats: ResilienceMetrics['retryStats'] = {};
    for (const [serviceName, stats] of this.retryStats.entries()) {
      retryStats[serviceName] = {
        totalAttempts: stats.totalAttempts,
        successfulRetries: stats.successfulRetries,
        failedRetries: stats.failedRetries,
        successRate: stats.totalAttempts > 0
          ? (stats.successfulRetries / stats.totalAttempts) * 100
          : 0,
      };
    }

    const fallbackStats: ResilienceMetrics['fallbackStats'] = {};
    for (const [serviceName, stats] of this.fallbackStats.entries()) {
      fallbackStats[serviceName] = {
        totalFallbacks: stats.totalFallbacks,
        queueFallbacks: stats.queueFallbacks,
        storageFallbacks: stats.storageFallbacks,
        logOnlyFallbacks: stats.logOnlyFallbacks,
      };
    }

    return {
      circuitBreakers,
      retryStats,
      fallbackStats,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.retryStats.clear();
    this.fallbackStats.clear();
  }

  /**
   * Log resilience events
   */
  logEvent(event: string, details: any): void {
    console.log(`[ResilienceMonitor] ${event}:`, {
      timestamp: new Date().toISOString(),
      ...details,
    });
  }
}
