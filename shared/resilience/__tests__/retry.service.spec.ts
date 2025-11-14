/**
 * Retry Service Tests
 */

import { RetryService } from '../retry.service';

describe('RetryService', () => {
  let service: RetryService;

  beforeEach(() => {
    service = new RetryService();
  });

  describe('execute', () => {
    it('should execute function successfully on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue({ success: true });

      const result = await service.execute(fn);

      expect(result).toEqual({ success: true });
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      let attempts = 0;
      const fn = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return { success: true };
      });

      const result = await service.execute(fn, { maxRetries: 3 });

      expect(result).toEqual({ success: true });
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors', async () => {
      const fn = jest.fn().mockRejectedValue({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
      });

      await expect(
        service.execute(fn, {
          retryable: (error: any) => error.code !== 'VALIDATION_ERROR',
        }),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Always fails'));

      await expect(service.execute(fn, { maxRetries: 2 })).rejects.toThrow(
        'Always fails',
      );

      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });
});

