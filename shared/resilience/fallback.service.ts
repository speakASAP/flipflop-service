/**
 * Fallback Service
 * Provides fallback strategies for service calls
 */

import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export type FallbackStrategy = 'queue' | 'local-storage' | 'degraded' | 'log-only';

export interface FallbackOptions {
  strategy?: FallbackStrategy;
  queuePath?: string;
  storagePath?: string;
}

@Injectable()
export class FallbackService {
  private queueDir: string;
  private storageDir: string;

  constructor() {
    this.queueDir = process.env.FALLBACK_QUEUE_DIR || path.join(process.cwd(), 'logs', 'queue');
    this.storageDir = process.env.FALLBACK_STORAGE_DIR || path.join(process.cwd(), 'logs', 'fallback');
    
    // Ensure directories exist
    [this.queueDir, this.storageDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Execute fallback strategy for notification service
   */
  async handleNotificationFallback(
    data: any,
    options?: FallbackOptions,
  ): Promise<{ success: boolean; message: string }> {
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

  /**
   * Execute fallback strategy for logging service
   */
  async handleLoggingFallback(
    data: any,
    options?: FallbackOptions,
  ): Promise<{ success: boolean; message: string }> {
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

  /**
   * Queue notification for later retry
   */
  private async queueNotification(data: any): Promise<{ success: boolean; message: string }> {
    try {
      const queueFile = path.join(
        this.queueDir,
        `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.json`
      );
      
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
    } catch (error: any) {
      console.error('[Fallback] Failed to queue notification:', error);
      return {
        success: false,
        message: `Failed to queue notification: ${error.message}`,
      };
    }
  }

  /**
   * Store notification locally
   */
  private async storeNotification(data: any): Promise<{ success: boolean; message: string }> {
    try {
      const storageFile = path.join(
        this.storageDir,
        `notification-${Date.now()}.json`
      );
      
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
    } catch (error: any) {
      console.error('[Fallback] Failed to store notification:', error);
      return {
        success: false,
        message: `Failed to store notification: ${error.message}`,
      };
    }
  }

  /**
   * Log notification only
   */
  private async logNotification(data: any): Promise<{ success: boolean; message: string }> {
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

  /**
   * Degraded mode notification
   */
  private async degradedNotification(data: any): Promise<{ success: boolean; message: string }> {
    // In degraded mode, we accept the failure but log it
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

  /**
   * Store log locally
   */
  private async storeLog(data: any): Promise<{ success: boolean; message: string }> {
    try {
      const logFile = path.join(
        this.storageDir,
        `log-${new Date().toISOString().split('T')[0]}.log`
      );
      
      const logEntry = {
        timestamp: new Date().toISOString(),
        ...data,
      };
      
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n', 'utf8');
      
      return {
        success: true,
        message: `Log stored locally: ${logFile}`,
      };
    } catch (error: any) {
      console.error('[Fallback] Failed to store log:', error);
      return {
        success: false,
        message: `Failed to store log: ${error.message}`,
      };
    }
  }

  /**
   * Log to console only
   */
  private async logToConsole(data: any): Promise<{ success: boolean; message: string }> {
    console.log('[Fallback] Logging service unavailable, console output only:', data);
    
    return {
      success: true,
      message: 'Log output to console (service unavailable)',
    };
  }

  /**
   * Process queued notifications (for retry)
   */
  async processQueue(): Promise<number> {
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
          
          // Here you would retry sending the notification
          // For now, we'll just mark it as processed
          console.info(`[Fallback] Processing queued notification: ${file}`);
          
          // Move to processed directory or delete
          fs.unlinkSync(filePath);
          processed++;
        } catch (error) {
          console.error(`[Fallback] Failed to process queue file ${file}:`, error);
        }
      }
    } catch (error) {
      console.error('[Fallback] Failed to process queue:', error);
    }
    
    return processed;
  }
}

