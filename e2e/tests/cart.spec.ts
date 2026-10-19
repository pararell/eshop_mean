import { expect, test } from '@playwright/test';
import { addToCart, E2E, expectCartCount, isolateExternalServices } from './helpers';

test.beforeEach(({ page }) => isolateExternalServices(page));

test('adds products to the cart and shows totals with shipping', async ({ page }) => {
  await addToCart(page, E2E.car.titleUrl, 2);
  await expectCartCount(page, 2);

  await page.goto('/en/cart');
  const total = 2 * E2E.car.price + E2E.shipping;
  await expect(page.locator('app-cart')).toContainText(`${E2E.car.title}`);
  await expect(page.locator('.cart-shipping')).toContainText('Shipping (basic)');
  await expect(page.locator('.cart-shipping')).toContainText(`${E2E.shipping} EUR`);
  await expect(page.locator('.cart-qty')).toHaveText('2');
  await expect(page.locator('.cart-total')).toContainText(`${total} EUR`);
});

test('changes the quantity in the cart', async ({ page }) => {
  await addToCart(page, E2E.car.titleUrl);
  await page.goto('/en/cart');

  const added = page.waitForResponse((r) => r.url().includes('/api/cart/add') && r.ok());
  await page.locator('app-cart .cart_show-wrap').first().click();
  await added;

  await expectCartCount(page, 2);
  await expect(page.locator('.cart-total')).toContainText(`${2 * E2E.car.price + E2E.shipping} EUR`);
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
  await page.locator('app-cart .cart_show-remove').first().click();
  await removed;

  await expectCartCount(page, 1);
  await expect(page.locator('.cart-qty')).toHaveText('1');
  await expect(page.locator('.cart-total')).toContainText(`${E2E.car.price + E2E.shipping} EUR`);
});
