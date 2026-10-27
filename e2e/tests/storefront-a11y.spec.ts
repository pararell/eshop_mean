import { expect, test } from '@playwright/test';
import { axeViolations, isolateExternalServices } from './helpers';

test.beforeEach(({ page }) => isolateExternalServices(page));

/** WCAG 2.1 AA (axe) on the storefront: brand accent buttons, sale prices and badges, category tiles */
for (const colorScheme of ['light', 'dark'] as const) {
  test(`home and product list meet WCAG AA (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    for (const path of ['/', '/en/product/all']) {
      await page.goto(path);
      await page.locator('html[data-app-ready]').waitFor({ state: 'attached' });
      await page.locator('.product_card').first().waitFor();
      expect(await axeViolations(page), path).toEqual([]);
    }
  });
}
