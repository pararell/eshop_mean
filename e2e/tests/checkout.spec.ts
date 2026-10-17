import { expect, Page, test } from '@playwright/test';
import { addToCart, choosePayment, E2E, e2eState, expectCartCount, fillAddressStep, isolateExternalServices, withDb } from './helpers';

test.beforeEach(({ page }) => isolateExternalServices(page));

test('cash on delivery: places an order and shows the confirmation', async ({ page }) => {
  const email = `cod-${Date.now()}@e2e.test`;
  await addToCart(page, E2E.car.titleUrl);
  await page.goto('/en/cart');

  await fillAddressStep(page, email);
  await choosePayment(page, 'delivery');
  const ordered = page.waitForResponse((r) => r.url().includes('/api/orders/add'));
  await page.locator('.submit-order-button').click();
  expect((await ordered).status()).toBe(201);

  const total = E2E.car.price + E2E.shipping;
  await expect(page.locator('body')).toContainText('PAYMENT_ON_DELIVERY');
  await expect(page.locator('body')).toContainText(`Total_price: ${total}`);
  await expect(page.locator('body')).toContainText('Name: Jane Doe');
  await expectCartCount(page, 0);

  const order = await withDb(async (db) => {
    const { rows } = await db.query('SELECT status, type, amount::float8 AS amount, currency, addresses FROM orders WHERE customer_email = $1', [
      email,
    ]);
    return rows[0];
  });
  expect(order).toMatchObject({ status: 'NEW', type: 'PAYMENT_ON_DELIVERY', amount: total, currency: 'EUR' });
  expect(order?.addresses[0]).toMatchObject({ name: 'Jane Doe', city: 'Bratislava' });
});

const stripeCalls = (page: Page) =>
  page.evaluate(() => (window as unknown as { __stripeCalls: { method: string; [k: string]: unknown }[] }).__stripeCalls);
const stubRequests = async (): Promise<{ method: string; path: string; idempotencyKey?: string; body: any }[]> =>
  (await fetch(`${e2eState().stripeStubUrl}/__requests`)).json();
const orderByEmail = (email: string) =>
  withDb(async (db) => {
    const { rows } = await db.query(
      `SELECT order_number, status, type, amount::float8 AS amount, currency, payment_intent_id, card_id, addresses
       FROM orders WHERE customer_email = $1`,
      [email],
    );
    return rows;
  });

test('card payment: Payment Element, server-side intent, webhook marks the order paid', async ({ page }) => {
  const email = `card-${Date.now()}@e2e.test`;
  const total = 2 * E2E.car.price + E2E.shipping;
  await addToCart(page, E2E.car.titleUrl, 2);
  await page.goto('/en/cart');
  await fillAddressStep(page, email);
  await choosePayment(page, 'card');

  const pay = page.locator('#submit-button');
  await expect(pay).toBeEnabled();
  await page.getByTestId('fake-card-number').fill('4242424242424242');
  const intent = page.waitForResponse((r) => r.url().includes('/api/payments/intent'));
  const completed = page.waitForResponse((r) => r.url().includes('/api/payments/complete'));
  await pay.click();
  expect((await intent).status()).toBe(200);
  expect((await completed).status()).toBe(200);

  // Summary page, cart emptied
  await expect(page).toHaveURL('/en/cart/summary');
  await expect(page.getByRole('status')).toContainText('SuccessOrder');
  await expect(page.locator('body')).toContainText(`Total_price: ${total}`);
  await expectCartCount(page, 0);

  // Stored and paid; amount from the server, in minor units at Stripe, idempotent
  const [order] = await orderByEmail(email);
  expect(order).toMatchObject({ status: 'PAID', type: 'WITH_PAYMENT', amount: total, currency: 'EUR', card_id: expect.stringMatching(/^ch_stub_/) });
  const created = (await stubRequests()).find(
    (r) => r.method === 'POST' && r.path === '/v1/payment_intents' && r.body.metadata?.orderId === order.order_number,
  )!;
  expect(created.body).toMatchObject({
    amount: String(total * 100),
    currency: 'eur',
    automatic_payment_methods: { enabled: 'true' },
    receipt_email: email,
  });
  expect(created.idempotencyKey).toBe(`order-${order.order_number}`);
  // the stub's signed payment_intent.succeeded webhook was accepted and recorded
  const events = await withDb(async (db) => (await db.query("SELECT type FROM stripe_events WHERE type = 'payment_intent.succeeded'")).rows);
  expect(events.length).toBeGreaterThan(0);

  // What the browser asked Stripe.js for: deferred intent, the cart amount, no Apple Pay
  const calls = await stripeCalls(page);
  expect(calls.find((c) => c.method === 'elements')).toMatchObject({
    options: { mode: 'payment', amount: total * 100, currency: 'eur', locale: 'en' },
  });
  expect(calls.find((c) => c.method === 'create')).toMatchObject({ type: 'payment', options: { wallets: { applePay: 'never' } } });
  expect(calls.find((c) => c.method === 'confirmPayment')).toMatchObject({
    redirect: 'if_required',
    confirmParams: { return_url: expect.stringContaining(`/en/cart/summary?order=${order.order_number}`) },
  });
});

