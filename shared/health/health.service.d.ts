import { Connection } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
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
export declare class HealthService {
    private readonly connection;
    private readonly httpService;
    private readonly configService;
    private readonly circuitBreakerService?;
    private readonly resilienceMonitor?;
    constructor(connection: Connection, httpService: HttpService, configService: ConfigService, circuitBreakerService?: CircuitBreakerService, resilienceMonitor?: ResilienceMonitor);
    checkDatabase(): Promise<{
        status: 'ok' | 'error';
        message?: string;
    }>;
    checkLoggingService(): Promise<{
        status: 'ok' | 'error';
        message?: string;
    }>;
    checkNotificationService(): Promise<{
        status: 'ok' | 'error';
        message?: string;
    }>;
    checkRedis(): Promise<{
        status: 'ok' | 'error';
        message?: string;
    }>;
    getHealthStatus(serviceName: string): Promise<HealthStatus>;
}
