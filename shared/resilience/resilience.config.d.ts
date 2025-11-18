export interface CircuitBreakerConfig {
    timeout: number;
    errorThresholdPercentage: number;
    resetTimeout: number;
    rollingCountTimeout: number;
    rollingCountBuckets: number;
}
export interface RetryConfig {
    maxRetries: number;
    initialDelay: number;
    maxDelay: number;
    exponentialFactor: number;
    jitter: number;
}
export interface ResilienceConfig {
    circuitBreaker: {
        [serviceName: string]: CircuitBreakerConfig;
    };
    retry: {
        [serviceName: string]: RetryConfig;
    };
    timeouts: {
        [serviceName: string]: number;
    };
    healthCheckIntervals: {
        [serviceName: string]: number;
    };
}
export declare const defaultResilienceConfig: ResilienceConfig;
export declare function getCircuitBreakerConfig(serviceName: string): CircuitBreakerConfig;
export declare function getRetryConfig(serviceName: string): RetryConfig;
export declare function getTimeout(serviceName: string): number;
