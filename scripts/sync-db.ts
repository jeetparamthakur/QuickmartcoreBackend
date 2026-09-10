import 'reflect-metadata';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from '../src/database/database.module';
import { ensureLocalDatabase, LOCAL_DB } from './local-db';

function isExternalDatabaseUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname !== 'localhost' && hostname !== '127.0.0.1';
  } catch {
    return false;
  }
}

async function syncDatabase(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? LOCAL_DB.url;

  if (!isExternalDatabaseUrl(databaseUrl)) {
    await ensureLocalDatabase();
  }
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
      `SELECT tablename
       FROM pg_tables
       WHERE schemaname = 'public'
       ORDER BY tablename`,
    );

    console.log(
      `Database schema synced to ${databaseUrl}. Tables: ${tables.rows
        .map((row) => row.tablename)
        .join(', ')}`,
    );
  } finally {
    await verifyClient.end();
  }
}

void syncDatabase().catch((error: unknown) => {
  console.error('Database sync failed:', error);
  process.exit(1);
});
