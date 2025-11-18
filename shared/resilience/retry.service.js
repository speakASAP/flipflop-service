"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryService = void 0;
const common_1 = require("@nestjs/common");
const resilience_config_1 = require("./resilience.config");
let RetryService = class RetryService {
    async execute(fn, options) {
        const serviceName = 'default';
        const config = (0, resilience_config_1.getRetryConfig)(serviceName);
        const maxRetries = options?.maxRetries ?? config.maxRetries;
        const initialDelay = options?.initialDelay ?? config.initialDelay;
        const maxDelay = options?.maxDelay ?? config.maxDelay;
        const exponentialFactor = options?.exponentialFactor ?? config.exponentialFactor;
        const jitter = options?.jitter ?? config.jitter;
        const retryable = options?.retryable ?? (() => true);
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error;
                if (!retryable(error)) {
                    throw error;
                }
                if (attempt === maxRetries) {
                    break;
                }
                const delay = Math.min(initialDelay * Math.pow(exponentialFactor, attempt), maxDelay);
                const jitterAmount = Math.random() * jitter;
                const totalDelay = delay + jitterAmount;
                console.warn(`[Retry] Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${totalDelay.toFixed(0)}ms:`, error.message);
                await this.sleep(totalDelay);
            }
        }
        console.error(`[Retry] All ${maxRetries + 1} attempts failed`);
        throw lastError;
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
exports.RetryService = RetryService;
exports.RetryService = RetryService = __decorate([
    (0, common_1.Injectable)()
], RetryService);
//# sourceMappingURL=retry.service.js.map