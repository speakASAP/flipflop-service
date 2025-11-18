"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultResilienceConfig = void 0;
exports.getCircuitBreakerConfig = getCircuitBreakerConfig;
exports.getRetryConfig = getRetryConfig;
exports.getTimeout = getTimeout;
exports.defaultResilienceConfig = {
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
function getCircuitBreakerConfig(serviceName) {
    const config = exports.defaultResilienceConfig.circuitBreaker[serviceName] ||
        exports.defaultResilienceConfig.circuitBreaker.default;
    return {
        timeout: parseInt(process.env[`CIRCUIT_BREAKER_${serviceName.toUpperCase().replace('-', '_')}_TIMEOUT`] || String(config.timeout), 10),
        errorThresholdPercentage: parseInt(process.env[`CIRCUIT_BREAKER_${serviceName.toUpperCase().replace('-', '_')}_ERROR_THRESHOLD`] || String(config.errorThresholdPercentage), 10),
        resetTimeout: parseInt(process.env[`CIRCUIT_BREAKER_${serviceName.toUpperCase().replace('-', '_')}_RESET_TIMEOUT`] || String(config.resetTimeout), 10),
        rollingCountTimeout: config.rollingCountTimeout,
        rollingCountBuckets: config.rollingCountBuckets,
    };
}
function getRetryConfig(serviceName) {
    const config = exports.defaultResilienceConfig.retry[serviceName] ||
        exports.defaultResilienceConfig.retry.default;
    return {
        maxRetries: parseInt(process.env[`RETRY_${serviceName.toUpperCase().replace('-', '_')}_MAX_RETRIES`] || String(config.maxRetries), 10),
        initialDelay: parseInt(process.env[`RETRY_${serviceName.toUpperCase().replace('-', '_')}_INITIAL_DELAY`] || String(config.initialDelay), 10),
        maxDelay: parseInt(process.env[`RETRY_${serviceName.toUpperCase().replace('-', '_')}_MAX_DELAY`] || String(config.maxDelay), 10),
        exponentialFactor: parseFloat(process.env[`RETRY_${serviceName.toUpperCase().replace('-', '_')}_EXPONENTIAL_FACTOR`] || String(config.exponentialFactor)),
        jitter: parseInt(process.env[`RETRY_${serviceName.toUpperCase().replace('-', '_')}_JITTER`] || String(config.jitter), 10),
    };
}
function getTimeout(serviceName) {
    const timeout = exports.defaultResilienceConfig.timeouts[serviceName] ||
        exports.defaultResilienceConfig.timeouts.default;
    return parseInt(process.env[`TIMEOUT_${serviceName.toUpperCase().replace('-', '_')}`] || String(timeout), 10);
}
//# sourceMappingURL=resilience.config.js.map