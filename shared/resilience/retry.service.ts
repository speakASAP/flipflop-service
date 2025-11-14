/**
 * Retry Service
 * Provides retry mechanism with exponential backoff
 */

import { Injectable } from '@nestjs/common';
import { getRetryConfig } from './resilience.config';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  exponentialFactor?: number;
  jitter?: number;
  retryable?: (error: any) => boolean;
}

@Injectable()
export class RetryService {
  /**
   * Execute a function with retry logic
   */
  async execute<T>(
    fn: () => Promise<T>,
    options?: RetryOptions,
  ): Promise<T> {
    const serviceName = 'default'; // Could be passed as parameter
    const config = getRetryConfig(serviceName);
    
    const maxRetries = options?.maxRetries ?? config.maxRetries;
    const initialDelay = options?.initialDelay ?? config.initialDelay;
    const maxDelay = options?.maxDelay ?? config.maxDelay;
    const exponentialFactor = options?.exponentialFactor ?? config.exponentialFactor;
    const jitter = options?.jitter ?? config.jitter;
    const retryable = options?.retryable ?? (() => true);

    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // Check if error is retryable
        if (!retryable(error)) {
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(
          initialDelay * Math.pow(exponentialFactor, attempt),
          maxDelay
        );
        
        const jitterAmount = Math.random() * jitter;
        const totalDelay = delay + jitterAmount;
        
        console.warn(
          `[Retry] Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${totalDelay.toFixed(0)}ms:`,
          error.message
        );
        
        await this.sleep(totalDelay);
      }
    }
    
    // All retries exhausted
    console.error(`[Retry] All ${maxRetries + 1} attempts failed`);
    throw lastError;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

