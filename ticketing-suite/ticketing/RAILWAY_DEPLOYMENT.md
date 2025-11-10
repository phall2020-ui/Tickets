# Railway Deployment Guide

## Environment Variables Required

### Database (Neon PostgreSQL)
```bash
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
```
- **MUST** include `?sslmode=require` for TLS connection
- Neon provides this automatically

### Redis (Upstash)
```bash
# ✅ CORRECT - Use rediss:// for TLS
REDIS_URL=rediss://default:<token>@modest-starling-29276.upstash.io:6379

# ❌ WRONG - Don't use redis:// without TLS
REDIS_URL=redis://default:<token>@modest-starling-29276.upstash.io:6379
```

**CRITICAL**: Upstash Redis **requires TLS**. Always use `rediss://` (with double 's') protocol.

### Port Configuration
```bash
# Railway automatically injects PORT - don't set it manually
# PORT=3000  # Not needed
```

### Other Variables
```bash
NODE_ENV=production
JWT_SECRET=your-secret-key-here
CORS_ORIGIN=https://your-frontend.com
API_PREFIX=  # Optional, e.g., "api" for /api/* routes
```

## Deployment Checklist

### Pre-deployment
- [ ] Verify `REDIS_URL` uses `rediss://` protocol
- [ ] Verify `DATABASE_URL` includes `?sslmode=require`
- [ ] Set `JWT_SECRET` to a strong random value
- [ ] Configure `CORS_ORIGIN` to your frontend domain(s)

### Post-deployment Verification
1. **Check Railway logs** for startup sequence:
   ```
   🚀 [STARTUP] Beginning bootstrap...
   🚀 [STARTUP] Creating NestJS application...
   ✅ [STARTUP] NestJS application created (XXXXms)
   ✅ [STARTUP] Server is ready! (total: XXXXms)
   ```

2. **Test health endpoint**:
   ```bash
   curl https://your-app.railway.app/health
   ```
   
   Expected response:
   ```json
   {
     "status": "ok",
     "info": {
       "database": { "status": "up" },
       "redis": { "status": "up", "message": "Connected" }
     }
   }
   ```

3. **Check for errors** - If you see:
   - `502 connection dial timeout` → App didn't reach `app.listen()` in 15s
   - `499 client closed request` → Client timeout before server responded
   - Check logs for where startup hung (should show last successful step)

## Troubleshooting

### Issue: 502 Errors on Deployment

**Root Causes:**
1. **Redis connection blocking startup** 
   - Verify `REDIS_URL` uses `rediss://` protocol
   - Check Redis is accessible from Railway region
   
2. **Database connection timeout**
   - Verify `DATABASE_URL` is correct
   - Check Neon database is running
   
3. **Migration timeout**
   - Migrations have 30s timeout, check if they complete
   - May need to run migrations manually: `npx prisma migrate deploy`

**Debug Steps:**
1. Check Railway logs for startup progress
2. Look for the last successful log message
3. Common patterns:
   - Stops at "Creating NestJS application" → Module initialization hanging
   - Stops at "Running Prisma migrations" → Migration issue
   - No logs at all → Build failed

### Issue: Redis Connection Errors

If health check shows Redis as down:
```json
{
  "redis": {
    "status": "down",
    "message": "Connection failed"
  }
}
```

**Fix:**
1. Verify `REDIS_URL` format: `rediss://default:<token>@host:6379`
2. Test Redis manually: `redis-cli -u "$REDIS_URL" ping`
3. Check Upstash dashboard for connection errors

### Issue: Database Connection Errors

**Symptoms:** App fails to start, logs show Prisma error

**Fix:**
1. Verify DATABASE_URL format
2. Check Neon database status
3. Test connection: `psql "$DATABASE_URL" -c "SELECT 1"`

## Performance Notes

### Startup Timing
- **Expected:** 2-5 seconds for normal startup
- **Acceptable:** Up to 15 seconds (Railway timeout)
- **Too slow:** >15 seconds indicates blocking issue

**Typical breakdown:**
- Prisma connect: 1-3s
- Redis lazy init: <100ms (lazy loaded on first health check)
- Module initialization: 1-2s
- Server listen: <100ms

### Health Check Configuration
- Interval: 30s
- Timeout: 5s
- Start period: 30s (allows slow startup)
- Retries: 5

## Build Configuration

Railway uses the Dockerfile located at:
```
ticketing-suite/ticketing/Dockerfile
```

Build context:
```
ticketing-suite/ticketing
```

Configured in `railway.toml`:
```toml
[build]
builder = "dockerfile"
dockerfilePath = "ticketing-suite/ticketing/Dockerfile"
buildContext = "ticketing-suite/ticketing"
```

## Migration Strategy

Migrations run automatically during container startup with a 30-second timeout.

If migrations fail/timeout:
1. Container continues to start (non-fatal)
2. Warning logged: "Migration timeout or failed - continuing anyway"
3. May need manual intervention: run `npx prisma migrate deploy` via Railway CLI

## Logs to Monitor

### Good Startup
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 [Container] Starting container
🔧 [Container] PORT=3000 NODE_ENV=production
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ [Container] Build artifact present
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 [Container] Running Prisma migrations...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 [Container] Launching NestJS application...
🚀 [STARTUP] Beginning bootstrap...
🚀 [STARTUP] Creating NestJS application...
🔧 [Prisma] Connecting to database...
✅ [Prisma] Database connected (1234ms)
✅ [STARTUP] NestJS application created (5678ms)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ [STARTUP] Server is ready! (total: 7890ms)
✅ [STARTUP] Listening on http://0.0.0.0:3000
```

### Failed Startup (Example)
```
🚀 [STARTUP] Creating NestJS application...
🔧 [Prisma] Connecting to database...
❌ [Prisma] Database connection failed: Connection timeout
```

## Support

If issues persist:
1. Check Railway logs for detailed error messages
2. Verify all environment variables are correctly set
3. Test external services (Redis, Postgres) are accessible
4. Review this guide's troubleshooting section
