import { Logger } from '@nestjs/common';

import { checkMigrations, migrateWithLock } from './migrate';

/**
 * Runs before the app is created (main.ts / main-ssr.ts). Deploys are automatic (Watchtower), so
 * the container applies pending migrations itself; migrations must therefore only add things
 * (expand/contract, see docs/database.md § Runbook).
 *
 * `DB_MIGRATE_ON_START=false` turns this off; pending migrations are then only reported.
 * Throws when the database can't be migrated, so the process exits instead of serving errors.
 */
export async function prepareDatabase(logger = new Logger('Database')): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set (see .env.example)');
  }

  if (process.env.DB_MIGRATE_ON_START === 'false') {
    const pending = await checkMigrations(url);
    if (pending.length) {
      logger.error(`${pending.length} pending migration(s): ${pending.join(', ')}. Run npm run db:migrate before using the app.`);
    } else {
      logger.log('Database schema is up to date (DB_MIGRATE_ON_START=false)');
    }
    return;
  }

  const started = Date.now();
  const applied = await migrateWithLock(url);
  logger.log(
    applied.length ? `Applied ${applied.length} migration(s) in ${Date.now() - started} ms: ${applied.join(', ')}` : 'Database schema is up to date',
  );
}
