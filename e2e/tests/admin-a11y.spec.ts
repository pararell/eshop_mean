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

    for (const [name, url] of [
      ['overview', '/en/dashboard'],
      ['products', '/en/dashboard/products'],
      ['categories', '/en/dashboard/categories'],
      ['pages', '/en/dashboard/pages'],
      ['themes', '/en/dashboard/themes'],
      ['config', '/en/dashboard/config'],
      ['translations', '/en/dashboard/translations'],
      ['new product', '/en/dashboard/products/new'],
      ['edit product', `/en/dashboard/products/${E2E.car.titleUrl}`],
      ['orders', '/en/dashboard/orders'],
      ['order detail', `/en/dashboard/orders/${E2E.order.orderId}`],
    ]) {
      await page.goto(url);
      await ready(page);
      await check(name);
    }

    // The list + editor pages: the open editor too
    for (const [path, button] of [
      ['categories', 'New category'],
      ['pages', 'New page'],
      ['themes', 'New theme'],
      ['config', 'New config'],
    ]) {
      await page.goto(`/en/dashboard/${path}`);
      await ready(page);
      await page.getByRole('button', { name: button }).click();
      await check(`${path} editor`);
    }
    expect(failures).toEqual([]);
  });
}
