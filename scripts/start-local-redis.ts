import { ensureLocalRedis } from './local-redis';

async function startLocalRedis() {
  const { redis } = await ensureLocalRedis();

  if (!redis) {
    process.exit(0);
  }

  console.log('Press Ctrl+C to stop.');

  const shutdown = async () => {
    await redis.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

void startLocalRedis().catch((error: unknown) => {
  console.error('Failed to start local Redis:', error);
  process.exit(1);
});
