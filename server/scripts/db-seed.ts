// npm run db:seed: initial data for a fresh database (docs/postgres-migration.md §5).
// Env: DATABASE_URL (required), SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD (optional).
import { existsSync, readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from '../src/db/schema';
import { seed } from '../src/db/seed';
import { requireEnv, TRANSLATIONS_SEED_FILE } from './script-utils';

async function main() {
  const pool = new Pool({ connectionString: requireEnv('DATABASE_URL'), max: 1 });
  try {
    const translations = existsSync(TRANSLATIONS_SEED_FILE) ? JSON.parse(readFileSync(TRANSLATIONS_SEED_FILE, 'utf8')) : undefined;
    if (!translations) {
      console.log(`No ${TRANSLATIONS_SEED_FILE}; languages start empty (fill them in the dashboard translations editor).`);
    }

    const result = await seed(drizzle(pool, { schema }), {
      adminEmail: process.env.SEED_ADMIN_EMAIL,
      adminPassword: process.env.SEED_ADMIN_PASSWORD,
      translations,
    });
    console.log('Seed result:', result);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
