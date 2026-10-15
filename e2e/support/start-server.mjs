// Starts the production build (dist/eshop/server/server.mjs) against a seeded, disposable
// PostgreSQL 18 (Docker, via Testcontainers). Used as Playwright's webServer; run
// `npm run build:ssr` first (npm run test:e2e does).
import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import bcrypt from 'bcryptjs';

import { E2E, testEnv } from './fixtures.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const port = process.env.E2E_PORT ?? '4600';
const baseURL = `http://localhost:${port}`;

const postgres = await new PostgreSqlContainer('postgres:18').start();
const databaseUrl = postgres.getConnectionUri();
await seed(databaseUrl);

// Lets specs inspect the database (e.g. to assert that an order was stored)
const stateFile = resolve(root, 'test-results/e2e-state.json');
mkdirSync(dirname(stateFile), { recursive: true });
writeFileSync(stateFile, JSON.stringify({ databaseUrl, baseURL }));

const server = spawn(process.execPath, ['dist/eshop/server/server.mjs'], {
  cwd: root,
  // Explicit values override anything a local .env would provide
  env: { ...process.env, ...testEnv(baseURL), DATABASE_URL: databaseUrl, PORT: port },
  stdio: ['ignore', 'pipe', 'pipe'],
});

// Server-side errors (e.g. during SSR) don't fail a browser test by themselves, so collect them;
// e2e/support/check-server-errors.mjs fails the run if any were logged.
const errorLog = resolve(root, 'test-results/e2e-server-errors.log');
writeFileSync(errorLog, '');
const SERVER_ERROR = /uncaughtException|unhandledRejection|Unhandled promise rejection|\bNG0\d{3}\b/;
for (const stream of [server.stdout, server.stderr]) {
  stream.on('data', (chunk) => {
    process.stderr.write(chunk);
    for (const line of chunk.toString().split('\n')) {
      if (SERVER_ERROR.test(line)) appendFileSync(errorLog, line + '\n');
    }
  });
}

const shutdown = async (code = 0) => {
  server.kill();
  await postgres.stop();
  process.exit(code);
};
process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());
server.on('exit', (code) => shutdown(code ?? 0));

async function seed(uri) {
  const pool = new pg.Pool({ connectionString: uri, max: 1 });
  await migrate(drizzle(pool), { migrationsFolder: resolve(root, 'server/db/migrations') });
  const insert = async (table, row) => {
    const columns = Object.keys(row);
    const { rows } = await pool.query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      Object.values(row),
    );
    return rows[0];
  };

  await insert('users', {
    email: E2E.admin.email,
    password_hash: await bcrypt.hash(E2E.admin.password, 10),
    roles: ['admin'],
  });

  const translation = (productId, lang, title, salePrice, shipping = 'basic') =>
    insert('product_translations', {
      product_id: productId,
      lang,
      title,
      description: `${title} short description`,
      description_full: [`<p>${title} full description</p>`],
      regular_price: salePrice + 5,
      sale_price: salePrice,
      on_sale: true,
      stock: 'onStock',
      visibility: true,
      shipping,
    });
  const car = await insert('products', {
    title_url: E2E.car.titleUrl,
    tags: ['cars'],
    main_image_url: '',
    main_image_name: '',
    created_at: new Date('2026-02-01'),
  });
  await translation(car.id, 'en', E2E.car.title, E2E.car.price);
  // Slovak content only for the car (the bike has none, so it is hidden on /sk pages)
  await translation(car.id, 'sk', E2E.car.titleSk, E2E.car.price);
  const bike = await insert('products', {
    title_url: E2E.bike.titleUrl,
    tags: ['bikes'],
    main_image_url: '',
    main_image_name: '',
    created_at: new Date('2026-01-01'),
  });
  await translation(bike.id, 'en', E2E.bike.title, E2E.bike.price);

  for (const [titleUrl, title, position] of [
    ['cars', 'Cars', 1],
    ['bikes', 'Bikes', 2],
  ]) {
    const category = await insert('categories', { title_url: titleUrl });
    await insert('category_translations', { category_id: category.id, lang: 'en', title, position, visibility: true });
  }

  const config = await insert('configs', { title_url: 'default', active: true });
  await insert('config_shipping', {
    config_id: config.id,
    lang: 'en',
    basic_cost: E2E.shipping,
    basic_limit: 1000,
    extended_cost: 10,
    extended_limit: 2000,
  });

  await insert('translations', { lang: 'en', keys: {} });
  await insert('translations', { lang: 'sk', keys: E2E.translations.sk });

  await insert('orders', {
    order_number: E2E.order.orderId,
    amount: E2E.order.amount,
    currency: 'EUR',
    status: 'NEW',
    type: 'PAYMENT_ON_DELIVERY',
    customer_email: 'seed@e2e.test',
    seller_message: 'PAYMENT_ON_DELIVERY',
    addresses: JSON.stringify([{ name: E2E.order.customer, line1: 'Main 1', city: 'Bratislava', zip: '81101', country: 'SK' }]),
    cart: { items: [], totalPrice: E2E.order.amount, totalQty: 1, shippingCost: 5, shippingLimit: 1000, shippingType: 'basic' },
    created_at: new Date('2026-03-01'),
  });

  await pool.end();
}
