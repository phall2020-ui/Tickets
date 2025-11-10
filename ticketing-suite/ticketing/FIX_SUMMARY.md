# Fix Summary: Railway 502/499 Deployment Errors

## Root Cause Analysis

### Why 502 "Connection Dial Timeout" Occurred

Railway's edge proxy couldn't connect to the application because the NestJS app never reached `app.listen()`. The startup sequence was blocked during module initialization, preventing the server from binding to port 3000 within Railway's 15-second timeout window.

### Why 499 "Client Closed Request" Occurred

Railway's health check probes timed out waiting for a response. The client (Railway's proxy) closed the connection before the server could respond because the server was still blocked in the initialization phase and hadn't started accepting HTTP requests.

## Primary Issue: Redis Connection Blocking

**Problem:**
```typescript
// OLD CODE - BLOCKING
constructor() { 
  super(); 
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  
  // ❌ This creates and connects immediately
  this.redis = new IORedis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 3) return null;
      return Math.min(times * 100, 3000);
    }
  });
}
```

**Issue:**
- IORedis connects immediately when instantiated
- If REDIS_URL uses `redis://` instead of `rediss://` for Upstash, TLS handshake fails
- Retry attempts (up to 3) with exponential backoff (up to 3000ms each)
- Total blocking time: potentially 9+ seconds just for Redis
- NestJS waits for all module providers to construct before calling `app.listen()`

**Solution:**
```typescript
// NEW CODE - LAZY LOADING
constructor() { 
  super();
  // ✅ Don't create connection in constructor
}

private initRedis() {
  if (this.initStarted) return;
  this.initStarted = true;

  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  
  this.redis = new IORedis(url, {
    lazyConnect: true,              // ✅ Don't connect immediately
    maxRetriesPerRequest: 1,        // ✅ Fail fast
    connectTimeout: 5000,           // ✅ 5s max for connection
    enableOfflineQueue: false,      // ✅ Don't queue commands
    retryStrategy: (times) => {
      if (times > 1) return null;   // ✅ Max 1 retry
      return 1000;
    },
  });
}

async isHealthy(): Promise<HealthIndicatorResult> { 
  this.initRedis(); // ✅ Initialize only when needed
  
  // ✅ Add ping timeout
  const pingPromise = this.redis.ping();
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Ping timeout after 3s')), 3000)
  );
  
  const pong = await Promise.race([pingPromise, timeoutPromise]);
  // ...
}
```

**Impact:**
- Redis initialization: 0ms (lazy, happens on first health check)
- Startup no longer blocked by Redis connection issues
- Health checks fail gracefully without blocking startup

## Secondary Issues Fixed

### 2. Missing Startup Logging

**Problem:** No way to diagnose where startup was hanging.

**Solution:**
```typescript
async function bootstrap() {
  const startTime = Date.now();
  console.log('🚀 [STARTUP] Beginning bootstrap...');
  console.log('🚀 [STARTUP] Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL ? '✅ Set' : '❌ Not set',
    REDIS_URL: process.env.REDIS_URL ? 
      `✅ Set (${process.env.REDIS_URL.startsWith('rediss://') ? 'TLS' : 'non-TLS'})` : 
      '❌ Not set',
  });

  console.log('🚀 [STARTUP] Creating NestJS application...');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });
  const moduleInitTime = Date.now() - startTime;
  console.log(`✅ [STARTUP] NestJS application created (${moduleInitTime}ms)`);
  
  // ... more logging throughout bootstrap
  
  const totalTime = Date.now() - startTime;
  console.log(`✅ [STARTUP] Server is ready! (total: ${totalTime}ms)`);
}
```

**Impact:**
- Can now see exactly where startup hangs
- Shows timing for each phase
- Validates environment configuration
- Alerts if using non-TLS Redis URL

### 3. Prisma Connection Timeout

**Problem:** `PrismaService.onModuleInit()` could hang indefinitely if database was unreachable.

**Solution:**
```typescript
async onModuleInit() {
  console.log('🔧 [Prisma] Connecting to database...');
  const connectStart = Date.now();
  
  try {
    // ✅ Add 10s timeout
    const connectPromise = this.$connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database connection timeout after 10s')), 10000)
    );
    
    await Promise.race([connectPromise, timeoutPromise]);
    
    const connectTime = Date.now() - connectStart;
    console.log(`✅ [Prisma] Database connected (${connectTime}ms)`);
  } catch (error) {
    console.error('❌ [Prisma] Database connection failed:', error);
    throw error; // Re-throw to prevent app from starting with broken DB
  }
}
```

**Impact:**
- Database connection attempts timeout after 10s
- Clear error messages if database is unreachable
- Prevents indefinite hanging

### 4. Dockerfile Migration Timeout

**Problem:** `npx prisma migrate deploy` could hang indefinitely, preventing app startup.

