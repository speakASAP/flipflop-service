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
export declare class ResilienceMonitor {
    private readonly circuitBreakerService;
    private retryStats;
    private fallbackStats;
    constructor(circuitBreakerService: CircuitBreakerService);
    recordRetryAttempt(serviceName: string, success: boolean): void;
    recordFallback(serviceName: string, strategy: 'queue' | 'local-storage' | 'log-only' | 'degraded'): void;
    getMetrics(): ResilienceMetrics;
    resetMetrics(): void;
    logEvent(event: string, details: any): void;
}
