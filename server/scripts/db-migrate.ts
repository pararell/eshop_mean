// npm run db:migrate: applies pending migrations to DATABASE_URL.
// For the server database, open the SSH tunnel first (docs/postgres-migration.md §8).
import { runMigrations } from '../src/db/migrate';
import { requireEnv } from './script-utils';

async function main() {
  const url = requireEnv('DATABASE_URL');
  await runMigrations(url);
  console.log('Migrations applied.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
