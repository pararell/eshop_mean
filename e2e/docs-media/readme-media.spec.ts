// Screenshots and the demo video for the README and docs/ai.md (`npm run docs:media`).
// Runs the real admin UI against the e2e server, whose AI and Cloudinary are local stubs.
import { expect, Page, test } from '@playwright/test';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { E2E, e2eState, isolateExternalServices, signIn, withDb } from '../tests/helpers';
import { seedDemoShop } from './demo-shop';

const images = resolve(__dirname, '../../docs/images');
/** Full-size PNGs; optimize-images.mjs turns them into the WebP files the docs use */
const out = resolve(images, 'raw');
mkdirSync(out, { recursive: true });

test.use({ viewport: { width: 1280, height: 800 }, video: { mode: 'on', size: { width: 1280, height: 800 } } });
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  // Shop texts, the live demo's catalog and demo orders (see demo-shop.ts)
  const seed = JSON.parse(readFileSync(resolve(__dirname, '../../server/seed/translations.json'), 'utf8')) as Record<string, Record<string, string>>;
  await withDb(async (db) => {
    for (const [lang, keys] of Object.entries(seed))
      await db.query('UPDATE translations SET keys = keys || $2::jsonb WHERE lang = $1', [lang, JSON.stringify(keys)]);
  });
  await seedDemoShop();
});

/** A simple illustrated puffer jacket, rendered by the browser, used as the "product photo" */
async function demoPhoto(page: Page): Promise<Buffer> {
  const quilt = Array.from(
    { length: 6 },
    (_, i) => `<path d="M128 ${150 + i * 48} Q240 ${162 + i * 48} 352 ${150 + i * 48}" stroke="#2b2f36" stroke-width="5" fill="none"/>`,
  ).join('');
  await page.setContent(`
    <body style="margin:0;background:#eef1f4">
      <svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480">
        <rect width="480" height="480" fill="#eef1f4"/>
        <path d="M128 120 L70 160 L48 380 Q60 396 92 392 L118 220 Z" fill="#3a3f47"/>
        <path d="M352 120 L410 160 L432 380 Q420 396 388 392 L362 220 Z" fill="#3a3f47"/>
        <rect x="118" y="110" width="244" height="320" rx="36" fill="#444a53"/>
        ${quilt}
        <path d="M190 104 Q240 70 290 104 L280 132 Q240 116 200 132 Z" fill="#2b2f36"/>
        <line x1="240" y1="120" x2="240" y2="428" stroke="#c9ced6" stroke-width="4"/>
        <circle cx="240" cy="140" r="6" fill="#c9ced6"/>
      </svg>
    </body>`);
  return page.locator('svg').screenshot();
}

test('README media: AI product draft', async ({ page }) => {
  test.setTimeout(120_000);
  const photo = await demoPhoto(page);

  await isolateExternalServices(page);
  // The local Cloudinary stub serves http://127.0.0.1 images, which the app's CSP (img-src https:)
  // rightly blocks; show them under an https address served from the stub, and give the server
  // the stub addresses back when it fetches them for the AI
  const stub = e2eState().aiStubUrl;
  const httpsStub = 'https://media.docs-media.test';
  await page.route('**/api/admin/images/upload**', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replaceAll(stub, httpsStub) });
  });
  await page.route(`${httpsStub}/**`, async (route) => {
    await route.fulfill({ response: await route.fetch({ url: route.request().url().replace(httpsStub, stub) }) });
  });
  // Make the (instant) stubbed AI take a moment, like the real one
  await page.route('**/api/admin/products/ai-draft', async (route) => {
    await new Promise((r) => setTimeout(r, 2500));
    const response = await route.fetch({ postData: (route.request().postData() ?? '').replaceAll(httpsStub, stub) });
    // The stub's answer is named for tests ("E2E Down Jacket"); show a shop-like one
    const body = (await response.text()).replaceAll('E2E ', '').replaceAll('e2e-ai-jacket', 'down-jacket').replaceAll(stub, httpsStub);
    await route.fulfill({ response, body });
  });
  await signIn(page, E2E.admin.email, E2E.admin.password);
  await expect(page.getByText(/SIGNIN_SUCCESS|You are logged in/)).toBeVisible();

  // Product table
  await page.goto('/en/dashboard/products');
  await expect(page.locator('app-admin-products').getByRole('row')).not.toHaveCount(0);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/admin-products.png` });

  // New product: photo + a few words
  await page.getByRole('link', { name: 'New product' }).click();
  const editor = page.locator('app-product-editor');
  const ai = editor.locator('app-ai-assistant');
  await page.waitForTimeout(600);
  await editor.getByTestId('image-file-input').setInputFiles({ name: 'jacket.png', mimeType: 'image/png', buffer: photo });
  await expect(editor.getByRole('img', { name: 'Product photo 1' })).toBeVisible();
  await editor.getByRole('img', { name: 'Product photo 1' }).evaluate((img) => img.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo({ top: 0 }));
  await page.waitForTimeout(400);
  await ai.getByLabel('Describe the product').pressSequentially("men's winter jacket, black, down, L-XXL", { delay: 35 });
  await page.waitForTimeout(400);
  await ai.getByRole('button', { name: 'Fill with AI', exact: true }).click();
  await expect(ai.getByRole('status')).toContainText('Looking at 1 photo');

  // Result: marked fields in every language
  await expect(ai.getByText('16 fields were filled by AI')).toBeVisible();
  await page.waitForTimeout(1200);
  await editor.locator('#languages-heading').scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/ai-filled.png` });
  await editor.getByRole('tab', { name: /^SK/ }).click();
  await page.waitForTimeout(1500);
  await editor.getByLabel('Sale price').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);

  await page.close();
  copyFileSync(await page.video()!.path(), `${images}/ai-demo.webm`);
});

/** Overview and the admin in dark mode: a separate context, so the demo video stays light */
test('README media: admin overview, light and dark', async ({ browser }) => {
  test.setTimeout(120_000);
  for (const colorScheme of ['light', 'dark'] as const) {
    const suffix = colorScheme === 'dark' ? '-dark' : '';
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme });
    const page = await context.newPage();
    await isolateExternalServices(page);
    await signIn(page, E2E.admin.email, E2E.admin.password);
    await expect(page.getByText(/SIGNIN_SUCCESS|You are logged in/)).toBeVisible();

    await page.goto('/en/dashboard');
    await page.locator('html[data-app-ready]').waitFor({ state: 'attached' });
    const loaded = page.waitForResponse((r) => r.url().includes('/api/admin/overview?days=30'));
    await page.getByRole('button', { name: '30 days' }).click();
    await loaded;
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/admin-overview${suffix}.png` });

    if (colorScheme === 'dark') {
      await page.goto('/en/dashboard/products');
      await expect(page.locator('app-admin-products').getByRole('row')).not.toHaveCount(0);
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${out}/admin-products-dark.png` });
    }
    await context.close();
  }
});
