import { expect, test } from '@playwright/test';
import { E2E, isolateExternalServices } from './helpers';

// BUG-03 regressions: the /en|/sk|/cs URL prefix decides the language, also for server rendering.

test.beforeEach(({ page }) => isolateExternalServices(page));

test('server renders the language of the URL', async ({ request }) => {
  const sk = await (await request.get(`/sk/product/${E2E.car.titleUrl}`)).text();
  expect(sk).toContain('<html lang="sk"');
  expect(sk).toContain(E2E.car.titleSk);
  expect(sk).toContain(E2E.translations.sk.Back);

  const en = await (await request.get(`/en/product/${E2E.car.titleUrl}`)).text();
  expect(en).toContain('<html lang="en"');
  expect(en).toContain(E2E.car.title);
  expect(en).not.toContain(E2E.car.titleSk);
});

test('the language switcher changes the URL prefix', async ({ page }) => {
  await page.goto(`/en/product/${E2E.car.titleUrl}`);
  await expect(page.locator('.product')).toContainText(E2E.car.title);

  await page.getByRole('combobox', { name: 'Language' }).selectOption('sk');

  await expect(page).toHaveURL(`/sk/product/${E2E.car.titleUrl}`);
  await expect(page.locator('.product')).toContainText(E2E.car.titleSk);
  await expect(page.locator('html')).toHaveAttribute('lang', 'sk');
});

test('a /sk page lists the products that have Slovak content', async ({ page }) => {
  await page.goto('/sk/product/all');

  await expect(page.locator('.product_card', { hasText: E2E.car.titleSk })).toBeVisible();
  await expect(page.locator('.product_card', { hasText: E2E.bike.title })).toHaveCount(0);
});

test('the home page keeps the last chosen language (cookie)', async ({ page }) => {
  await page.goto('/sk/product/all');
  await expect(page.locator('html')).toHaveAttribute('lang', 'sk');

  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'sk');
});
