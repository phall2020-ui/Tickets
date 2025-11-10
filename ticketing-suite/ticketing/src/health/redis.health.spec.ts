import { RedisHealthIndicator } from './redis.health';

// Mock ioredis module
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    const EventEmitter = require('events');
    const mockRedis = new EventEmitter();
    mockRedis.ping = jest.fn().mockResolvedValue('PONG');
    mockRedis.disconnect = jest.fn().mockResolvedValue(undefined);
    mockRedis.quit = jest.fn().mockResolvedValue(undefined);
    return mockRedis;
  });
});

describe('RedisHealthIndicator', () => {
  let indicator: RedisHealthIndicator;

  beforeEach(() => {
    // Use a test Redis URL
    process.env.REDIS_URL = 'redis://test-redis:6379';
  });

  afterEach(async () => {
    delete process.env.REDIS_URL;
    // Clean up any redis connections
    if (indicator && (indicator as any).redis) {
      try {
        await (indicator as any).redis.quit();
      } catch (e) {
        // ignore
      }
    }
  });

  it('should be defined', () => {
    indicator = new RedisHealthIndicator();
    expect(indicator).toBeDefined();
  });

  it('should return unhealthy when redis client is not initialized', async () => {
    indicator = new RedisHealthIndicator();
    // Force redis to be null for testing
    (indicator as any).redis = null;

    const result = await indicator.isHealthy();
    
    expect(result.redis.status).toBe('down');
    expect(result.redis.message).toBe('Redis client not initialized');
  });

  it('should return healthy when ping succeeds', async () => {
    indicator = new RedisHealthIndicator();
    
    const result = await indicator.isHealthy();
    
    expect(result.redis.status).toBe('up');
    expect(result.redis.message).toBe('Connected');
  });

  it('should handle ping timeout', async () => {
    indicator = new RedisHealthIndicator();
    
    // Mock redis ping to take longer than timeout
    if ((indicator as any).redis) {
      (indicator as any).redis.ping = jest.fn().mockImplementation(() => 
        new Promise((resolve) => setTimeout(() => resolve('PONG'), 5000))
      );

      const result = await indicator.isHealthy();
      
      expect(result.redis.status).toBe('down');
      expect(result.redis.message).toContain('timeout');
    }
  }, 10000);

  it('should return unhealthy when ping fails', async () => {
    indicator = new RedisHealthIndicator();
    
    // Mock redis ping to fail
    if ((indicator as any).redis) {
      (indicator as any).redis.ping = jest.fn().mockRejectedValue(new Error('Connection refused'));

      const result = await indicator.isHealthy();
      
      expect(result.redis.status).toBe('down');
    }
  });
});
