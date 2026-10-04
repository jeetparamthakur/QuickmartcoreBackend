import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';
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

async function wipeDatabase(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? LOCAL_DB.url;

  if (isExternalDatabaseUrl(databaseUrl)) {
    console.error(
      'Refusing to wipe a non-local database. Set DATABASE_URL to localhost only.',
    );
    process.exit(1);
  }

  const { pg, startedByUs } = await ensureLocalDatabase();

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
    if (startedByUs && pg) {
      await pg.stop();
    }
  }
}

void wipeDatabase().catch((error: unknown) => {
  console.error('Database wipe failed:', error);
  process.exit(1);
});
