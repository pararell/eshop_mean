import { expect, Page, test } from '@playwright/test';
import { E2E, isolateExternalServices, signIn } from './helpers';

test.beforeEach(async ({ page }) => {
  await isolateExternalServices(page);
  await signIn(page, E2E.admin.email, E2E.admin.password);
  await expect(page.getByText('SIGNIN_SUCCESS')).toBeVisible();
});

const productForm = (page: Page) => page.locator('app-products-edit').filter({ visible: true });

test('admin creates a product that appears in the shop', async ({ page, request }) => {
  const titleUrl = `e2e-scooter-${Date.now()}`;
  await page.goto('/en/dashboard');
  await page.getByRole('tab', { name: 'Add product' }).click();

  const form = productForm(page);
  const field = (name: string) => form.locator(`[formcontrolname="${name}"]`);
  await field('titleUrl').fill(titleUrl);
  await field('title').fill('E2E Scooter');
  await field('salePrice').fill('40');
  await field('regularPrice').fill('45');
  await field('description').fill('Fast scooter');
  await form.locator('#visible input').check();
  await form.locator('#onStock input').check();
  await form.locator('#normal input').check();
  await form.locator('#basic input').check();
  await form.locator('input[name=tag]').fill('Scooters');
  await form.getByRole('button', { name: 'Add Tag' }).click();

  const added = page.waitForResponse((r) => r.url().includes('/api/products/add'));
  await form.getByRole('button', { name: 'Save' }).click();
  expect((await added).status()).toBe(201);

  // The dashboard list is reloaded after saving (BUG-28 regression; it used to be emptied)
  await page.getByRole('tab', { name: 'All products' }).click();
  await expect(page.locator('app-all-products .product_card', { hasText: 'E2E Scooter' })).toBeVisible();

  await expect.poll(async () => (await request.get(`/api/products/${titleUrl}?lang=en`)).status()).toBe(200);
  await page.goto(`/en/product/${titleUrl}`);
  await expect(page.locator('mat-card.product')).toContainText('E2E Scooter');
  await expect(page.locator('mat-card.product')).toContainText('40 EUR');
});

test('admin edits a product price', async ({ page, request }) => {
  await page.goto('/en/dashboard');
  await page.locator('.product_card', { hasText: E2E.bike.title }).getByText('Edit').click();

  const form = productForm(page);
  await expect(form.locator('[formcontrolname=title]')).toHaveValue(E2E.bike.title);
  await form.locator('[formcontrolname=salePrice]').fill('55');

  const edited = page.waitForResponse((r) => r.url().includes('/api/products/edit'));
  await form.getByRole('button', { name: 'Save' }).click();
  expect((await edited).status()).toBe(200);

  const product = await (await request.get(`/api/products/${E2E.bike.titleUrl}?lang=en`)).json();
  expect(product.salePrice).toBe(55);
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
