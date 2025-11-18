import CircuitBreaker from 'opossum';
export interface CircuitBreakerOptions {
    timeout?: number;
    errorThresholdPercentage?: number;
    resetTimeout?: number;
    rollingCountTimeout?: number;
    rollingCountBuckets?: number;
}
export interface CircuitBreakerState {
    name: string;
    state: 'open' | 'closed' | 'half-open';
    failures: number;
    successes: number;
    lastFailureTime?: Date;
}
export declare class CircuitBreakerService {
    private breakers;
    create<T>(serviceName: string, fn: () => Promise<T>, options?: CircuitBreakerOptions): CircuitBreaker;
    getState(serviceName: string): CircuitBreakerState | null;
    getAllStates(): CircuitBreakerState[];
    reset(serviceName: string): void;
    isOpen(serviceName: string): boolean;
}
