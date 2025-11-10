import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import IORedis from 'ioredis';

@Injectable() 
export class RedisHealthIndicator extends HealthIndicator {
  private redis: IORedis | null = null;
  private connectionError: string | null = null;
  private initStarted = false;

  constructor() { 
    super();
    // Don't create connection in constructor - make it lazy
    // This prevents blocking NestJS module initialization
  }

  private initRedis() {
    if (this.initStarted) return;
    this.initStarted = true;

    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    
    try {
      // IORedis automatically handles both redis:// and rediss:// protocols
      // lazyConnect: true prevents immediate connection attempt
      this.redis = new IORedis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 5000, // 5 second connection timeout
        retryStrategy: (times) => {
          // Fail fast - don't retry connection on health checks
          if (times > 1) {
            return null;
          }
          return 1000;
        },
        enableReadyCheck: true,
        enableOfflineQueue: false, // Don't queue commands if disconnected
      });

      this.redis.on('error', (error) => {
        this.connectionError = error.message;
        console.warn('⚠️  Redis connection error:', error.message);
      });

      this.redis.on('connect', () => {
        this.connectionError = null;
        console.log('✅ Redis connected');
      });
    } catch (error: any) {
      this.connectionError = error.message;
      console.warn('⚠️  Redis initialization failed:', error.message);
    }
  }

  async isHealthy(): Promise<HealthIndicatorResult> { 
    this.initRedis();

    if (!this.redis) {
      return this.getStatus('redis', false, { message: 'Redis client not initialized' });
    }

    try {
      // Connect if not already connected (lazy connection)
      if (this.redis.status !== 'ready' && this.redis.status !== 'connecting') {
        await this.redis.connect();
      }
      
      // Ping with timeout to prevent hanging
      const pingPromise = this.redis.ping();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Ping timeout after 3s')), 3000)
      );
      
      const pong = await Promise.race([pingPromise, timeoutPromise]) as string;
      
      return this.getStatus('redis', pong === 'PONG', { 
        message: pong === 'PONG' ? 'Connected' : 'Unexpected response' 
      }); 
    } catch (error: any) { 
      return this.getStatus('redis', false, { 
        message: this.connectionError || error.message || 'Connection failed' 
      }); 
    } 
  }
}
