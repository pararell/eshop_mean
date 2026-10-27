import { expect, test } from '@playwright/test';
import { E2E, isolateExternalServices, signIn } from './helpers';

test.beforeEach(async ({ page }) => {
  await isolateExternalServices(page);
  await signIn(page, E2E.admin.email, E2E.admin.password);
  await expect(page.getByText('SIGNIN_SUCCESS')).toBeVisible();
});

test('the admin frame: sidebar sections, breadcrumbs, no shop header', async ({ page }) => {
  await page.goto('/en/dashboard');
  // The admin opens on the Overview
  await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();
  await expect(page.locator('app-header')).toHaveCount(0);

  const nav = page.getByRole('navigation', { name: 'Admin sections' });
  await expect(nav.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
  await nav.getByRole('link', { name: 'Products' }).click();
  await expect(nav.getByRole('link', { name: 'Products' })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current', 'page');
  await nav.getByRole('link', { name: 'Categories' }).click();
  await expect(page).toHaveURL('/en/dashboard/categories');
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Catalog');
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Categories');

  // Detail pages link back to their list
  await page.goto(`/en/dashboard/orders/${E2E.order.orderId}`);
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Orders' }).click();
  await expect(page).toHaveURL('/en/dashboard/orders');
});

test('the sidebar collapses to icons and remembers it', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/en/dashboard/products');
  await page.locator('html[data-app-ready]').waitFor({ state: 'attached' });
  const toggle = page.getByRole('button', { name: 'Collapse sidebar' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await toggle.click();
  await expect(page.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false');
  // Labels stay available to screen readers
  await expect(page.getByRole('navigation', { name: 'Admin sections' }).getByRole('link', { name: 'Orders' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
});

test('top-bar search opens the product list filtered, also with the "/" shortcut', async ({ page }) => {
  await page.goto('/en/dashboard/orders');
  await page.locator('html[data-app-ready]').waitFor({ state: 'attached' });
  await page.getByRole('heading', { level: 1, name: 'Orders' }).click();
  await page.keyboard.press('/');
  await expect(page.getByRole('searchbox', { name: 'Search products' })).toBeFocused();
  await page.keyboard.type('bike');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/en/dashboard/products?q=bike');
  const list = page.locator('app-admin-products');
  await expect(list.getByRole('link', { name: E2E.bike.title })).toBeVisible();
  await expect(list.getByRole('link', { name: E2E.car.title })).toHaveCount(0);
});

test('phones get an off-canvas menu that closes with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en/dashboard/products');
  await page.locator('html[data-app-ready]').waitFor({ state: 'attached' });
  const nav = page.getByRole('navigation', { name: 'Admin sections' });
  await expect(nav).toBeHidden();
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(nav).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(nav).toBeHidden();
  await page.getByRole('button', { name: 'Menu' }).click();
  await nav.getByRole('link', { name: 'Pages' }).click();
  await expect(page).toHaveURL('/en/dashboard/pages');
  await expect(nav).toBeHidden();
});

test('"View shop" opens the shop home page, not a 404', async ({ page }) => {
  await page.goto('/en/dashboard');
  await page.getByRole('link', { name: 'View shop' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('#hero-title')).toBeVisible();
});
