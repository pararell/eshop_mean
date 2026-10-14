import { expect, test } from '@playwright/test';
import { addToCart, E2E, expectCartCount, isolateExternalServices } from './helpers';

test.beforeEach(({ page }) => isolateExternalServices(page));

test('adds products to the cart and shows totals with shipping', async ({ page }) => {
  await addToCart(page, E2E.car.titleUrl, 2);
  await expectCartCount(page, 2);

  await page.goto('/en/cart');
  const total = 2 * E2E.car.price + E2E.shipping;
  await expect(page.locator('app-cart')).toContainText(`${E2E.car.title}`);
  await expect(page.locator('app-cart')).toContainText(`Shipping (basic) ${E2E.shipping} EUR`);
  await expect(page.locator('app-cart')).toContainText(`2 ks ${total} EUR`);
});

test('keeps the cart across page reloads (server session)', async ({ page }) => {
  await addToCart(page, E2E.bike.titleUrl);
  await page.reload();
  await expectCartCount(page, 1);
});

test('removes items from the cart', async ({ page }) => {
  await addToCart(page, E2E.car.titleUrl, 2);
  await page.goto('/en/cart');

  const removed = page.waitForResponse((r) => r.url().includes('/api/cart/remove') && r.ok());
  await page.locator('.cart-remove').first().click();
  await removed;

  await expectCartCount(page, 1);
  await expect(page.locator('app-cart')).toContainText(`1 ks ${E2E.car.price + E2E.shipping} EUR`);
});
