/**
 * Centralized Logger Utility (TypeScript)
 * Sends logs to logging-microservice and falls back to local file logging
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import * as os from 'os';

interface LoggerOptions {
  serviceName?: string;
  enableLocalLogging?: boolean;
  logDir?: string;
}

interface LogMetadata {
  [key: string]: any;
}

interface LogData {
  level: string;
  message: string;
  service: string;
  timestamp: string;
  metadata: LogMetadata & {
    pid: number;
    hostname: string;
  };
}

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export class Logger {
  private loggingServiceUrl: string;
  private logLevel: string;
  private timestampFormat: string;
  private serviceName: string;
  private enableLocalLogging: boolean;
  private logDir: string;
  private levels: Record<LogLevel, number>;
  private currentLevel: number;

  constructor(options: LoggerOptions = {}) {
    this.loggingServiceUrl = process.env.LOGGING_SERVICE_URL || 'http://logging-microservice:3009';
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.timestampFormat = process.env.LOG_TIMESTAMP_FORMAT || 'YYYY-MM-DD HH:mm:ss';
    this.serviceName = options.serviceName || process.env.SERVICE_NAME || 'e-commerce';
    this.enableLocalLogging = options.enableLocalLogging !== false;
    this.logDir = options.logDir || path.join(process.cwd(), 'logs');

    // Ensure log directory exists
    if (this.enableLocalLogging && !fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Log levels priority
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };

    this.currentLevel = this.levels[this.logLevel as LogLevel] || this.levels.info;
  }

  /**
   * Format timestamp
   */
  private formatTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Send log to logging-microservice with retry and circuit breaker
   */
  private async sendToLoggingService(level: LogLevel, message: string, metadata: LogMetadata = {}): Promise<void> {
    const logData: LogData = {
      level,
      message,
      service: this.serviceName,
      timestamp: this.formatTimestamp(),
      metadata: {
        ...metadata,
        pid: process.pid,
        hostname: os.hostname(),
      },
    };

    // Simple retry mechanism (max 2 retries)
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
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
          timeout: 5000, // 5 second timeout
        };

        await new Promise<void>((resolve, reject) => {
          const req = httpModule.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk;
            });
            res.on('end', () => {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                resolve();
              } else {
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

        // Success - return
        return;
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on last attempt
        if (attempt < maxRetries) {
          // Exponential backoff: 100ms, 200ms
          const delay = 100 * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    // All retries failed - throw to trigger fallback
    throw lastError || new Error('Logging service unavailable');
  }

  /**
   * Write log to local file
   */
  private writeToLocalFile(level: LogLevel, message: string, metadata: LogMetadata = {}): void {
    if (!this.enableLocalLogging) return;

    const timestamp = this.formatTimestamp();
    const logEntry = {
      timestamp,
      level,
      service: this.serviceName,
      message,
      metadata,
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    const logFile = path.join(this.logDir, `${level}.log`);
    const allLogFile = path.join(this.logDir, 'all.log');

    try {
      // Write to level-specific log file
      fs.appendFileSync(logFile, logLine, 'utf8');
      // Write to combined log file
      fs.appendFileSync(allLogFile, logLine, 'utf8');
    } catch (error) {
      // Fallback to console if file write fails
      console.error('Failed to write log to file:', error);
      console.log(logLine);
    }
  }

  /**
   * Log message
   */
  private async log(level: LogLevel, message: string, metadata: LogMetadata = {}): Promise<void> {
    const levelPriority = this.levels[level] ?? this.levels.info;

    // Check if log level is enabled
    if (levelPriority > this.currentLevel) {
      return;
    }

    // Try to send to logging service, fall back to local logging
    try {
      await this.sendToLoggingService(level, message, metadata);
    } catch (error) {
      // Fall back to local file logging if service is unavailable
      this.writeToLocalFile(level, message, metadata);
    }

    // Also output to console in development
    if (process.env.NODE_ENV === 'development') {
      const timestamp = this.formatTimestamp();
      const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.serviceName}]`;
      console.log(`${prefix} ${message}`, Object.keys(metadata).length > 0 ? metadata : '');
    }
  }

  /**
   * Error level logging
   */
  async error(message: string, metadata: LogMetadata = {}): Promise<void> {
    await this.log('error', message, metadata);
  }

  /**
   * Warn level logging
   */
  async warn(message: string, metadata: LogMetadata = {}): Promise<void> {
    await this.log('warn', message, metadata);
  }

  /**
   * Info level logging
   */
  async info(message: string, metadata: LogMetadata = {}): Promise<void> {
    await this.log('info', message, metadata);
  }

  /**
   * Debug level logging
   */
  async debug(message: string, metadata: LogMetadata = {}): Promise<void> {
    await this.log('debug', message, metadata);
  }
}

// Create default logger instance
const logger = new Logger();

// Export both class and instance
export default logger;
