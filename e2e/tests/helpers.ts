import { expect, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import mongoose from 'mongoose';

export { E2E } from '../support/fixtures.mjs';

/**
 * Minimal stand-in for Stripe.js v3: the card element reports "complete" right away and
 * createToken resolves a test token. No request ever reaches Stripe.
 */
const fakeStripeJs = `
window.Stripe = function () {
  return {
    elements: () => ({
      create: () => ({
        mount() {},
        addEventListener(event, callback) { setTimeout(() => callback({ complete: true }), 50); },
      }),
    }),
    createToken: () => Promise.resolve({ token: { id: 'tok_e2e' } }),
  };
};`;

/** Keeps tests hermetic: fake Stripe.js, no TinyMCE cloud, reCAPTCHA or analytics. */
export async function isolateExternalServices(page: Page) {
  await page.route('https://js.stripe.com/**', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: fakeStripeJs }),
  );
  await page.route(/tiny\.cloud|tinymce|recaptcha|googletagmanager|google-analytics/, (route) => route.abort());
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/en/authorize/signin');
  await page.locator('[formcontrolname=email]').fill(email);
  await page.locator('[formcontrolname=password]').fill(password);
  await page.locator('button[type=submit]').click();
}

/** Adds a product to the cart from its detail page, `times` times. */
export async function addToCart(page: Page, titleUrl: string, times = 1) {
  await page.goto(`/en/product/${titleUrl}`);
  for (let i = 0; i < times; i++) {
    const added = page.waitForResponse((r) => r.url().includes('/api/cart/add') && r.ok());
    await page.locator('app-product-content .cart_show-wrap').first().click();
    await added;
  }
}

export async function fillAddressStep(page: Page, email = 'jane@e2e.test') {
  const field = (name: string) => page.locator(`[formcontrolname="${name}"]`);
  await field('name').fill('Jane Doe');
  await field('email').fill(email);
  await field('address').fill('Main 1');
  await field('city').fill('Bratislava');
  await field('zip').fill('81101');
  await field('country').fill('SK');
  await page.getByRole('button', { name: 'Next' }).first().click();
}

export async function choosePayment(page: Page, method: 'card' | 'delivery') {
  await page.getByRole('radio', { name: method === 'card' ? /with card/ : /on delivery/ }).check();
  await page.getByRole('button', { name: 'Next' }).filter({ visible: true }).click();
}

/** Direct database access for assertions (URI written by support/start-server.mjs). */
export async function withDb<T>(fn: (db: mongoose.mongo.Db) => Promise<T>): Promise<T> {
  const { mongoUri } = JSON.parse(
    readFileSync(resolve(__dirname, '../../test-results/e2e-state.json'), 'utf8'),
  );
  const conn = await mongoose.createConnection(mongoUri).asPromise();
  try {
    return await fn(conn.db!);
  } finally {
    await conn.close();
  }
}

/** The header badge shows the item count; it shows no number for an empty cart. */
export async function expectCartCount(page: Page, count: number) {
  const badge = page.locator('.nav-cart-wrap');
  if (count === 0) {
    await expect(badge).not.toContainText(/\d/);
  } else {
    await expect(badge).toContainText(String(count));
  }
}
