"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResilienceModule = void 0;
const common_1 = require("@nestjs/common");
const circuit_breaker_service_1 = require("./circuit-breaker.service");
const retry_service_1 = require("./retry.service");
const fallback_service_1 = require("./fallback.service");
const resilience_monitor_1 = require("./resilience.monitor");
let ResilienceModule = class ResilienceModule {
};
exports.ResilienceModule = ResilienceModule;
exports.ResilienceModule = ResilienceModule = __decorate([
    (0, common_1.Module)({
        providers: [
            circuit_breaker_service_1.CircuitBreakerService,
            retry_service_1.RetryService,
            fallback_service_1.FallbackService,
            resilience_monitor_1.ResilienceMonitor,
        ],
        exports: [
            circuit_breaker_service_1.CircuitBreakerService,
            retry_service_1.RetryService,
            fallback_service_1.FallbackService,
            resilience_monitor_1.ResilienceMonitor,
        ],
    })
], ResilienceModule);
//# sourceMappingURL=resilience.module.js.map