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
  page.locator('.main > section, .main > .home-products-band, .main > app-home-product-row').evaluateAll((elements) =>
    elements.map((el) => {
      const is = (name: string) => el.classList.contains(name);
      if (el.tagName === 'APP-HOME-PRODUCT-ROW') return 'row';
      if (is('hero')) return 'hero';
      if (is('benefits')) return 'benefits';
      if (is('home-products-band')) return 'products';
      if (is('promo-banner-wrap') || is('band-full')) return 'band';
      if (is('trips')) return 'trips';
      return 'categories';
    }),
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

test('shop by trip, a category product row, a full-width band and ridges', async ({ page }) => {
  await setHome([
    { id: 'trips', type: 'trips', enabled: true, categories: ['bikes', 'deleted', 'cars'], text: { en: { title: 'Shop by trip' } } },
    { id: 'bike-row', type: 'productRow', enabled: true, source: 'category', category: 'bikes', text: { en: { title: 'Bike picks' } } },
    {
      id: 'autumn',
      type: 'band',
      enabled: true,
      width: 'full',
      divider: 'ridge',
      link: '/en/product/all',
      text: { en: { title: 'Autumn sale', button: 'See the deals' } },
    },
  ]);
  await page.goto('/');
  await expect.poll(() => sectionNames(page)).toEqual(['trips', 'row', 'band']);

  const trips = page.getByRole('region', { name: 'Shop by trip' });
  await expect(trips.getByRole('link')).toHaveText([/Bikes/, /Cars/]);
  const row = page.getByRole('region', { name: 'Bike picks' });
  await expect(row).toContainText('E2E Bike');
  await expect(row).not.toContainText('E2E Car');
  await expect(page.getByRole('region', { name: 'Autumn sale' }).getByRole('link', { name: 'See the deals' })).toBeVisible();
  // One ridge under the band, one above the footer
  await expect(page.locator('app-ridge')).toHaveCount(2);
});

test('a category set to "Fill the tile (cover)" fills its tile with the photo', async ({ page }) => {
  const setCover = (cover: boolean) =>
    withDb((db) =>
      db.query(`UPDATE categories SET main_image_cover = $1, main_image_url = $2 WHERE title_url = 'cars'`, [
        cover,
        cover ? 'https://img.test/cars.jpg' : null,
      ]),
    );
  await setCover(true);
  try {
    await page.goto('/');
    const media = page.locator('.category_card-media');
    await expect(media).toHaveCount(2);
    await expect(page.locator('.category_card-cover')).toHaveCount(1);
    await expect(page.locator('.category_card-cover img')).toHaveCSS('object-fit', 'cover');
  } finally {
    await setCover(false);
  }
});
