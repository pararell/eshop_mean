import { defineConfig } from 'drizzle-kit';

// Run from the repository root: npm run db:generate (see docs/postgres-migration.md)
export default defineConfig({
  dialect: 'postgresql',
  schema: './server/src/db/schema.ts',
  out: './server/db/migrations',
  strict: true,
  verbose: true,
});
