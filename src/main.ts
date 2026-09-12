import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import {
  ensureLocalRedis,
  type LocalRedis,
} from './bootstrap/local-redis';

async function ensureDevRedis(): Promise<LocalRedis | null> {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const { redis } = await ensureLocalRedis();
  return redis;
}

async function bootstrap() {
  const embeddedRedis = await ensureDevRedis();

  const stopEmbeddedRedis = async () => {
    await embeddedRedis?.stop().catch(() => undefined);
  };

  process.once('SIGINT', () => void stopEmbeddedRedis());
  process.once('SIGTERM', () => void stopEmbeddedRedis());

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
}

void bootstrap();
