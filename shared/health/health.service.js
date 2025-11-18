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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const circuit_breaker_service_1 = require("../resilience/circuit-breaker.service");
const resilience_monitor_1 = require("../resilience/resilience.monitor");
let HealthService = class HealthService {
    constructor(connection, httpService, configService, circuitBreakerService, resilienceMonitor) {
        this.connection = connection;
        this.httpService = httpService;
        this.configService = configService;
        this.circuitBreakerService = circuitBreakerService;
        this.resilienceMonitor = resilienceMonitor;
    }
    async checkDatabase() {
        try {
            await this.connection.query('SELECT 1');
            return { status: 'ok' };
        }
        catch (error) {
            return {
                status: 'error',
                message: error.message || 'Database connection failed',
            };
        }
    }
    async checkLoggingService() {
        try {
            const loggingServiceUrl = this.configService.get('LOGGING_SERVICE_URL') ||
                'https://logging.statex.cz';
            const url = loggingServiceUrl.replace('/api/logs', '/health');
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(url).pipe((0, operators_1.timeout)(3000), (0, operators_1.catchError)(() => {
                throw new Error('Logging service unavailable');
            })));
            if (response.data?.success || response.data?.status === 'ok') {
                return { status: 'ok' };
            }
            return {
                status: 'error',
                message: 'Logging service returned unhealthy status',
            };
        }
        catch (error) {
            return {
                status: 'error',
                message: error.message || 'Logging service unavailable',
            };
        }
    }
    async checkNotificationService() {
        try {
            const notificationServiceUrl = this.configService.get('NOTIFICATION_SERVICE_URL') ||
                'https://notifications.statex.cz';
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${notificationServiceUrl}/health`).pipe((0, operators_1.timeout)(3000), (0, operators_1.catchError)(() => {
                throw new Error('Notification service unavailable');
            })));
            if (response.data?.success || response.data?.status === 'ok') {
                return { status: 'ok' };
            }
            return {
                status: 'error',
                message: 'Notification service returned unhealthy status',
            };
        }
        catch (error) {
            return {
                status: 'error',
                message: error.message || 'Notification service unavailable',
            };
        }
    }
    async checkRedis() {
        return { status: 'ok' };
    }
    async getHealthStatus(serviceName) {
        const dependencies = {};
        let overallStatus = 'ok';
        const dbHealth = await this.checkDatabase();
        dependencies.database = dbHealth;
        if (dbHealth.status === 'error') {
            overallStatus = 'unhealthy';
        }
        try {
            dependencies.logging = await this.checkLoggingService();
            if (dependencies.logging.status === 'error' && overallStatus === 'ok') {
                overallStatus = 'degraded';
            }
        }
        catch (error) {
            dependencies.logging = { status: 'error', message: 'Check failed' };
            if (overallStatus === 'ok') {
                overallStatus = 'degraded';
            }
        }
        if (serviceName === 'order-service') {
            try {
                dependencies.notification = await this.checkNotificationService();
                if (dependencies.notification.status === 'error' && overallStatus === 'ok') {
                    overallStatus = 'degraded';
                }
            }
            catch (error) {
                dependencies.notification = { status: 'error', message: 'Check failed' };
                if (overallStatus === 'ok') {
                    overallStatus = 'degraded';
                }
            }
        }
        const resilience = {};
        if (this.circuitBreakerService && this.resilienceMonitor) {
            const metrics = this.resilienceMonitor.getMetrics();
            resilience.circuitBreakers = metrics.circuitBreakers.map(cb => ({
                name: cb.name,
                state: cb.state,
                failures: cb.failures,
                successes: cb.successes,
            }));
            resilience.retryStats = {};
            for (const [serviceName, stats] of Object.entries(metrics.retryStats)) {
                resilience.retryStats[serviceName] = {
                    totalAttempts: stats.totalAttempts,
                    successRate: stats.successRate,
                };
            }
            resilience.fallbackStats = {};
            for (const [serviceName, stats] of Object.entries(metrics.fallbackStats)) {
                resilience.fallbackStats[serviceName] = {
                    totalFallbacks: stats.totalFallbacks,
                };
            }
        }
        return {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            service: serviceName,
            dependencies,
            resilience: Object.keys(resilience).length > 0 ? resilience : undefined,
        };
    }
};
exports.HealthService = HealthService;
exports.HealthService = HealthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectConnection)()),
    __param(3, (0, common_1.Optional)()),
    __param(4, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [typeorm_2.Connection,
        axios_1.HttpService,
        config_1.ConfigService,
        circuit_breaker_service_1.CircuitBreakerService,
        resilience_monitor_1.ResilienceMonitor])
], HealthService);
//# sourceMappingURL=health.service.js.map