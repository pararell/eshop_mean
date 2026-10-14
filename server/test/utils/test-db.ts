import { randomBytes } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import type { Database } from '../../src/db/database.module';
import * as schema from '../../src/db/schema';

export interface TestDatabase {
  url: string;
  db: Database;
  pool: Pool;
  /** Closes the pool and drops the database */
  drop: () => Promise<void>;
}

const withDatabase = (uri: string, database: string) => {
  const url = new URL(uri);
  url.pathname = `/${database}`;
  return url.toString();
};

/**
 * A fresh, fully migrated PostgreSQL database for one test file, cloned from the template that
 * global-setup.cjs prepares (cloning is fast and needs no migrations).
 */
export async function createTestDatabase(): Promise<TestDatabase> {
  const adminUrl = process.env.TEST_PG_ADMIN_URL;
  const template = process.env.TEST_PG_TEMPLATE_DB;
  if (!adminUrl || !template) {
    throw new Error('PostgreSQL test container is not running (see server/test/setup/global-setup.cjs)');
  }

  const name = `eshop_test_${process.env.JEST_WORKER_ID}_${randomBytes(4).toString('hex')}`;
  const admin = new Pool({ connectionString: adminUrl, max: 1 });
  await admin.query(`CREATE DATABASE ${name} TEMPLATE ${template}`);
  await admin.end();

  const url = withDatabase(adminUrl, name);
  const pool = new Pool({ connectionString: url, max: 5 });

  return {
    url,
    pool,
    db: drizzle(pool, { schema }),
    drop: async () => {
      await pool.end();
      const cleanup = new Pool({ connectionString: adminUrl, max: 1 });
      await cleanup.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      await cleanup.end();
    },
  };
}
