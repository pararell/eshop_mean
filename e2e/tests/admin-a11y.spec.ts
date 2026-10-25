import { expect, Page, test } from '@playwright/test';
import { axeViolations, E2E, isolateExternalServices, signIn } from './helpers';

// Every admin view, light and dark: WCAG 2.1 AA (contrast 4.5:1 text, ARIA, names, …) must pass.
test.beforeEach(({ page }) => isolateExternalServices(page));

const ready = (page: Page) => page.locator('html[data-app-ready]').waitFor({ state: 'attached' });

for (const colorScheme of ['light', 'dark'] as const) {
  test(`admin pages are accessible (${colorScheme})`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ colorScheme });
    await signIn(page, E2E.admin.email, E2E.admin.password);
    await expect(page.getByText('SIGNIN_SUCCESS')).toBeVisible();

    const failures: string[] = [];
    const check = async (name: string) => {
      await page.waitForTimeout(300);
      failures.push(...(await axeViolations(page)).map((v) => `${name}: ${v}`));
    };

    await page.goto('/en/dashboard');
    await ready(page);
    for (const tab of ['Products', 'Categories', 'Pages', 'Theme', 'Config', 'Translations']) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      await check(`dashboard/${tab}`);
    }
    for (const [name, url] of [
      ['new product', '/en/dashboard/products/new'],
      ['edit product', `/en/dashboard/products/${E2E.car.titleUrl}`],
      ['orders', '/en/dashboard/orders'],
      ['order detail', `/en/dashboard/orders/${E2E.order.orderId}`],
      ['translations', '/en/dashboard/translations'],
    ]) {
      await page.goto(url);
      await ready(page);
      await check(name);
    }
    expect(failures).toEqual([]);
  });
}
