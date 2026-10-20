import { expect, test } from '@playwright/test';
import { E2E, isolateExternalServices, withDb } from './helpers';

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
  await page.locator('.product_card', { hasText: E2E.car.title }).getByRole('link', { name: E2E.car.title }).click();

  await expect(page).toHaveURL(`/en/product/${E2E.car.titleUrl}`);
  await expect(page).toHaveTitle(new RegExp(E2E.car.title));
  const product = page.locator('.product');
  await expect(product).toContainText(`${E2E.car.price} EUR`);
  await expect(product).toContainText(`${E2E.car.title} full description`);
});

test('home banner shows the image of the active theme', async ({ page }) => {
  const image = 'https://banner.e2e.test/hero.svg';
  await page.route('https://banner.e2e.test/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>' }),
  );
  await withDb((db) =>
    db.query(`INSERT INTO themes (title_url, active, styles) VALUES ('e2e-banner', true, $1)`, [JSON.stringify({ promoSlideBackground: image })]),
  );
  try {
    await page.goto('/');
    // The theme is part of the server-rendered page
    // Only the theme's image: it replaces the newest product as the banner
    await expect(page.locator('.hero img.hero-media')).toHaveAttribute('src', image);
    await expect(page.locator('.hero .hero-media')).toHaveCount(1);
  } finally {
    await withDb((db) => db.query(`DELETE FROM themes WHERE title_url = 'e2e-banner'`));
  }
});

test('unknown URLs answer 404 with the not-found page', async ({ request, page }) => {
  const response = await request.get('/en/no-such-trail');
  expect(response.status()).toBe(404);
  expect(await response.text()).toContain('Not_found_title');

  await page.goto('/en/no-such-trail');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Not_found_title/i);
  await expect(page.getByRole('link', { name: 'Products' }).last()).toBeVisible();
});
