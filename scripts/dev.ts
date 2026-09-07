import { spawn, type ChildProcess } from 'child_process';
import { createServer } from 'net';
import { ensureLocalDatabase, type LocalPostgres } from './local-db';
import { ensureLocalRedis, type LocalRedis } from './local-redis';

async function assertPortAvailable(port: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const probe = createServer();

    probe.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        reject(
          new Error(
            `Port ${port} is already in use. Stop the other dev server (Ctrl+C in its terminal), then run npm run dev again.`,
          ),
        );
        return;
      }

      reject(error);
    });

    probe.once('listening', () => {
      probe.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve();
      });
    });

    probe.listen(port);
  });
}

async function startDevServer() {
  const skipDb = process.env.SKIP_DB === 'true';
  const port = parseInt(process.env.PORT ?? '3001', 10);

  await assertPortAvailable(port);

  let pg: LocalPostgres | null = null;
  let redis: LocalRedis | null = null;

  if (!skipDb) {
    ({ pg } = await ensureLocalDatabase());
    ({ redis } = await ensureLocalRedis());
  }

  const nest = spawn('npx', ['nest', 'start', '--watch'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd(),
    env: process.env,
  });

  let shuttingDown = false;

  const shutdown = async (exitCode = 0) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    killNest(nest);
    await redis?.stop().catch(() => undefined);
    await pg?.stop().catch(() => undefined);
    process.exit(exitCode);
  };

  process.on('SIGINT', () => void shutdown(0));
  process.on('SIGTERM', () => void shutdown(0));

  nest.on('exit', (code) => {
    void shutdown(code ?? 0);
  });
}

function killNest(nest: ChildProcess) {
  if (nest.killed || nest.exitCode !== null) {
    return;
  }

  nest.kill('SIGTERM');
}

void startDevServer().catch((error: unknown) => {
  console.error('Failed to start dev server:', error);
  process.exit(1);
});
