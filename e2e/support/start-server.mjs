// Starts the production build (dist/eshop/server/server.mjs) against a seeded in-memory MongoDB.
// Used as Playwright's webServer; run `npm run build:ssr` first (npm run test:e2e does).
import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import { E2E, testEnv } from './fixtures.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const port = process.env.E2E_PORT ?? '4600';
const baseURL = `http://localhost:${port}`;

const mongo = await MongoMemoryServer.create();
const mongoUri = mongo.getUri('eshop_e2e');
await seed(mongoUri);

// Lets specs inspect the database (e.g. to assert that an order was stored)
const stateFile = resolve(root, 'test-results/e2e-state.json');
mkdirSync(dirname(stateFile), { recursive: true });
writeFileSync(stateFile, JSON.stringify({ mongoUri, baseURL }));

const server = spawn(process.execPath, ['dist/eshop/server/server.mjs'], {
  cwd: root,
  // Explicit values override anything a local .env would provide
  env: { ...process.env, ...testEnv(baseURL), MONGO_URI: mongoUri, PORT: port },
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
  await mongo.stop();
  process.exit(code);
};
process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());
server.on('exit', (code) => shutdown(code ?? 0));

async function seed(uri) {
  const conn = await mongoose.createConnection(uri).asPromise();
  const db = conn.db;

  const salt = await bcrypt.genSalt();
  await db.collection('users').insertOne({
    email: E2E.admin.email,
    password: await bcrypt.hash(E2E.admin.password, salt),
    salt,
    roles: ['admin'],
  });

  const lang = (title, salePrice, shipping = 'basic') => ({
    en: {
      title,
      description: `${title} short description`,
      descriptionFull: [`<p>${title} full description</p>`],
      regularPrice: salePrice + 5,
      salePrice,
      onSale: true,
      stock: 'onStock',
      visibility: true,
      shipping,
    },
  });
  await db.collection('products').insertMany([
    {
      titleUrl: E2E.car.titleUrl,
      tags: ['cars'],
      images: [],
      mainImage: { url: '', name: '' },
      dateAdded: new Date('2026-02-01'),
      ...lang(E2E.car.title, E2E.car.price),
      // Slovak content only for the car (the bike has none, so it is hidden on /sk pages)
      sk: { ...lang(E2E.car.titleSk, E2E.car.price).en },
    },
    {
      titleUrl: E2E.bike.titleUrl,
      tags: ['bikes'],
      images: [],
      mainImage: { url: '', name: '' },
      dateAdded: new Date('2026-01-01'),
      ...lang(E2E.bike.title, E2E.bike.price),
    },
  ]);
  await db.collection('categories').insertMany([
    { titleUrl: 'cars', en: { title: 'Cars', position: 1, visibility: true } },
    { titleUrl: 'bikes', en: { title: 'Bikes', position: 2, visibility: true } },
  ]);
  await db.collection('configs').insertOne({
    titleUrl: 'default',
    active: true,
    en: { shippingCost: { basic: { cost: E2E.shipping, limit: 1000 }, extended: { cost: 10, limit: 2000 } } },
  });
  await db.collection('translations').insertMany([
    { lang: 'en', keys: {} },
    { lang: 'sk', keys: E2E.translations.sk },
  ]);
  await db.collection('orders').insertOne({
    orderId: E2E.order.orderId,
    amount: E2E.order.amount,
    currency: 'EUR',
    status: 'NEW',
    type: 'PAYMENT_ON_DELIVERY',
    customerEmail: 'seed@e2e.test',
    outcome: { seller_message: 'PAYMENT_ON_DELIVERY' },
    addresses: [{ name: E2E.order.customer, line1: 'Main 1', city: 'Bratislava', zip: '81101', country: 'SK' }],
    cart: { items: [], totalPrice: E2E.order.amount, totalQty: 1, shippingCost: 5, shippingLimit: 1000, shippingType: 'basic' },
    dateAdded: new Date('2026-03-01'),
  });

  await conn.close();
}
