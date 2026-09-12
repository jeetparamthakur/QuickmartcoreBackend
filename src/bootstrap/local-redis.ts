import Redis from 'ioredis';
import { RedisMemoryServer } from 'redis-memory-server';
import { isLocalRedisUrl } from '../config/redis-connection';

export const LOCAL_REDIS = {
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  port: 6379,
} as const;

export type LocalRedis = RedisMemoryServer;

export async function isRedisReady(url = LOCAL_REDIS.url): Promise<boolean> {
  const client = new Redis(url, {
    maxRetriesPerRequest: 1,
    connectTimeout: 1000,
    retryStrategy: () => null,
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  client.on('error', () => undefined);

  try {
    await client.connect();
    const pong = await client.ping();
    return pong === 'PONG';
  } catch {
    return false;
  } finally {
    client.disconnect();
  }
}

export async function waitForRedis(
  url = LOCAL_REDIS.url,
  attempts = 30,
  delayMs = 500,
): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (await isRedisReady(url)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(
    `Redis did not become ready at ${url} after ${attempts} attempts`,
  );
}

export async function startEmbeddedRedis(): Promise<LocalRedis> {
  const redis = new RedisMemoryServer({
    instance: { port: LOCAL_REDIS.port },
  });

  await redis.start();
  return redis;
}

export async function ensureLocalRedis(): Promise<{
  redis: LocalRedis | null;
  startedByUs: boolean;
}> {
  const url = LOCAL_REDIS.url;

  if (!isLocalRedisUrl(url)) {
    return { redis: null, startedByUs: false };
  }

  if (await isRedisReady(url)) {
    console.log(`Using Redis at ${url}`);
    return { redis: null, startedByUs: false };
  }

  console.log(`Starting embedded Redis on port ${LOCAL_REDIS.port} (no Docker required)...`);

  try {
    const redis = await startEmbeddedRedis();
    await waitForRedis(url);
    console.log(`Embedded Redis running at ${url}`);
    return { redis, startedByUs: true };
  } catch (error) {
    if (await isRedisReady(url)) {
      console.log(`Using Redis at ${url}`);
      return { redis: null, startedByUs: false };
    }

    throw error;
  }
}
