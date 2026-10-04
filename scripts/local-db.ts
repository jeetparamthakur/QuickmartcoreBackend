import { existsSync } from 'fs';
import { join } from 'path';
import EmbeddedPostgres from 'embedded-postgres';
import { Client } from 'pg';

export const LOCAL_DB = {
  dir: './.local/postgres',
  port: 5436,
  user: 'param',
  password: 'param',
  name: 'quiickdb',
  url: 'postgresql://param:param@localhost:5436/quiickdb',
} as const;

const ADMIN_DB_CANDIDATES = [LOCAL_DB.user, 'postgres'] as const;

function adminConnectionString(database: string): string {
  return `postgresql://${LOCAL_DB.user}:${LOCAL_DB.password}@localhost:${LOCAL_DB.port}/${database}`;
}

export async function resolveAdminConnectionString(): Promise<string> {
  for (const database of ADMIN_DB_CANDIDATES) {
    const url = adminConnectionString(database);
    if (await isDatabaseReady(url)) {
      return url;
    }
  }

  throw new Error(
    `PostgreSQL is not running on port ${LOCAL_DB.port}. Run npm run db:init or npm run dev.`,
  );
}

async function ensureDatabaseExists(databaseName: string): Promise<void> {
  const adminUrl = await resolveAdminConnectionString();
  const client = new Client({ connectionString: adminUrl });

  try {
    await client.connect();
    const existing = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [databaseName],
    );
    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE ${databaseName}`);
    }
  } finally {
    await client.end().catch(() => undefined);
  }
}

export type LocalPostgres = InstanceType<typeof EmbeddedPostgres>;

export async function isDatabaseReady(
  connectionString: string = LOCAL_DB.url,
): Promise<boolean> {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    await client.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function waitForDatabase(
  connectionString: string = LOCAL_DB.url,
  attempts = 30,
  delayMs = 500,
): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (await isDatabaseReady(connectionString)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(
    `PostgreSQL did not become ready at ${connectionString} after ${attempts} attempts`,
  );
}

export async function startEmbeddedPostgres(): Promise<LocalPostgres> {
  const pg = new EmbeddedPostgres({
    databaseDir: LOCAL_DB.dir,
    user: LOCAL_DB.user,
    password: LOCAL_DB.password,
    port: LOCAL_DB.port,
    persistent: true,
  });

  if (!existsSync(join(LOCAL_DB.dir, 'PG_VERSION'))) {
    await pg.initialise();
  }

  await pg.start();

  try {
    await pg.createDatabase(LOCAL_DB.name);
  } catch {
    // Database already exists on subsequent starts.
  }

  return pg;
}

export async function ensureLocalDatabase(): Promise<{
  pg: LocalPostgres | null;
  startedByUs: boolean;
}> {
  try {
    await resolveAdminConnectionString();
    await ensureDatabaseExists(LOCAL_DB.name);
    await waitForDatabase();
    console.log(`Using PostgreSQL at ${LOCAL_DB.url} (QuiickDB)`);
    return { pg: null, startedByUs: false };
  } catch {
    // Server not up yet — start embedded Postgres below.
  }

  console.log('Starting m3bd PostgreSQL on port 5436 (separate from Markos on 5435)...');

  try {
    const pg = await startEmbeddedPostgres();
    await waitForDatabase();
    console.log(
      `Local PostgreSQL running on port ${LOCAL_DB.port} (${LOCAL_DB.user}/${LOCAL_DB.password}, db: ${LOCAL_DB.name} / QuiickDB)`,
    );
    return { pg, startedByUs: true };
  } catch (error) {
    try {
      await resolveAdminConnectionString();
      await ensureDatabaseExists(LOCAL_DB.name);
      await waitForDatabase();
      console.log(`Using PostgreSQL at ${LOCAL_DB.url} (QuiickDB)`);
      return { pg: null, startedByUs: false };
    } catch {
      throw error;
    }
  }
}
