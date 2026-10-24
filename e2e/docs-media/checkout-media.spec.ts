// Checkout screenshots with the real Stripe Payment Element, light and dark (for pull requests).
// Needs a publishable *test* key:
//   E2E_STRIPE_PUBLISHABLE_KEY=pk_test_… npx playwright test -c e2e/docs-media.config.ts checkout-media
// Output: test-results/media/checkout-{light,dark}.png (not committed).
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { addToCart, choosePayment, E2E, fillAddressStep, withDb } from '../tests/helpers';

const out = resolve(__dirname, '../../test-results/media');

test.skip(!process.env.E2E_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_'), 'needs E2E_STRIPE_PUBLISHABLE_KEY=pk_test_…');

// The e2e database has no UI texts; use the shop's seed translations for readable screenshots
test.beforeAll(async () => {
  const seed = JSON.parse(readFileSync(resolve(__dirname, '../../server/seed/translations.json'), 'utf8')) as Record<string, Record<string, string>>;
  await withDb(async (db) => {
    for (const [lang, keys] of Object.entries(seed)) {
      await db.query('UPDATE translations SET keys = keys || $2::jsonb WHERE lang = $1', [lang, JSON.stringify(keys)]);
    }
  });
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`checkout (${colorScheme})`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.emulateMedia({ colorScheme });
    await addToCart(page, E2E.car.titleUrl);
    await page.goto('/en/cart');
    await page.locator('html[data-app-ready]').waitFor({ state: 'attached' });
    await choosePayment(page, 'card');

    // Disabled Pay button first (no address yet), then the ready state
    await expect(page.frameLocator('[data-testid="payment-element"] iframe').first().locator('input').first()).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(800);
    await page.locator('#pay-title').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/checkout-disabled-${colorScheme}.png` });

    await fillAddressStep(page);
    await expect(page.locator('#submit-button')).toBeEnabled();
    await page.waitForTimeout(500);
    await page.locator('#submit-button').scrollIntoViewIfNeeded();
    await page.locator('section[aria-labelledby="pay-title"]').screenshot({ path: `${out}/checkout-${colorScheme}.png` });
  });
}
