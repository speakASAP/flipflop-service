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
exports.FallbackService = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs");
const path = require("path");
let FallbackService = class FallbackService {
    constructor() {
        this.queueDir = process.env.FALLBACK_QUEUE_DIR || path.join(process.cwd(), 'logs', 'queue');
        this.storageDir = process.env.FALLBACK_STORAGE_DIR || path.join(process.cwd(), 'logs', 'fallback');
        [this.queueDir, this.storageDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }
    async handleNotificationFallback(data, options) {
        const strategy = options?.strategy || 'queue';
        switch (strategy) {
            case 'queue':
                return this.queueNotification(data);
            case 'local-storage':
                return this.storeNotification(data);
            case 'log-only':
                return this.logNotification(data);
            case 'degraded':
                return this.degradedNotification(data);
            default:
                return this.queueNotification(data);
        }
    }
    async handleLoggingFallback(data, options) {
        const strategy = options?.strategy || 'local-storage';
        switch (strategy) {
            case 'local-storage':
                return this.storeLog(data);
            case 'log-only':
                return this.logToConsole(data);
            case 'degraded':
                return this.logToConsole(data);
            default:
                return this.storeLog(data);
        }
    }
    async queueNotification(data) {
        try {
            const queueFile = path.join(this.queueDir, `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.json`);
            const queueEntry = {
                timestamp: new Date().toISOString(),
                type: 'notification',
                data,
            };
            fs.writeFileSync(queueFile, JSON.stringify(queueEntry, null, 2), 'utf8');
            return {
                success: true,
                message: `Notification queued for retry: ${queueFile}`,
            };
        }
        catch (error) {
            console.error('[Fallback] Failed to queue notification:', error);
            return {
                success: false,
                message: `Failed to queue notification: ${error.message}`,
            };
        }
    }
    async storeNotification(data) {
        try {
            const storageFile = path.join(this.storageDir, `notification-${Date.now()}.json`);
            const storageEntry = {
                timestamp: new Date().toISOString(),
                type: 'notification',
                data,
            };
            fs.writeFileSync(storageFile, JSON.stringify(storageEntry, null, 2), 'utf8');
            return {
                success: true,
                message: `Notification stored locally: ${storageFile}`,
            };
        }
        catch (error) {
            console.error('[Fallback] Failed to store notification:', error);
            return {
                success: false,
                message: `Failed to store notification: ${error.message}`,
            };
        }
    }
    async logNotification(data) {
        console.warn('[Fallback] Notification service unavailable, logging only:', {
            type: data.type,
            recipient: data.recipient,
            timestamp: new Date().toISOString(),
        });
        return {
            success: true,
            message: 'Notification logged (service unavailable)',
        };
    }
    async degradedNotification(data) {
        console.warn('[Fallback] Notification service in degraded mode:', {
            type: data.type,
            recipient: data.recipient,
            timestamp: new Date().toISOString(),
        });
        return {
            success: true,
            message: 'Notification handled in degraded mode',
        };
    }
    async storeLog(data) {
        try {
            const logFile = path.join(this.storageDir, `log-${new Date().toISOString().split('T')[0]}.log`);
            const logEntry = {
                timestamp: new Date().toISOString(),
                ...data,
            };
            fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n', 'utf8');
            return {
                success: true,
                message: `Log stored locally: ${logFile}`,
            };
        }
        catch (error) {
            console.error('[Fallback] Failed to store log:', error);
            return {
                success: false,
                message: `Failed to store log: ${error.message}`,
            };
        }
    }
    async logToConsole(data) {
        console.log('[Fallback] Logging service unavailable, console output only:', data);
        return {
            success: true,
            message: 'Log output to console (service unavailable)',
        };
    }
    async processQueue() {
        let processed = 0;
        try {
            if (!fs.existsSync(this.queueDir)) {
                return 0;
            }
            const files = fs.readdirSync(this.queueDir)
                .filter(file => file.startsWith('notification-') && file.endsWith('.json'));
            for (const file of files) {
                const filePath = path.join(this.queueDir, file);
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const entry = JSON.parse(content);
                    console.info(`[Fallback] Processing queued notification: ${file}`);
                    fs.unlinkSync(filePath);
                    processed++;
                }
                catch (error) {
                    console.error(`[Fallback] Failed to process queue file ${file}:`, error);
                }
            }
        }
        catch (error) {
            console.error('[Fallback] Failed to process queue:', error);
        }
        return processed;
    }
};
exports.FallbackService = FallbackService;
exports.FallbackService = FallbackService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], FallbackService);
//# sourceMappingURL=fallback.service.js.map