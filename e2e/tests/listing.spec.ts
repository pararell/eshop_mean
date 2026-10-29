import { expect, test } from '@playwright/test';
import { E2E, isolateExternalServices, withDb } from './helpers';

test.beforeEach(({ page }) => isolateExternalServices(page));

const photo = (name: string) => `https://res.cloudinary.com/e2e/image/upload/${name}.jpg`;

/** A temporary active theme with these listing settings (the e2e database has no active theme); null removes it */
const setListing = (listing: object | null) =>
  withDb(async (db) => {
    await db.query(`DELETE FROM themes WHERE title_url = 'e2e-listing'`);
    if (listing) await db.query(`INSERT INTO themes (title_url, active, styles) VALUES ('e2e-listing', true, $1)`, [JSON.stringify({ listing })]);
  });
const setCategoryHeader = (url: string | null) =>
  withDb((db) => db.query(`UPDATE categories SET header_image_url = $1 WHERE title_url = 'cars'`, [url]));

test.afterEach(async () => {
  await setListing(null);
  await setCategoryHeader(null);
});

const tile = (id: string, title: string, pages: string[] = []) => ({
  id,
  image: photo(id),
  link: '/en/product/category/bikes',
  pages,
  text: { en: { title, text: `${title} text`, button: 'Ride on' } },
});

test('All products has a photo header with its own texts, and a tile after every N products', async ({ page, request }) => {
  await setListing({
    header: { image: photo('all'), text: { en: { title: 'All the gear', text: 'For every trail' } } },
    tileEvery: 2,
    tiles: [tile('cars-only', 'Only on cars', ['cars']), tile('hills', 'Into the hills'), tile('sk-only', '')],
  });

  // Server-rendered: crawlers and the first paint get the header and the tile
  const html = await (await request.get('/en/product/all')).text();
  expect(html).toMatch(/<h1[^>]*class="products-title"[^>]*>\s*All the gear\s*<\/h1>/);
  expect(html).toContain('products-header--photo');

  await page.goto('/en/product/all');
  const header = page.locator('.products-header');
  await expect(header.getByRole('heading', { level: 1 })).toHaveText('All the gear');
  await expect(header).toContainText('For every trail');
  await expect(header.locator('img.products-header-media')).toHaveAttribute('src', /all\.jpg/);

  // The tile follows the second product; the cars-only tile and the one without an English title are left out
  const items = page.locator('app-products-list .product-grid > li');
  await expect(items.nth(2)).toHaveClass(/listing_tile/);
  const tiles = page.locator('.listing_tile');
  await expect(tiles.first()).toContainText('Into the hills');
  await expect(page.getByText('Only on cars')).toHaveCount(0);
  await expect(tiles.first().getByRole('link')).toHaveAttribute('href', '/en/product/category/bikes');
  await expect(tiles.first()).toContainText('Ride on');

  // Two columns wide
  const [tileBox, cardBox] = [await tiles.first().boundingBox(), await items.first().boundingBox()];
  expect(tileBox!.width).toBeGreaterThan(cardBox!.width * 1.9);
});

test('a featured product comes first, larger, and is not repeated in the grid', async ({ page }) => {
  await setListing({ featured: [{ page: '*', source: 'product', product: E2E.bike.titleUrl }] });
  await page.goto('/en/product/all');

  const featured = page.locator('.product_card--featured');
  await expect(featured).toHaveCount(1);
  await expect(page.locator('app-products-list .product-grid > li').first()).toHaveClass(/product_card--featured/);
  await expect(featured).toContainText(E2E.bike.title);
  await expect(featured).toContainText('Featured');
  await expect(page.locator('.product_card').filter({ hasText: E2E.bike.title })).toHaveCount(1);

  const [featuredBox, cardBox] = [
    await featured.boundingBox(),
    await page.locator('.product_card:not(.product_card--featured)').first().boundingBox(),
  ];
  expect(featuredBox!.width).toBeGreaterThan(cardBox!.width * 1.9);
  // Two rows tall (the e2e shop has too few products to fill the second row)
  expect(await featured.evaluate((el) => getComputedStyle(el).gridRowStart)).toBe('span 2');
  expect(featuredBox!.height).toBeGreaterThan(cardBox!.height);

  // Not on another page of the list, nor on a category without its own setting
  await page.goto('/en/product/category/cars');
  await expect(page.locator('.product_card').first()).toBeVisible();
  await expect(featured).toHaveCount(0);
});

test("a category page header uses the category's header photo, title and the pills mark the category", async ({ page }) => {
  await setCategoryHeader(photo('cars-wide'));
  await page.goto('/en/product/category/cars');

  const header = page.locator('.products-header--photo');
  await expect(header.getByRole('heading', { level: 1 })).toHaveText('Cars');
  await expect(header.locator('img.products-header-media')).toHaveAttribute('src', /cars-wide\.jpg/);

  const pill = page.locator('.products-sidebar-desktop a.sidebar-item.active');
  await expect(pill).toHaveText(/Cars/);
  // A rounded pill outlined in its trail color
  const style = await pill.evaluate((el) => {
    const css = getComputedStyle(el);
    return {
      radius: parseFloat(css.borderTopLeftRadius),
      border: css.borderTopColor,
      blaze: getComputedStyle(el.querySelector('.blaze')!).backgroundImage,
    };
  });
  expect(style.radius).toBeGreaterThan(15);
  expect(style.blaze).toContain(style.border);
});
