import { config as loadEnv } from 'dotenv';
import { ensureLocalDatabase, LOCAL_DB } from './local-db';

loadEnv({ override: true });

async function initLocalDb() {
  await ensureLocalDatabase();

  console.log('');
  console.log('Local QuiickDB is ready.');
  console.log(`DATABASE_URL=${LOCAL_DB.url}`);
  console.log('');
  console.log('Restart the backend: npm run dev');
}

void initLocalDb().catch((error: unknown) => {
  console.error('Failed to initialize local database:', error);
  process.exit(1);
});
