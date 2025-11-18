"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreakerService = void 0;
const common_1 = require("@nestjs/common");
const opossum_1 = require("opossum");
const resilience_config_1 = require("./resilience.config");
let CircuitBreakerService = class CircuitBreakerService {
    constructor() {
        this.breakers = new Map();
    }
    create(serviceName, fn, options) {
        if (this.breakers.has(serviceName)) {
            return this.breakers.get(serviceName);
        }
        const config = (0, resilience_config_1.getCircuitBreakerConfig)(serviceName);
        const breakerOptions = {
            timeout: options?.timeout ?? config.timeout,
            errorThresholdPercentage: options?.errorThresholdPercentage ?? config.errorThresholdPercentage,
            resetTimeout: options?.resetTimeout ?? config.resetTimeout,
            rollingCountTimeout: options?.rollingCountTimeout ?? config.rollingCountTimeout,
            rollingCountBuckets: options?.rollingCountBuckets ?? config.rollingCountBuckets,
        };
        const breaker = new opossum_1.default(fn, breakerOptions);
        breaker.on('open', () => {
            console.warn(`[CircuitBreaker] ${serviceName} circuit opened`);
        });
        breaker.on('halfOpen', () => {
            console.info(`[CircuitBreaker] ${serviceName} circuit half-open`);
        });
        breaker.on('close', () => {
            console.info(`[CircuitBreaker] ${serviceName} circuit closed`);
        });
        breaker.on('failure', (error) => {
            console.error(`[CircuitBreaker] ${serviceName} failure:`, error.message);
        });
        breaker.on('success', () => {
            console.debug(`[CircuitBreaker] ${serviceName} success`);
        });
        this.breakers.set(serviceName, breaker);
        return breaker;
    }
    getState(serviceName) {
        const breaker = this.breakers.get(serviceName);
        if (!breaker) {
            return null;
        }
        const stats = breaker.stats;
        return {
            name: serviceName,
            state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
            failures: stats.failures,
            successes: stats.successes,
            lastFailureTime: stats.failures > 0 ? new Date() : undefined,
        };
    }
    getAllStates() {
        const states = [];
        for (const [name, breaker] of this.breakers.entries()) {
            const stats = breaker.stats;
            states.push({
                name,
                state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
                failures: stats.failures,
                successes: stats.successes,
                lastFailureTime: stats.failures > 0 ? new Date() : undefined,
            });
        }
        return states;
    }
    reset(serviceName) {
        const breaker = this.breakers.get(serviceName);
        if (breaker) {
            breaker.close();
        }
    }
    isOpen(serviceName) {
        const breaker = this.breakers.get(serviceName);
        return breaker ? breaker.opened : false;
    }
};
exports.CircuitBreakerService = CircuitBreakerService;
exports.CircuitBreakerService = CircuitBreakerService = __decorate([
    (0, common_1.Injectable)()
], CircuitBreakerService);
//# sourceMappingURL=circuit-breaker.service.js.map