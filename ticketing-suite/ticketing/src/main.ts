import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  // Early diagnostic log to show container started and key masked env vars
  try {
    console.log('⚙️ bootstrap starting', {
      PORT: process.env.PORT,
      NODE_ENV: process.env.NODE_ENV,
      API_PREFIX: process.env.API_PREFIX,
      // Mask REDIS_URL for logs but include a prefix for debugging
      REDIS_URL: process.env.REDIS_URL ? `${process.env.REDIS_URL.slice(0, 40)}...` : undefined,
      SKIP_REDIS_HEALTH: process.env.SKIP_REDIS_HEALTH === 'true'
    });
  } catch (err) {
    // ignore any logging errors
  }

  const app = await NestFactory.create(AppModule);

  // ✅ Add security headers
  app.use(helmet());

  // ✅ Enable CORS for frontend access
  const origins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
    : ['*'];
  app.enableCors({ origin: origins, credentials: true });

  // ✅ Optional global prefix (e.g., 'api' for /api/*)
  const prefix = process.env.API_PREFIX?.trim();
  if (prefix) {
    app.setGlobalPrefix(prefix);
  }

  // ✅ Listen on Railway's injected port (or 3000 locally)
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`✅ Server listening on http://0.0.0.0:${port}${prefix ? ` (prefix: /${prefix})` : ''}`);
  console.log(`CORS origins: ${origins.join(', ')}`);
  console.log(`Health endpoint: /${prefix ? prefix + '/' : ''}health`);
}

bootstrap();