test('card payment: a declined card shows the error; the retry pays the same order', async ({ page }) => {
  const email = `declined-${Date.now()}@e2e.test`;
  await addToCart(page, E2E.car.titleUrl);
  await page.goto('/en/cart');
  await fillAddressStep(page, email);
  await choosePayment(page, 'card');
  await page.getByTestId('fake-card-number').fill('4000000000000002');

  await page.evaluate(() => ((window as unknown as { __e2eCardOutcome: string }).__e2eCardOutcome = 'declined'));
  await page.locator('#submit-button').click();
  await expect(page.getByRole('alert').filter({ hasText: 'Your card was declined.' })).toBeVisible();
  await expect(page).toHaveURL('/en/cart');
  await expect.poll(async () => (await orderByEmail(email))[0]?.status).toBe('PAYMENT_FAILED');
  await expectCartCount(page, 1);

  // Second attempt with another card: same order, now paid
  await page.getByTestId('fake-card-number').fill('4242424242424242');
  await page.locator('#submit-button').click();
  await expect(page).toHaveURL('/en/cart/summary');
  const orders = await orderByEmail(email);
  expect(orders).toHaveLength(1);
  expect(orders[0].status).toBe('PAID');
});

test('card payment: after a redirect (3-D Secure page) the summary page completes the order', async ({ page }) => {
  const email = `redirect-${Date.now()}@e2e.test`;
  await addToCart(page, E2E.car.titleUrl);
  await page.goto('/en/cart');
  await fillAddressStep(page, email);
  await choosePayment(page, 'card');
  await page.getByTestId('fake-card-number').fill('4000002760003184');

  await page.evaluate(() => ((window as unknown as { __e2eCardOutcome: string }).__e2eCardOutcome = 'redirect'));
  const completed = page.waitForResponse((r) => r.url().includes('/api/payments/complete'));
  await page.locator('#submit-button').click();

  await expect(page).toHaveURL(/\/en\/cart\/summary\?order=order\d+t\d+&payment_intent=pi_stub_\d+&redirect_status=succeeded/);
  expect((await completed).status()).toBe(200);
  await expect(page.getByRole('status')).toContainText('SuccessOrder');
  await expectCartCount(page, 0);
  expect((await orderByEmail(email))[0].status).toBe('PAID');
});

test('card payment: an incomplete card is caught before anything is sent', async ({ page }) => {
  await addToCart(page, E2E.car.titleUrl);
  await page.goto('/en/cart');
  await fillAddressStep(page, `incomplete-${Date.now()}@e2e.test`);
  await choosePayment(page, 'card');

  const intents: string[] = [];
  page.on('request', (r) => r.url().includes('/api/payments/intent') && intents.push(r.url()));
  await page.getByTestId('fake-card-number').fill('4242');
  await page.locator('#submit-button').click();

  await expect(page.getByRole('alert').filter({ hasText: 'Your card number is incomplete.' })).toBeVisible();
  expect(intents).toHaveLength(0);
});

test('keeps the cart and checkout when the order fails (BUG-04 regression)', async ({ page }) => {
  await page.route('**/api/orders/add', (route) => route.fulfill({ status: 500, json: { message: 'boom' } }));
  await addToCart(page, E2E.car.titleUrl);
  await page.goto('/en/cart');
  await fillAddressStep(page);
  await choosePayment(page, 'delivery');

  const failed = page.waitForResponse((r) => r.url().includes('/api/orders/add'));
  await page.locator('.submit-order-button').click();
  expect((await failed).status()).toBe(500);

  // Before the fix the error was overwritten and the cart was wiped
  await expect(page.locator('app-cart')).toContainText(E2E.car.title);
  await expect(page.locator('.submit-order-button')).toBeVisible();
  await expectCartCount(page, 1);
});
