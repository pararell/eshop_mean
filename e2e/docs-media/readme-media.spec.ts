// Screenshots and the demo video for the README and docs/ai.md (`npm run docs:media`).
// Runs the real admin UI against the e2e server, whose AI and Cloudinary are local stubs.
import { expect, Page, test } from '@playwright/test';
import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { E2E, isolateExternalServices, signIn } from '../tests/helpers';

const out = resolve(__dirname, '../../docs/images');
mkdirSync(out, { recursive: true });

test.use({ viewport: { width: 1280, height: 800 }, video: { mode: 'on', size: { width: 1280, height: 800 } } });

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
  // Make the (instant) stubbed AI take a moment, like the real one
  await page.route('**/api/admin/products/ai-draft', async (route) => {
    await new Promise((r) => setTimeout(r, 2500));
    await route.continue();
  });
  await signIn(page, E2E.admin.email, E2E.admin.password);
  await expect(page.getByText('SIGNIN_SUCCESS')).toBeVisible();

  // Product table
  await page.goto('/en/dashboard');
  await expect(page.locator('app-admin-products').getByRole('link', { name: E2E.car.title })).toBeVisible();
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
  await page.screenshot({ path: `${out}/ai-working.png` });

  // Result: marked fields in every language
  await expect(ai.getByText('16 fields were filled by AI')).toBeVisible();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/ai-result.png` });
  await editor.locator('#languages-heading').scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/ai-filled.png` });
  await editor.getByRole('tab', { name: /^SK/ }).click();
  await page.waitForTimeout(1500);
  await editor.getByLabel('Sale price').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);

  await page.close();
  copyFileSync(await page.video()!.path(), `${out}/ai-demo.webm`);
});
