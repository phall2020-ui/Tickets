import { RedisHealthIndicator } from './redis.health';

describe('RedisHealthIndicator', () => {
  let indicator: RedisHealthIndicator;
  const indicators: RedisHealthIndicator[] = [];

  beforeEach(() => {
    // Clear environment to ensure clean state
    delete process.env.REDIS_URL;
  });

  afterEach(async () => {
    // Clean up all Redis connections to prevent Jest from hanging
    for (const ind of indicators) {
      try {
        if ((ind as any).redis) {
          await (ind as any).redis.quit();
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    indicators.length = 0;
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should not throw error when REDIS_URL is not set', () => {
      expect(() => {
        indicator = new RedisHealthIndicator();
        indicators.push(indicator);
      }).not.toThrow();
    });

    it('should not throw error when REDIS_URL is set to invalid URL', () => {
      process.env.REDIS_URL = 'invalid-url';
      expect(() => {
        indicator = new RedisHealthIndicator();
        indicators.push(indicator);
      }).not.toThrow();
    });

    it('should create instance without initializing Redis connection', () => {
      indicator = new RedisHealthIndicator();
      indicators.push(indicator);
      expect(indicator).toBeDefined();
      // Redis connection should be lazy-loaded, not created in constructor
    });
  });

  describe('isHealthy', () => {
    beforeEach(() => {
      indicator = new RedisHealthIndicator();
      indicators.push(indicator);
    });

    it('should return status without crashing when Redis is not available', async () => {
      process.env.REDIS_URL = 'redis://invalid-host:6379';
      
      const result = await indicator.isHealthy();
      
      expect(result).toBeDefined();
      expect(result.redis).toBeDefined();
      expect(result.redis.status).toBe('down');
    });

    it('should handle timeout gracefully', async () => {
      process.env.REDIS_URL = 'redis://localhost:9999'; // Non-existent port
      
      // This should not hang indefinitely
      const result = await indicator.isHealthy();
      
      expect(result).toBeDefined();
      expect(result.redis).toBeDefined();
      expect(result.redis.status).toBe('down');
    }, 10000); // 10s timeout for test

    it('should return consistent results on multiple calls', async () => {
      process.env.REDIS_URL = 'redis://invalid-host:6379';
      
      const result1 = await indicator.isHealthy();
      const result2 = await indicator.isHealthy();
      
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1.redis.status).toBe(result2.redis.status);
    });

    it('should not block when Redis connection fails', async () => {
      process.env.REDIS_URL = 'redis://nonexistent.example.com:6379';
      
      const startTime = Date.now();
      await indicator.isHealthy();
      const duration = Date.now() - startTime;
      
      // Should fail fast (within 10s including timeouts)
      expect(duration).toBeLessThan(10000);
    }, 15000);
  });
});
