"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResilienceMonitor = void 0;
const common_1 = require("@nestjs/common");
const circuit_breaker_service_1 = require("./circuit-breaker.service");
let ResilienceMonitor = class ResilienceMonitor {
    constructor(circuitBreakerService) {
        this.circuitBreakerService = circuitBreakerService;
        this.retryStats = new Map();
        this.fallbackStats = new Map();
    }
    recordRetryAttempt(serviceName, success) {
        const stats = this.retryStats.get(serviceName) || {
            totalAttempts: 0,
            successfulRetries: 0,
            failedRetries: 0,
        };
        stats.totalAttempts++;
        if (success) {
            stats.successfulRetries++;
        }
        else {
            stats.failedRetries++;
        }
        this.retryStats.set(serviceName, stats);
    }
    recordFallback(serviceName, strategy) {
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
    getMetrics() {
        const circuitBreakers = this.circuitBreakerService.getAllStates();
        const retryStats = {};
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
        const fallbackStats = {};
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
    resetMetrics() {
        this.retryStats.clear();
        this.fallbackStats.clear();
    }
    logEvent(event, details) {
        console.log(`[ResilienceMonitor] ${event}:`, {
            timestamp: new Date().toISOString(),
            ...details,
        });
    }
};
exports.ResilienceMonitor = ResilienceMonitor;
exports.ResilienceMonitor = ResilienceMonitor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [circuit_breaker_service_1.CircuitBreakerService])
], ResilienceMonitor);
//# sourceMappingURL=resilience.monitor.js.map