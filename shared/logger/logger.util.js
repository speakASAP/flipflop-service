"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const os = require("os");
class Logger {
    constructor(options = {}) {
        this.loggingServiceUrl = process.env.LOGGING_SERVICE_URL ||
            (process.env.NODE_ENV === 'production'
                ? 'https://logging.statex.cz'
                : 'http://logging-microservice:3268');
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.timestampFormat = process.env.LOG_TIMESTAMP_FORMAT || 'YYYY-MM-DD HH:mm:ss';
        this.serviceName = options.serviceName || process.env.SERVICE_NAME || 'e-commerce';
        this.enableLocalLogging = options.enableLocalLogging !== false;
        this.logDir = options.logDir || path.join(process.cwd(), 'logs');
        if (this.enableLocalLogging && !fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3,
        };
        this.currentLevel = this.levels[this.logLevel] || this.levels.info;
    }
    formatTimestamp() {
        return new Date().toISOString();
    }
    formatTimestampLocal() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    captureStackTrace() {
        const error = new Error();
        if (error.stack) {
            const lines = error.stack.split('\n');
            return lines.slice(2).join('\n');
        }
        return undefined;
    }
    sendToLoggingService(level, message, metadata = {}) {
        const enhancedMetadata = { ...metadata };
        if (level === 'error' && !enhancedMetadata.stack) {
            const stack = this.captureStackTrace();
            if (stack) {
                enhancedMetadata.stack = stack;
            }
        }
        const logData = {
            level,
            message,
            service: this.serviceName,
            timestamp: this.formatTimestamp(),
            metadata: {
                ...enhancedMetadata,
                pid: process.pid,
                hostname: os.hostname(),
            },
        };
        setImmediate(() => {
            this.sendToLoggingServiceAsync(logData).catch((error) => {
                if (process.env.NODE_ENV === 'development') {
                    console.error('Failed to send log to logging service:', error.message);
                }
            });
        });
    }
    async sendToLoggingServiceAsync(logData) {
        try {
            const url = new URL(`${this.loggingServiceUrl}/api/logs`);
            const isHttps = url.protocol === 'https:';
            const httpModule = isHttps ? https : http;
            const postData = JSON.stringify(logData);
            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                },
                timeout: 5000,
            };
            await new Promise((resolve, reject) => {
                const req = httpModule.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => {
                        data += chunk;
                    });
                    res.on('end', () => {
                        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                            resolve();
                        }
                        else {
                            reject(new Error(`Logging service returned ${res.statusCode}`));
                        }
                    });
                });
                req.on('error', (error) => {
                    reject(error);
                });
                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('Request timeout'));
                });
                req.write(postData);
                req.end();
            });
        }
        catch (error) {
            throw error;
        }
    }
    writeToLocalFile(level, message, metadata = {}) {
        if (!this.enableLocalLogging)
            return;
        const enhancedMetadata = { ...metadata };
        if (level === 'error' && !enhancedMetadata.stack) {
            const stack = this.captureStackTrace();
            if (stack) {
                enhancedMetadata.stack = stack;
            }
        }
        const timestamp = this.formatTimestampLocal();
        const logEntry = {
            timestamp,
            level,
            service: this.serviceName,
            message,
            metadata: enhancedMetadata,
        };
        const logLine = JSON.stringify(logEntry) + '\n';
        const logFile = path.join(this.logDir, `${level}.log`);
        const allLogFile = path.join(this.logDir, 'all.log');
        try {
            fs.appendFileSync(logFile, logLine, 'utf8');
            fs.appendFileSync(allLogFile, logLine, 'utf8');
        }
        catch (error) {
            console.error('Failed to write log to file:', error);
            console.log(logLine);
        }
    }
    async log(level, message, metadata = {}) {
        const levelPriority = this.levels[level] ?? this.levels.info;
        if (levelPriority > this.currentLevel) {
            return;
        }
        this.writeToLocalFile(level, message, metadata);
        this.sendToLoggingService(level, message, metadata);
        if (process.env.NODE_ENV === 'development') {
            const timestamp = this.formatTimestampLocal();
            const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.serviceName}]`;
            console.log(`${prefix} ${message}`, Object.keys(metadata).length > 0 ? metadata : '');
        }
    }
    async error(message, metadata = {}) {
        await this.log('error', message, metadata);
    }
    async warn(message, metadata = {}) {
        await this.log('warn', message, metadata);
    }
    async info(message, metadata = {}) {
        await this.log('info', message, metadata);
    }
    async debug(message, metadata = {}) {
        await this.log('debug', message, metadata);
    }
}
exports.Logger = Logger;
const logger = new Logger();
exports.default = logger;
//# sourceMappingURL=logger.util.js.map