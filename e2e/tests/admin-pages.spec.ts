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
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await toast(page, 'Category saved');
  await expect(list(page, 'All categories').getByRole('button', { name: /E2E Tents/ })).toBeVisible();
  await expect(page.getByLabel('URL (slug)')).toBeDisabled();

  // Back to an existing one: its values load
  await list(page, 'All categories').getByRole('button', { name: /cars/i }).click();
  await expect(page.getByLabel('URL (slug)')).toHaveValue('cars');

  await list(page, 'All categories')
    .getByRole('button', { name: /E2E Tents/ })
    .click();
  await expect(page.getByLabel('Title (EN)')).toHaveValue('E2E Tents');
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
