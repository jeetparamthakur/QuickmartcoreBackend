function resolveRedisHost(redisUrl: string): string {
  try {
    const hostname = new URL(redisUrl).hostname;
    if (
      hostname === 'localhost' ||
      hostname === '::1' ||
      hostname === '[::1]'
    ) {
      // Avoid macOS/Linux resolving localhost to ::1 when Redis only listens on IPv4.
      return '127.0.0.1';
    }
    return hostname;
  } catch {
    return '127.0.0.1';
  }
}

export function resolveRedisUrl(): string {
  const url = process.env.REDIS_URL?.trim();
  return url || 'redis://127.0.0.1:6379';
}

export function isLocalRedisUrl(redisUrl: string): boolean {
  try {
    const hostname = new URL(redisUrl).hostname;
    return (
      hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
    );
  } catch {
    return redisUrl.includes('localhost') || redisUrl.includes('127.0.0.1');
  }
}

/** Skip BullMQ when Redis is unavailable (e.g. Render without a Key Value instance). */
export function shouldSkipRedis(): boolean {
  if (process.env.SKIP_REDIS === 'true') {
    return true;
  }

  if (process.env.NODE_ENV !== 'production') {
    return false;
  }

  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    return true;
  }

  return isLocalRedisUrl(redisUrl);
}

export function createRedisConnectionOptions(redisUrl: string) {
  const parsed = new URL(redisUrl);
  const host = resolveRedisHost(redisUrl);
  const port = parsed.port ? parseInt(parsed.port, 10) : 6379;
  const username = parsed.username || undefined;
  const password = parsed.password || undefined;
  const useTls = parsed.protocol === 'rediss:';

  return {
    host,
    port,
    username,
    password,
    ...(useTls ? { tls: {} } : {}),
    family: isLocalRedisUrl(redisUrl) ? 4 : undefined,
    // Required by BullMQ workers; otherwise ioredis throws on long-running jobs.
    maxRetriesPerRequest: null,
    retryStrategy(times: number) {
      // Back off up to 30s between reconnect attempts to avoid log spam.
      return Math.min(times * 500, 30_000);
    },
  };
}
