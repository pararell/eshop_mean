import { expect, test } from '@playwright/test';
import { E2E, isolateExternalServices } from './helpers';

test.beforeEach(({ page }) => isolateExternalServices(page));

test('home page renders products server-side', async ({ page, request }) => {
  // The raw HTML already contains the products (SSR), before any client JS runs
  const html = await (await request.get('/')).text();
  expect(html).toContain(E2E.car.title);
  expect(html).toContain('ng-server-context="ssr"');

  await page.goto('/');
  await expect(page.locator('.product_card', { hasText: E2E.car.title }).first()).toBeVisible();
});

test('product list shows prices and filters by category', async ({ page }) => {
  await page.goto('/en/product/all');

  const car = page.locator('.product_card', { hasText: E2E.car.title });
  await expect(car).toContainText(`${E2E.car.price} EUR`);
  await expect(page.locator('.product_card', { hasText: E2E.bike.title })).toBeVisible();

  await page.goto('/en/product/category/bikes');
  await expect(page.locator('.product_card', { hasText: E2E.bike.title })).toBeVisible();
  await expect(page.locator('.product_card', { hasText: E2E.car.title })).toHaveCount(0);
});

test('product detail shows title, price and full description', async ({ page }) => {
  await page.goto('/en/product/all');
  await page.locator('.product_card', { hasText: E2E.car.title }).getByRole('link', { name: 'Detail' }).click();

  await expect(page).toHaveURL(`/en/product/${E2E.car.titleUrl}`);
  await expect(page).toHaveTitle(new RegExp(E2E.car.title));
  const product = page.locator('mat-card.product');
  await expect(product).toContainText(`${E2E.car.price} EUR`);
  await expect(product).toContainText(`${E2E.car.title} full description`);
});
