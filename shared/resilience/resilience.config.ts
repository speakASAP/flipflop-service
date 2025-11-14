/**
 * Resilience Configuration
 * Centralized configuration for all resilience patterns
 */

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

/**
 * Default resilience configuration
 */
export const defaultResilienceConfig: ResilienceConfig = {
  circuitBreaker: {
    'notification-service': {
      timeout: 10000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      rollingCountTimeout: 60000,
      rollingCountBuckets: 10,
    },
    'logging-service': {
      timeout: 5000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      rollingCountTimeout: 60000,
      rollingCountBuckets: 10,
    },
    default: {
      timeout: 10000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      rollingCountTimeout: 60000,
      rollingCountBuckets: 10,
    },
  },
  retry: {
    'notification-service': {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      exponentialFactor: 2,
      jitter: 200,
    },
    'logging-service': {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      exponentialFactor: 2,
      jitter: 200,
    },
    default: {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      exponentialFactor: 2,
      jitter: 200,
    },
  },
  timeouts: {
    'notification-service': 10000,
    'logging-service': 5000,
    default: 10000,
  },
  healthCheckIntervals: {
    'notification-service': 30000,
    'logging-service': 30000,
    default: 30000,
  },
};

/**
 * Get circuit breaker configuration for a service
 */
export function getCircuitBreakerConfig(serviceName: string): CircuitBreakerConfig {
  const config = defaultResilienceConfig.circuitBreaker[serviceName] ||
    defaultResilienceConfig.circuitBreaker.default;
  
  // Allow environment variable overrides
  return {
    timeout: parseInt(process.env[`CIRCUIT_BREAKER_${serviceName.toUpperCase().replace('-', '_')}_TIMEOUT`] || String(config.timeout), 10),
    errorThresholdPercentage: parseInt(process.env[`CIRCUIT_BREAKER_${serviceName.toUpperCase().replace('-', '_')}_ERROR_THRESHOLD`] || String(config.errorThresholdPercentage), 10),
    resetTimeout: parseInt(process.env[`CIRCUIT_BREAKER_${serviceName.toUpperCase().replace('-', '_')}_RESET_TIMEOUT`] || String(config.resetTimeout), 10),
    rollingCountTimeout: config.rollingCountTimeout,
    rollingCountBuckets: config.rollingCountBuckets,
  };
}

/**
 * Get retry configuration for a service
 */
export function getRetryConfig(serviceName: string): RetryConfig {
  const config = defaultResilienceConfig.retry[serviceName] ||
    defaultResilienceConfig.retry.default;
  
  // Allow environment variable overrides
  return {
    maxRetries: parseInt(process.env[`RETRY_${serviceName.toUpperCase().replace('-', '_')}_MAX_RETRIES`] || String(config.maxRetries), 10),
    initialDelay: parseInt(process.env[`RETRY_${serviceName.toUpperCase().replace('-', '_')}_INITIAL_DELAY`] || String(config.initialDelay), 10),
    maxDelay: parseInt(process.env[`RETRY_${serviceName.toUpperCase().replace('-', '_')}_MAX_DELAY`] || String(config.maxDelay), 10),
    exponentialFactor: parseFloat(process.env[`RETRY_${serviceName.toUpperCase().replace('-', '_')}_EXPONENTIAL_FACTOR`] || String(config.exponentialFactor)),
    jitter: parseInt(process.env[`RETRY_${serviceName.toUpperCase().replace('-', '_')}_JITTER`] || String(config.jitter), 10),
  };
}

/**
 * Get timeout for a service
 */
export function getTimeout(serviceName: string): number {
  const timeout = defaultResilienceConfig.timeouts[serviceName] ||
    defaultResilienceConfig.timeouts.default;
  
  return parseInt(
    process.env[`TIMEOUT_${serviceName.toUpperCase().replace('-', '_')}`] || String(timeout),
    10
  );
}

