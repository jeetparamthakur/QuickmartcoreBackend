import { existsSync } from 'fs';
import { join } from 'path';
import EmbeddedPostgres from 'embedded-postgres';
import { Client } from 'pg';

export const LOCAL_DB = {
  dir: './.local/postgres',
  port: 5436,
  user: 'param',
  password: 'param',
  name: 'param',
  url: 'postgresql://param:param@localhost:5436/param',
} as const;

export type LocalPostgres = InstanceType<typeof EmbeddedPostgres>;

export async function isDatabaseReady(
  connectionString = LOCAL_DB.url,
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
  connectionString = LOCAL_DB.url,
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
  if (await isDatabaseReady()) {
    console.log(`Using PostgreSQL at ${LOCAL_DB.url}`);
    return { pg: null, startedByUs: false };
  }

  console.log('Starting m3bd PostgreSQL on port 5436 (separate from Markos on 5435)...');

  try {
    const pg = await startEmbeddedPostgres();
    await waitForDatabase();
    console.log(
      `Local PostgreSQL running on port ${LOCAL_DB.port} (${LOCAL_DB.user}/${LOCAL_DB.password}, db: ${LOCAL_DB.name})`,
    );
    return { pg, startedByUs: true };
  } catch (error) {
    if (await isDatabaseReady()) {
      console.log(`Using PostgreSQL at ${LOCAL_DB.url}`);
      return { pg: null, startedByUs: false };
    }

    throw error;
  }
}