**Solution:**
```bash
# ✅ Run migrations with timeout
timeout 30s npx prisma migrate deploy || { \
  echo "⚠️  [Container] Migration timeout or failed - continuing anyway"; \
  echo "⚠️  [Container] Migrations may need to be run manually"; \
}; \
```

**Impact:**
- Migrations timeout after 30s
- App continues to start even if migrations fail
- Allows manual intervention via Railway CLI if needed

### 5. Improved Health Check Configuration

**Old:**
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 3000), ...)"
```

**New:**
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health', ...)"
```

**Changes:**
- Increased start-period from 20s to 30s (allows slower startup)
- Changed healthcheck to hit `/health` endpoint specifically
- Returns success for 2xx-3xx status codes (not just 2xx-4xx)

## Expected Startup Sequence

### Successful Deployment Logs

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 [Container] Starting container
🔧 [Container] PORT=3000 NODE_ENV=production
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ [Container] Build artifact present
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 [Container] Running Prisma migrations with 30s timeout...
Prisma schema loaded from prisma/schema.prisma
No pending migrations to apply.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 [Container] Launching NestJS application...
🚀 [STARTUP] Beginning bootstrap...
🚀 [STARTUP] Environment: {
  NODE_ENV: 'production',
  PORT: '3000',
  DATABASE_URL: '✅ Set',
  REDIS_URL: '✅ Set (TLS)',
  API_PREFIX: '(none)'
}
🚀 [STARTUP] Creating NestJS application...
🔧 [Prisma] Connecting to database...
✅ [Prisma] Database connected (1234ms)
✅ [STARTUP] NestJS application created (2345ms)
🚀 [STARTUP] Configuring security headers...
🚀 [STARTUP] Configuring CORS...
🚀 [STARTUP] Starting server on 0.0.0.0:3000...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ [STARTUP] Server is ready! (total: 3456ms)
✅ [STARTUP] Listening on http://0.0.0.0:3000
✅ [STARTUP] Health endpoint: http://0.0.0.0:3000/health
✅ [STARTUP] CORS origins: *
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Performance Expectations

- **Expected:** 2-5 seconds total startup time
- **Acceptable:** Up to 15 seconds (Railway's timeout)
- **Too slow:** >15 seconds indicates a problem

**Typical breakdown:**
- Prisma connect: 1-3s
- Redis lazy init: <100ms (on first health check, not startup)
- Module initialization: 1-2s
- Server listen: <100ms

## Verification Steps

### 1. Check Environment Variables

```bash
# ✅ CORRECT - Use rediss:// for TLS
REDIS_URL=rediss://default:<token>@modest-starling-29276.upstash.io:6379

# ❌ WRONG - Don't use redis:// without TLS
REDIS_URL=redis://default:<token>@modest-starling-29276.upstash.io:6379
```

### 2. Test Health Endpoint

```bash
curl https://your-app.railway.app/health
```

**Expected response:**
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up", "message": "Connected" }
  }
}
```

### 3. Monitor Railway Logs

Look for the complete startup sequence from "🚀 [STARTUP] Beginning bootstrap..." to "✅ [STARTUP] Server is ready!"

## Files Changed

1. **ticketing-suite/ticketing/src/health/redis.health.ts** - Lazy loading, timeouts
2. **ticketing-suite/ticketing/src/main.ts** - Comprehensive logging
3. **ticketing-suite/ticketing/src/infra/prisma.service.ts** - Connection timeout
4. **ticketing-suite/ticketing/Dockerfile** - Migration timeout, improved health check
5. **ticketing-suite/ticketing/RAILWAY_DEPLOYMENT.md** - Deployment documentation
6. **ticketing-suite/ticketing/src/health/redis.health.spec.ts** - Tests for lazy loading

## Testing Summary

All tests pass (22 tests across 4 test suites):
- ✅ Health controller tests (3 tests)
- ✅ Prisma service tests (5 tests)
- ✅ Query DTO tests (7 tests)
- ✅ Redis health indicator tests (7 tests)

## Security Summary

CodeQL analysis completed with **0 vulnerabilities** found.

## Next Steps for Deployment

1. **Verify REDIS_URL uses `rediss://` protocol**
   ```bash
   railway variables get REDIS_URL
   ```

2. **Deploy the changes**
   ```bash
   git push origin main
   ```

3. **Monitor Railway logs** for the startup sequence

4. **Test the health endpoint** to confirm both database and Redis are connected

5. **If issues persist:**
   - Check Railway logs for where startup stops
   - Verify DATABASE_URL includes `?sslmode=require`
   - Verify Upstash Redis is accessible from Railway region
   - Check Neon database status

## Conclusion

The 502/499 errors were caused by Redis connection attempts blocking NestJS module initialization. By making Redis connection lazy and adding proper timeouts throughout the startup sequence, the application now starts reliably within Railway's 15-second window. Comprehensive logging makes it easy to diagnose any remaining issues.
