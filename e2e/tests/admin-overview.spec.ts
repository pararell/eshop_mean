import { expect, test } from '@playwright/test';
import { E2E, isolateExternalServices, signIn } from './helpers';

test.beforeEach(async ({ page }) => {
  await isolateExternalServices(page);
  await signIn(page, E2E.admin.email, E2E.admin.password);
  await expect(page.getByText('SIGNIN_SUCCESS')).toBeVisible();
});

test('the overview shows sales, orders to handle and recent orders, per period', async ({ page }) => {
  await page.goto('/en/dashboard');
  await page.locator('html[data-app-ready]').waitFor({ state: 'attached' });

  // The seeded order is a new cash-on-delivery order: waiting to be handled, listed as recent
  await expect(page.getByRole('link', { name: /^To handle/ })).toContainText(/[1-9]/);
  const recent = page.getByRole('region', { name: 'Recent orders' });
  await expect(recent.getByRole('link', { name: E2E.order.customer })).toBeVisible();
  await recent.getByRole('link', { name: E2E.order.customer }).click();
  await expect(page).toHaveURL(`/en/dashboard/orders/${E2E.order.orderId}`);

  await page.goBack();
  const overview = page.waitForResponse((r) => r.url().includes('/api/admin/overview?days=30') && r.ok());
  await page.getByRole('button', { name: '30 days' }).click();
  await overview;
  await expect(page.getByRole('button', { name: '30 days' })).toHaveAttribute('aria-pressed', 'true');
  // One bar per day, each with its value for hover, keyboard and screen readers
  await expect(
    page
      .getByRole('region', { name: /Revenue per day/ })
      .first()
      .locator('.chart-col'),
  ).toHaveCount(30);
  await expect(page.getByRole('region', { name: 'Needs attention' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'AI drafts' })).toBeVisible();
});
