export interface RetryOptions {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    exponentialFactor?: number;
    jitter?: number;
    retryable?: (error: any) => boolean;
}
export declare class RetryService {
    execute<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
    private sleep;
}
