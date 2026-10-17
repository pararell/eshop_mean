import { expect, Page, test } from '@playwright/test';
import { E2E, isolateExternalServices, payByCard, signIn, withDb } from './helpers';

test.beforeEach(async ({ page }) => {
  await isolateExternalServices(page);
  await signIn(page, E2E.admin.email, E2E.admin.password);
  await expect(page.getByText('SIGNIN_SUCCESS')).toBeVisible();
});

const editor = (page: Page) => page.locator('app-product-editor');

test('admin creates a product that appears in the shop', async ({ page, request }) => {
  const suffix = Date.now();
  const titleUrl = `e2e-scooter-${suffix}`;
  const title = `E2E Scooter ${suffix}`;
  await page.goto('/en/dashboard');
  await page.getByRole('link', { name: 'New product' }).click();
  await expect(page).toHaveURL('/en/dashboard/products/new');

  const form = editor(page);
  await form.getByLabel('Title', { exact: true }).fill(title);
  // the URL follows the English title until it is edited
  await expect(form.getByLabel('Product URL')).toHaveValue(titleUrl);
  await form.getByLabel('Short description').fill('Fast scooter');
  await form.getByLabel('Sale price').fill('40');
  await form.getByLabel('Regular price').fill('45');
  await form.getByRole('switch', { name: 'Visible in the shop (EN)' }).click();
  await form.getByPlaceholder('Add category…').fill('Scooters');
  await form.getByPlaceholder('Add category…').press('Enter');
  await expect(form.getByRole('row', { name: /scooters/ })).toBeVisible();

  const added = page.waitForResponse((r) => r.url().includes('/api/products/add'));
  await form.getByRole('button', { name: 'Save', exact: true }).click();
  expect((await added).status()).toBe(201);
  await expect(page.getByText('Product saved')).toBeVisible();
  await expect(page).toHaveURL(`/en/dashboard/products/${titleUrl}`);

  // The product list shows it
  await page.goto('/en/dashboard');
  await expect(page.locator('app-admin-products').getByRole('link', { name: title })).toBeVisible();

  await expect.poll(async () => (await request.get(`/api/products/${titleUrl}?lang=en`)).status()).toBe(200);
  await page.goto(`/en/product/${titleUrl}`);
  await expect(page.locator('mat-card.product')).toContainText(title);
  await expect(page.locator('mat-card.product')).toContainText('40 EUR');
});

test('admin edits a product price from the product list', async ({ page, request }) => {
  await page.goto('/en/dashboard');
  const list = page.locator('app-admin-products');
  await list.getByLabel('Search title or URL').fill('bike');
  await list.getByRole('link', { name: E2E.bike.title }).click();
  await expect(page).toHaveURL(`/en/dashboard/products/${E2E.bike.titleUrl}`);

  const form = editor(page);
  await expect(form.getByLabel('Title', { exact: true })).toHaveValue(E2E.bike.title);
  await expect(form.getByLabel('Product URL')).toBeDisabled();
  await form.getByLabel('Sale price').fill('55');

  const edited = page.waitForResponse((r) => r.url().includes('/api/products/edit'));
  await form.getByRole('button', { name: 'Save', exact: true }).click();
  expect((await edited).status()).toBe(200);

  const product = await (await request.get(`/api/products/${E2E.bike.titleUrl}?lang=en`)).json();
  expect(product.salePrice).toBe(55);
});

test('the editor explains what is missing before saving', async ({ page }) => {
  await page.goto('/en/dashboard/products/new');
  const form = editor(page);
  await form.getByLabel('Title', { exact: true }).fill('Incomplete product');
  await form.getByRole('switch', { name: 'Visible in the shop (EN)' }).click();

  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await form.getByRole('button', { name: 'Save', exact: true }).click();

  await expect(form.getByRole('alert').filter({ hasText: 'Some fields need attention' })).toBeVisible();
  await expect(form.getByText('A visible product needs a price')).toBeVisible();
  await expect(form.getByLabel('Sale price')).toBeFocused();
  expect(requests.some((url) => url.includes('/api/products/add'))).toBe(false);
});

test('admin opens the order list and an order detail', async ({ page }) => {
  await page.goto('/en/dashboard/orders');
  const list = page.locator('app-orders-list');
  await expect(list).toContainText('seed@e2e.test');

  // The Detail link is built from the orderUrl input + orderId
  // closest element around the seeded order that contains its own Detail button
  const seededOrder = list.getByText('seed@e2e.test').locator('xpath=ancestor::*[.//button[normalize-space()="Detail"]][1]');
  await seededOrder.getByRole('button', { name: 'Detail' }).click();
  await expect(page).toHaveURL(`/en/dashboard/orders/${E2E.order.orderId}`);
  const detail = page.locator('app-order-detail');
  await expect(detail).toContainText('Status: NEW');
  await expect(detail).toContainText(`${E2E.order.amount} EUR`);
  await expect(detail).toContainText(E2E.order.customer);
});

test('admin refunds part of a card order', async ({ page }) => {
  const orderId = await payByCard(page, E2E.car.titleUrl, `refund-${Date.now()}@e2e.test`);

  await page.goto(`/en/dashboard/orders/${orderId}`);
  const refund = page.getByRole('region', { name: 'Card payment' });
  await expect(refund).toContainText('pi_stub_');
  await refund.getByLabel(/Refund amount/).fill('5');
  page.once('dialog', (dialog) => dialog.accept());
  const refunded = page.waitForResponse((r) => r.url().includes(`/api/admin/orders/${orderId}/refund`));
  await refund.getByRole('button', { name: 'Refund' }).click();
  expect((await refunded).status()).toBe(200);

  await expect(refund).toContainText('refunded 5 EUR');
  const [row] = await withDb(
    async (db) => (await db.query('SELECT status, amount_refunded::float8 AS refunded FROM orders WHERE order_number = $1', [orderId])).rows,
  );
  expect(row).toEqual({ status: 'PAID', refunded: 5 });
});
