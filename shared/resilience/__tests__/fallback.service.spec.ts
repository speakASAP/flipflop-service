/**
 * Fallback Service Tests
 */

import { FallbackService } from '../fallback.service';
import * as fs from 'fs';
import * as path from 'path';

describe('FallbackService', () => {
  let service: FallbackService;
  let testQueueDir: string;
  let testStorageDir: string;

  beforeEach(() => {
    service = new FallbackService();
    testQueueDir = path.join(process.cwd(), 'logs', 'queue');
    testStorageDir = path.join(process.cwd(), 'logs', 'fallback');

    // Clean up test directories
    if (fs.existsSync(testQueueDir)) {
      fs.readdirSync(testQueueDir).forEach((file) => {
        fs.unlinkSync(path.join(testQueueDir, file));
      });
    }
    if (fs.existsSync(testStorageDir)) {
      fs.readdirSync(testStorageDir).forEach((file) => {
        fs.unlinkSync(path.join(testStorageDir, file));
      });
    }
  });

  describe('handleNotificationFallback', () => {
    it('should queue notification', async () => {
      const result = await service.handleNotificationFallback(
        {
          channel: 'email',
          type: 'order_confirmation',
          recipient: 'test@example.com',
        },
        { strategy: 'queue' },
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('queued');
    });

    it('should store notification locally', async () => {
      const result = await service.handleNotificationFallback(
        {
          channel: 'email',
          type: 'order_confirmation',
          recipient: 'test@example.com',
        },
        { strategy: 'local-storage' },
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('stored locally');
    });

    it('should log notification only', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await service.handleNotificationFallback(
        {
          channel: 'email',
          type: 'order_confirmation',
          recipient: 'test@example.com',
        },
        { strategy: 'log-only' },
      );

      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('handleLoggingFallback', () => {
    it('should store log locally', async () => {
      const result = await service.handleLoggingFallback(
        {
          level: 'error',
          message: 'Test error',
          service: 'test-service',
        },
        { strategy: 'local-storage' },
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('stored locally');
    });

    it('should log to console only', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await service.handleLoggingFallback(
        {
          level: 'info',
          message: 'Test message',
          service: 'test-service',
        },
        { strategy: 'log-only' },
      );

      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('processQueue', () => {
    it('should process queued notifications', async () => {
      // Create a test queue file
      const queueFile = path.join(
        testQueueDir,
        `notification-${Date.now()}.json`,
      );
      fs.mkdirSync(testQueueDir, { recursive: true });
      fs.writeFileSync(
        queueFile,
        JSON.stringify({
          timestamp: new Date().toISOString(),
          type: 'notification',
          data: { channel: 'email', recipient: 'test@example.com' },
        }),
      );

      const processed = await service.processQueue();

      expect(processed).toBeGreaterThan(0);
    });

    it('should return 0 if queue is empty', async () => {
      const processed = await service.processQueue();

      expect(processed).toBe(0);
    });
  });
});

