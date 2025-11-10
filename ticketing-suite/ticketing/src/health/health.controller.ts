import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';
import { RedisHealthIndicator } from './redis.health';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prisma: PrismaHealthIndicator,
    private redis: RedisHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  check() {
    const checks = [() => this.prisma.isHealthy()];

    // Allow skipping Redis health checks via environment variable for debugging or degraded mode
    if (process.env.SKIP_REDIS_HEALTH !== 'true') {
      checks.push(() => this.redis.isHealthy());
    } else {
      // Optional: log that redis check was skipped (will appear in application logs)
      console.warn('SKIP_REDIS_HEALTH=true — skipping Redis health check');
    }

    return this.health.check(checks);
  }
}
