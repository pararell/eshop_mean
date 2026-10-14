const { resolve } = require('node:path');
const { MongoMemoryServer } = require('mongodb-memory-server-core');
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

// One in-memory MongoDB and one disposable PostgreSQL 18 (Docker) for the whole run.
// PostgreSQL: migrations are applied once to a template database; each test file clones it
// (see test/utils/test-db.ts). MongoDB: each test file uses its own database (see env.ts).
module.exports = async () => {
  const mongo = await MongoMemoryServer.create();
  globalThis.__MONGO_SERVER__ = mongo;
  process.env.TEST_MONGO_BASE_URI = mongo.getUri();

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
