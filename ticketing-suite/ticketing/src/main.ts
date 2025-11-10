import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  try {
    const startTime = Date.now();
    console.log('🚀 [STARTUP] Beginning bootstrap...');
    console.log('🚀 [STARTUP] Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DATABASE_URL: process.env.DATABASE_URL ? '✅ Set' : '❌ Not set',
      REDIS_URL: process.env.REDIS_URL ? `✅ Set (${process.env.REDIS_URL.startsWith('rediss://') ? 'TLS' : 'non-TLS'})` : '❌ Not set',
      API_PREFIX: process.env.API_PREFIX || '(none)',
    });

    // Critical: Create app instance (this initializes all modules)
    console.log('🚀 [STARTUP] Creating NestJS application...');
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug'],
    });
    const moduleInitTime = Date.now() - startTime;
    console.log(`✅ [STARTUP] NestJS application created (${moduleInitTime}ms)`);

    // ✅ Add security headers
    console.log('🚀 [STARTUP] Configuring security headers...');
    app.use(helmet());

    // ✅ Enable CORS for frontend access
    console.log('🚀 [STARTUP] Configuring CORS...');
    const origins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
      : ['*'];
    app.enableCors({ origin: origins, credentials: true });

    // ✅ Optional global prefix (e.g., 'api' for /api/*)
    const prefix = process.env.API_PREFIX?.trim();
    if (prefix) {
      console.log(`🚀 [STARTUP] Setting global prefix: /${prefix}`);
      app.setGlobalPrefix(prefix);
    }

    // ✅ Listen on Railway's injected port (or 3000 locally)
    const port = Number(process.env.PORT) || 3000;
    console.log(`🚀 [STARTUP] Starting server on 0.0.0.0:${port}...`);
    await app.listen(port, '0.0.0.0');

    const totalTime = Date.now() - startTime;
    console.log('━'.repeat(60));
    console.log(`✅ [STARTUP] Server is ready! (total: ${totalTime}ms)`);
    console.log(`✅ [STARTUP] Listening on http://0.0.0.0:${port}${prefix ? ` (prefix: /${prefix})` : ''}`);
    console.log(`✅ [STARTUP] Health endpoint: http://0.0.0.0:${port}/${prefix ? prefix + '/' : ''}health`);
    console.log(`✅ [STARTUP] CORS origins: ${origins.join(', ')}`);
    console.log('━'.repeat(60));
  } catch (error) {
    console.error('❌ [STARTUP] Bootstrap failed:', error);
    console.error('❌ [STARTUP] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Handle unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ [FATAL] Uncaught Exception:', error);
  process.exit(1);
});

bootstrap();
