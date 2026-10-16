import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client, Pool } from 'pg';

/** Folder of the generated SQL migrations (relative to the repository root, and to /usr/src/app in the image). */
export const MIGRATIONS_FOLDER = resolve(process.cwd(), 'server/db/migrations');

/** Key of the Postgres advisory lock that serializes migrations across processes/containers. */
const MIGRATION_LOCK_KEY = 72_943_810;

interface JournalEntry {
  tag: string;
  /** Drizzle stores this as `created_at` of the applied migration */
  when: number;
}

const journal = (folder: string): JournalEntry[] =>
  (JSON.parse(readFileSync(resolve(folder, 'meta/_journal.json'), 'utf8')) as { entries: JournalEntry[] }).entries;

/**
 * Migrations in the folder that the database has not applied yet (Drizzle applies every migration
 * newer than the last one it recorded in `drizzle.__drizzle_migrations`).
 */
export async function pendingMigrations(client: Client, folder = MIGRATIONS_FOLDER): Promise<string[]> {
  const { rows } = await client.query<{ exists: boolean }>("SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS exists");
  let lastApplied = -1;
  if (rows[0].exists) {
    const result = await client.query<{ last: string | null }>('SELECT max(created_at)::text AS last FROM drizzle.__drizzle_migrations');
    lastApplied = Number(result.rows[0].last ?? -1);
  }
  return journal(folder)
    .filter((entry) => entry.when > lastApplied)
    .map((entry) => entry.tag);
}

/**
 * Applies pending migrations under an advisory lock, so containers starting at the same time
 * migrate one after another. Returns the tags that were applied.
 */
export async function migrateWithLock(connectionString: string, folder = MIGRATIONS_FOLDER): Promise<string[]> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
    const pending = await pendingMigrations(client, folder);
    if (pending.length) {
      await migrate(drizzle(client), { migrationsFolder: folder });
    }
    return pending;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]).catch(() => undefined);
    await client.end();
  }
}

/** Lists pending migrations without applying them. */
export async function checkMigrations(connectionString: string, folder = MIGRATIONS_FOLDER): Promise<string[]> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    return await pendingMigrations(client, folder);
  } finally {
    await client.end();
  }
}

/** Applies all pending migrations. Used by `npm run db:migrate` and by the tests. */
export async function runMigrations(connectionString: string): Promise<void> {
  const pool = new Pool({ connectionString, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await pool.end();
  }
}
