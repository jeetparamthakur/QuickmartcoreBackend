import { config as loadEnv } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import {
  ensureLocalRedis,
  type LocalRedis,
} from './bootstrap/local-redis';
import {
  isLocalRedisUrl,
  resolveRedisUrl,
  shouldSkipRedis,
} from './config/redis-connection';

loadEnv();

async function ensureDevRedis(): Promise<LocalRedis | null> {
  if (shouldSkipRedis()) {
    return null;
  }

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  try {
    const { redis } = await ensureLocalRedis();
    return redis;
  } catch (error) {
    console.warn(
      'Redis is unavailable and could not be started automatically. Background jobs will be disabled.',
      error instanceof Error ? error.message : error,
    );
    process.env.SKIP_REDIS = 'true';
    return null;
  }
}

async function bootstrap() {
  if (shouldSkipRedis()) {
    process.env.SKIP_REDIS = 'true';
    if (process.env.NODE_ENV === 'production') {
      const redisUrl = process.env.REDIS_URL;
      if (!redisUrl) {
        console.warn(
          'REDIS_URL is not set on Render. Background jobs are disabled. Link a Key Value instance or set REDIS_URL from the Render dashboard.',
        );
      } else if (isLocalRedisUrl(redisUrl)) {
        console.warn(
          'REDIS_URL points to localhost in production. Background jobs are disabled. Set REDIS_URL to your Render Key Value internal connection string.',
        );
      }
    }
  } else if (process.env.NODE_ENV === 'production') {
    console.log(`Using hosted Redis at ${resolveRedisUrl()}`);
  }

  const embeddedRedis = await ensureDevRedis();

  const stopEmbeddedRedis = async () => {
    await embeddedRedis?.stop().catch(() => undefined);
  };

  process.once('SIGINT', () => void stopEmbeddedRedis());
  process.once('SIGTERM', () => void stopEmbeddedRedis());

  const { AppModule } = await import('./app.module.js');
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: config.get<string[]>('corsOrigins'),
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new RequestIdInterceptor());

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`m3bd API running on http://localhost:${port}/api/v1`);
  if (shouldSkipRedis()) {
    console.warn(
      'Running without Redis. Job queues and report exports are disabled.',
    );
  }
}

void bootstrap();
