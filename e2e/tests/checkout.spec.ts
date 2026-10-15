import { expect, test } from '@playwright/test';
import { addToCart, choosePayment, E2E, expectCartCount, fillAddressStep, isolateExternalServices, withDb } from './helpers';

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

test('card payment: tokenizes the card with Stripe.js and submits the token', async ({ page }) => {
  // The server would charge the card through Stripe; in e2e the API call is answered here
  // and the request the browser sends is asserted instead (server side is covered by API tests).
  let payload: any;
  await page.route('**/api/orders/stripe', async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({
      json: {
        error: '',
        result: {
          orderId: 'order-e2e',
          status: 'PAID',
          amount: 2 * E2E.car.price + E2E.shipping,
          currency: 'EUR',
          customerEmail: 'jane@e2e.test',
          dateAdded: new Date().toISOString(),
          outcome: { seller_message: 'WITH_PAYMENT' },
          addresses: [{ name: 'Jane Doe' }],
          cart: { items: [], totalPrice: 2 * E2E.car.price + E2E.shipping, totalQty: 2 },
        },
        cart: { items: [], totalPrice: 0, totalQty: 0 },
      },
    });
  });

  await addToCart(page, E2E.car.titleUrl, 2);
  await page.goto('/en/cart');
  await fillAddressStep(page);
  await choosePayment(page, 'card');

  const pay = page.locator('#submit-button');
  await expect(pay).toBeEnabled();
  await pay.click();

  await expect.poll(() => payload).toBeTruthy();
  expect(payload).toMatchObject({
    token: { id: 'tok_e2e' },
    currency: 'EUR',
    email: 'jane@e2e.test',
    addresses: [expect.objectContaining({ name: 'Jane Doe', city: 'Bratislava' })],
  });
  await expect(page.locator('body')).toContainText('WITH_PAYMENT');
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
