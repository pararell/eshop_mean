import { expect, Page, test } from '@playwright/test';
import { E2E, isolateExternalServices, signIn, withDb } from './helpers';

// The list + editor admin pages: create, save (toast), reopen, delete after confirmation.
test.beforeEach(async ({ page }) => {
  await isolateExternalServices(page);
  await signIn(page, E2E.admin.email, E2E.admin.password);
  await expect(page.getByText('SIGNIN_SUCCESS')).toBeVisible();
});

const open = async (page: Page, path: string) => {
  await page.goto(`/en/dashboard/${path}`);
  await page.locator('html[data-app-ready]').waitFor({ state: 'attached' });
};
// Filter by text: the previous toast may still be fading out
const toast = (page: Page, text: string) => expect(page.locator('mat-snack-bar-container').filter({ hasText: text })).toBeVisible();
const list = (page: Page, name: string) => page.getByRole('region', { name });
const confirmDelete = async (page: Page, button: string) => {
  await page.getByRole('button', { name: button }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Delete' }).click();
};

test('categories: create, edit per language, delete', async ({ page }) => {
  const slug = `e2e-tents-${Date.now()}`;
  await open(page, 'categories');
  await page.getByRole('button', { name: 'New category' }).click();
  await page.getByLabel('URL (slug)').fill(slug);
  await page.getByLabel('Title (EN)').fill('E2E Tents');
  await page.getByRole('switch', { name: 'Visible in the shop (EN)' }).click();
  await page.getByRole('combobox', { name: 'Trail color' }).click();
  await page.getByRole('option', { name: 'Green' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await toast(page, 'Category saved');
  await expect(list(page, 'All categories').getByRole('button', { name: /E2E Tents/ })).toBeVisible();
  const [saved] = await withDb(async (db) => (await db.query('SELECT trail_color FROM categories WHERE title_url = $1', [slug])).rows);
  expect(saved).toEqual({ trail_color: 'green' });
  await expect(page.getByLabel('URL (slug)')).toBeDisabled();

  // Back to an existing one: its values load
  await list(page, 'All categories').getByRole('button', { name: /cars/i }).click();
  await expect(page.getByLabel('URL (slug)')).toHaveValue('cars');

  await list(page, 'All categories')
    .getByRole('button', { name: /E2E Tents/ })
    .click();
  await expect(page.getByLabel('Title (EN)')).toHaveValue('E2E Tents');
  await expect(page.getByRole('combobox', { name: 'Trail color' })).toContainText('Green');
  await confirmDelete(page, 'Delete category');
  await toast(page, 'Category deleted');
  await expect(list(page, 'All categories').getByRole('button', { name: /E2E Tents/ })).toHaveCount(0);
});

test('pages: create with a title per language, then delete', async ({ page }) => {
  const slug = `e2e-about-${Date.now()}`;
  await open(page, 'pages');
  await page.getByRole('button', { name: 'New page' }).click();
  await page.getByLabel('URL (slug)').fill(slug);
  await page.getByLabel('Title (EN)').fill('About us');
  await page.getByRole('tab', { name: 'SK' }).click();
  await page.getByLabel('Title (SK)').fill('O nás');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await toast(page, 'Page saved');

  const [row] = await withDb(
    async (db) =>
      (await db.query(`SELECT t.title FROM pages p JOIN page_translations t ON t.page_id = p.id WHERE p.title_url = $1 AND t.lang = 'sk'`, [slug]))
        .rows,
  );
  expect(row).toEqual({ title: 'O nás' });

  await confirmDelete(page, 'Delete page');
  await toast(page, 'Page deleted');
});

test('shop config: shipping costs per language are saved', async ({ page }) => {
  await open(page, 'config');
  await list(page, 'All configs')
    .getByRole('button', { name: /default/ })
    .click();
  await page.getByLabel('Cost (EN)').fill('7');
  await expect(page.getByText('Unsaved changes')).toBeVisible();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await toast(page, 'Shop config saved');

  const [row] = await withDb(
    async (db) =>
      (
        await db.query(
          `SELECT s.basic_cost::float8 AS cost FROM configs c JOIN config_shipping s ON s.config_id = c.id WHERE c.title_url = 'default' AND s.lang = 'en'`,
        )
      ).rows,
  );
  expect(row).toEqual({ cost: 7 });
  await page.getByLabel('Cost (EN)').fill(String(E2E.shipping));
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await toast(page, 'Shop config saved');
});

test('themes: a new theme is saved inactive', async ({ page }) => {
  const slug = `e2e-theme-${Date.now()}`;
  await open(page, 'themes');
  await page.getByRole('button', { name: 'New theme' }).click();
  await page.getByLabel('Name (slug)').fill(slug);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await toast(page, 'Theme saved');
  await expect(list(page, 'All themes').getByRole('button', { name: slug })).toBeVisible();
  await confirmDelete(page, 'Delete theme');
  await toast(page, 'Theme deleted');
});

test('themes: the home page sections are reordered, switched off and a photo band added', async ({ page }) => {
  const slug = `e2e-home-sections-${Date.now()}`;
  await open(page, 'themes');
  await page.getByRole('button', { name: 'New theme' }).click();
  await page.getByLabel('Name (slug)').fill(slug);

  const sections = page.getByRole('list', { name: 'Home page sections' });
  await expect(sections.getByRole('listitem')).toHaveCount(5);
  await page.getByRole('button', { name: 'Move Products up' }).click();
  await page.getByRole('switch', { name: 'Show Benefits' }).click();
  await page.getByRole('button', { name: 'Add photo band' }).click();
  await page.getByLabel('Title (en)', { exact: true }).fill('Autumn sale');
  await page.getByLabel('Link').fill('//evil.example');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Use a shop path (/en/…) or an https:// address')).toBeVisible();
  await page.getByLabel('Link').fill('/en/product/all');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await toast(page, 'Theme saved');

  const [row] = await withDb(async (db) => (await db.query('SELECT styles FROM themes WHERE title_url = $1', [slug])).rows);
  expect(row.styles.home.map((s: { id: string; enabled: boolean }) => [s.id, s.enabled])).toEqual([
    ['hero', true],
    ['benefits', false],
    ['products', true],
    ['categories', true],
    ['promo', false],
    ['band', true],
  ]);
  expect(row.styles.home[5]).toMatchObject({ link: '/en/product/all', width: 'full', text: { en: { title: 'Autumn sale', text: '', button: '' } } });

  await confirmDelete(page, 'Delete theme');
  await toast(page, 'Theme deleted');
});

test('themes: shop by trip, a product row and ridges are set up in the home sections', async ({ page }) => {
  const slug = `e2e-home-trips-${Date.now()}`;
  await open(page, 'themes');
  await page.getByRole('button', { name: 'New theme' }).click();
  await page.getByLabel('Name (slug)').fill(slug);

  await page.getByRole('button', { name: 'Ridges under Products' }).click();
  await expect(page.getByRole('button', { name: 'Ridges under Products' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Add shop by trip' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Choose at least one category.')).toBeVisible();
  await page.getByRole('combobox', { name: 'Card 1' }).click();
  await page.getByRole('option', { name: 'Cars' }).click();

  await page.getByRole('button', { name: 'Add product row' }).click();
  await page.getByRole('combobox', { name: 'Products' }).click();
  await page.getByRole('option', { name: 'From a category' }).click();
  await page.getByRole('combobox', { name: 'Category' }).click();
  await page.getByRole('option', { name: 'Bikes' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await toast(page, 'Theme saved');

  const [row] = await withDb(async (db) => (await db.query('SELECT styles FROM themes WHERE title_url = $1', [slug])).rows);
  expect(row.styles.home.find((s: { id: string }) => s.id === 'products')).toMatchObject({ divider: 'ridge' });
  expect(row.styles.home.find((s: { id: string }) => s.id === 'trips')).toMatchObject({
    categories: ['cars'],
    text: { en: { title: 'Shop by trip' }, sk: { title: 'Nakupujte podľa túry' } },
  });
  expect(row.styles.home.find((s: { id: string }) => s.id === 'row')).toMatchObject({ type: 'productRow', source: 'category', category: 'bikes' });

  await confirmDelete(page, 'Delete theme');
  await toast(page, 'Theme deleted');
});

test('themes: a preset sets the look, and the AI drafts a theme into the form', async ({ page }) => {
  const slug = `e2e-theme-ai-${Date.now()}`;
  await open(page, 'themes');
  await page.getByRole('button', { name: 'New theme' }).click();
  await page.getByLabel('Name (slug)').fill(slug);

  await page.getByRole('button', { name: 'Ember' }).click();
  await expect(page.getByRole('switch', { name: 'Default color (ink)' })).not.toBeChecked();
  await expect(page.getByLabel('Primary color')).toHaveValue('#c2410c');
  await expect(page.getByRole('combobox', { name: 'Photo colors' })).toContainText('Warm tint');

  await page.getByLabel('Describe the shop and the look').fill('Calm autumn hiking shop');
  await page.getByRole('button', { name: 'Draft with AI' }).click();
  await expect(page.getByText(/Filled the brand color/)).toBeVisible();
  await expect(page.getByLabel('Primary color')).toHaveValue(E2E.aiTheme.color);
  await expect(page.getByLabel('Shop name', { exact: true })).toHaveValue(E2E.aiTheme.shopName);
  await expect(page.getByRole('list', { name: 'Home page sections' })).toContainText(`Photo band: ${E2E.aiTheme.bandTitle} en`);

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await toast(page, 'Theme saved');
  const [row] = await withDb(async (db) => (await db.query('SELECT styles FROM themes WHERE title_url = $1', [slug])).rows);
  expect(row.styles).toMatchObject({ primaryColor: E2E.aiTheme.color, heroTint: 'warm', shopName: E2E.aiTheme.shopName });
  expect(row.styles.home.at(-1)).toMatchObject({
    type: 'band',
    width: 'full',
    text: { sk: { title: `${E2E.aiTheme.bandTitle} sk`, button: 'Explore' } },
  });

  await confirmDelete(page, 'Delete theme');
  await toast(page, 'Theme deleted');
});

test('translations: add a key, fill it, save', async ({ page }) => {
  const key = `E2E_key_${Date.now()}`;
  await open(page, 'translations');
  // Typing can race the hydration of the server-rendered page; retype until the form accepted it
  await expect(async () => {
    await page.getByLabel('New key').fill(key);
    await expect(page.getByRole('button', { name: 'Add key' })).toBeEnabled({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Add key' }).click();
  await page.getByLabel(`${key} (EN)`).fill('Hello');
  await page.getByLabel(`${key} (SK)`).fill('Ahoj');
  await page.getByRole('button', { name: 'Save' }).first().click();
  await toast(page, 'Translations saved');

  const keys = await withDb(
    async (db) => (await db.query(`SELECT lang, keys->>$1 AS text FROM translations WHERE keys ? $1 ORDER BY lang`, [key])).rows,
  );
  expect(keys).toEqual(
    expect.arrayContaining([
      { lang: 'en', text: 'Hello' },
      { lang: 'sk', text: 'Ahoj' },
    ]),
  );
});

test('themes: the product pages get a header, a photo tile and a featured product', async ({ page }) => {
  const slug = `e2e-listing-${Date.now()}`;
  await open(page, 'themes');
  await page.getByRole('button', { name: 'New theme' }).click();
  await page.getByLabel('Name (slug)').fill(slug);

  const card = page.getByRole('region', { name: 'Product pages' });
  await card.getByLabel('Header photo URL').fill('https://res.cloudinary.com/e2e/image/upload/all.jpg');
  await card.getByLabel('Header title (en)').fill('All the gear');
  await card.getByLabel('A tile after every').fill('3');
  await card.getByRole('button', { name: 'Add photo tile' }).click();
  await card.getByLabel('Tile photo URL').fill('https://res.cloudinary.com/e2e/image/upload/hike.jpg');
  await card.getByLabel('Tile link').fill('/en/product/category/bikes');
  await card.getByLabel('Headline (en)').fill('Into the hills');
  await card.getByRole('button', { name: 'Add featured product' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await toast(page, 'Theme saved');

  const [row] = await withDb(async (db) => (await db.query('SELECT styles FROM themes WHERE title_url = $1', [slug])).rows);
  expect(row.styles.listing).toMatchObject({
    header: { image: 'https://res.cloudinary.com/e2e/image/upload/all.jpg', text: { en: { title: 'All the gear', text: '' } } },
    tileEvery: 3,
    tiles: [{ id: 'tile-1', link: '/en/product/category/bikes', pages: [], text: { en: { title: 'Into the hills' } } }],
    featured: [{ page: '*', source: 'sale' }],
  });

  await confirmDelete(page, 'Delete theme');
  await toast(page, 'Theme deleted');
});
