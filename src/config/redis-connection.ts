export function createRedisConnectionOptions(redisUrl: string) {
  return {
    url: redisUrl,
    // Required by BullMQ workers; otherwise ioredis throws on long-running jobs.
    maxRetriesPerRequest: null,
    retryStrategy(times: number) {
      // Back off up to 30s between reconnect attempts to avoid log spam.
      return Math.min(times * 500, 30_000);
    },
  };
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
