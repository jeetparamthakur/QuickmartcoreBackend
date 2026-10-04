/**
 * Wipe local DB, recreate schema, run catalog seed + dummy delivery order.
 * Keeps embedded Postgres running for the full flow (safe local-only).
 */
import { config as loadEnv } from 'dotenv';
import { execSync } from 'child_process';
import { join } from 'path';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from '../src/database/database.module';
import { ensureLocalDatabase, LOCAL_DB } from './local-db';

loadEnv({ override: true });

function isExternalDatabaseUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname !== 'localhost' && hostname !== '127.0.0.1';
  } catch {
    return true;
  }
}

async function wipeDatabase(databaseUrl: string): Promise<void> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query('GRANT ALL ON SCHEMA public TO public');
    const dbUser = new URL(databaseUrl).username;
    if (dbUser) {
      await client.query(`GRANT ALL ON SCHEMA public TO "${dbUser}"`);
    }
    console.log(`Database wiped: ${databaseUrl}`);
  } finally {
    await client.end();
  }
}

async function syncDatabase(databaseUrl: string): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    entities: ALL_ENTITIES,
    synchronize: true,
  });

  await dataSource.initialize();
  await dataSource.synchronize();
  await dataSource.destroy();

  const verifyClient = new Client({ connectionString: databaseUrl });
  await verifyClient.connect();
  try {
    const tables = await verifyClient.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
    );
    console.log(
      `Schema synced (${tables.rows.length} tables) on ${databaseUrl}`,
    );
  } finally {
    await verifyClient.end();
  }
}

function runScript(relativePath: string): void {
  const root = join(__dirname, '..');
  execSync(
    `npx ts-node -r tsconfig-paths/register ${relativePath}`,
    { stdio: 'inherit', cwd: root, env: process.env },
  );
}

async function seedFresh(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? LOCAL_DB.url;

  if (isExternalDatabaseUrl(databaseUrl)) {
    console.error(
      'Refusing to wipe a non-local database. Set DATABASE_URL to localhost only.',
    );
    process.exit(1);
  }

  const { pg, startedByUs } = await ensureLocalDatabase();

  try {
    await wipeDatabase(databaseUrl);
    await syncDatabase(databaseUrl);
    runScript('scripts/seed.ts');
    runScript('scripts/seed-dummy-delivery-order.ts');
    console.log('seed:fresh completed.');
  } finally {
    if (startedByUs && pg) {
      await pg.stop();
    }
  }
}

void seedFresh().catch((error: unknown) => {
  console.error('seed:fresh failed:', error);
  process.exit(1);
});
