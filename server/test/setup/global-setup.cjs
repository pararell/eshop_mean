const { resolve } = require('node:path');
const { PostgreSqlContainer } = require('@testcontainers/postgresql');
const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const { migrate } = require('drizzle-orm/node-postgres/migrator');

const TEMPLATE_DB = 'eshop_template';

const withDatabase = (uri, database) => {
  const url = new URL(uri);
  url.pathname = `/${database}`;
  return url.toString();
};

// One disposable PostgreSQL 18 (Docker) for the whole run. Migrations are applied once to a
// template database; each test file clones it (see test/utils/test-db.ts).
module.exports = async () => {
  const postgres = await new PostgreSqlContainer('postgres:18').start();
  globalThis.__POSTGRES_CONTAINER__ = postgres;
  const adminUrl = postgres.getConnectionUri();

  const admin = new Pool({ connectionString: adminUrl, max: 1 });
  await admin.query(`CREATE DATABASE ${TEMPLATE_DB}`);
  await admin.end();

  const template = new Pool({ connectionString: withDatabase(adminUrl, TEMPLATE_DB), max: 1 });
  await migrate(drizzle(template), { migrationsFolder: resolve(__dirname, '../../db/migrations') });
  await template.end();

  process.env.TEST_PG_ADMIN_URL = adminUrl;
  process.env.TEST_PG_TEMPLATE_DB = TEMPLATE_DB;
};
