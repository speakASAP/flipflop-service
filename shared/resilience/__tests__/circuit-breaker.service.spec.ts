/**
 * Circuit Breaker Service Tests
 */

import { CircuitBreakerService } from '../circuit-breaker.service';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(() => {
    service = new CircuitBreakerService();
  });

  describe('create', () => {
    it('should create a circuit breaker', () => {
      const breaker = service.create(
        'test-service',
        async () => ({ success: true }),
      );

      expect(breaker).toBeDefined();
    });

    it('should return existing breaker for same service', () => {
      const breaker1 = service.create(
        'test-service',
        async () => ({ success: true }),
      );
      const breaker2 = service.create(
        'test-service',
        async () => ({ success: true }),
      );

      expect(breaker1).toBe(breaker2);
    });
  });

  describe('getState', () => {
    it('should return circuit breaker state', () => {
      service.create('test-service', async () => ({ success: true }));

      const state = service.getState('test-service');

      expect(state).toBeDefined();
      expect(state?.name).toBe('test-service');
      expect(state?.state).toBe('closed');
    });

    it('should return null for non-existent breaker', () => {
      const state = service.getState('non-existent');

      expect(state).toBeNull();
    });
  });

  describe('isOpen', () => {
    it('should return false for closed circuit', () => {
      service.create('test-service', async () => ({ success: true }));

      expect(service.isOpen('test-service')).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset circuit breaker', () => {
      const breaker = service.create(
        'test-service',
        async () => ({ success: true }),
      );

      service.reset('test-service');

      expect(breaker.isOpen).toBe(false);
    });
  });
});

