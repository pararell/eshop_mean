import { expect, test } from '@playwright/test';
import { isolateExternalServices, withDb } from './helpers';

test.beforeEach(({ page }) => isolateExternalServices(page));

/** A temporary active theme with this home layout (the e2e database has no active theme); null removes it */
const setHome = (home: unknown[] | null) =>
  withDb(async (db) => {
    await db.query(`DELETE FROM themes WHERE title_url = 'e2e-home'`);
    if (home) await db.query(`INSERT INTO themes (title_url, active, styles) VALUES ('e2e-home', true, $1)`, [JSON.stringify({ home })]);
  });

/** The home sections on the page, top to bottom */
const sectionNames = (page: import('@playwright/test').Page) =>
  page
    .locator('.main > section, .main > .home-products-band')
    .evaluateAll((elements) =>
      elements.map((el) =>
        el.classList.contains('hero')
          ? 'hero'
          : el.classList.contains('benefits')
            ? 'benefits'
            : el.classList.contains('home-products-band')
              ? 'products'
              : el.classList.contains('promo-banner-wrap')
                ? 'band'
                : 'categories',
      ),
    );

test.afterEach(() => setHome(null));

test('without a layout the home page keeps its default order', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => sectionNames(page)).toEqual(['hero', 'benefits', 'categories', 'products']);
});

test("the home page follows the theme's section order, hides disabled sections and shows bands", async ({ page }) => {
  await setHome([
    { id: 'hero', type: 'hero', enabled: true },
    { id: 'products', type: 'products', enabled: true },
    { id: 'autumn', type: 'band', enabled: true, link: '/en/product/all', text: { en: { title: 'Autumn sale', text: 'Tents for the last trips' } } },
    { id: 'categories', type: 'categories', enabled: true },
    { id: 'benefits', type: 'benefits', enabled: false },
  ]);
  await page.goto('/');
  await expect.poll(() => sectionNames(page)).toEqual(['hero', 'products', 'band', 'categories']);
  await expect(page.getByRole('region', { name: 'Autumn sale' })).toContainText('Tents for the last trips');
});

test('without the hero the header is a plain bar and the page keeps an h1', async ({ page }) => {
  await setHome([{ id: 'products', type: 'products', enabled: true }]);
  await page.goto('/');
  await expect.poll(() => sectionNames(page)).toEqual(['products']);
  await expect(page.locator('app-header')).not.toHaveClass(/overlay/);
  await expect(page.locator('h1')).toHaveCount(1);
});
