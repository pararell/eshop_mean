import { expect, test } from '@playwright/test';
import { E2E, isolateExternalServices, signIn } from './helpers';

test.beforeEach(({ page }) => isolateExternalServices(page));

test('signs up a new customer who can then log in and out', async ({ page }) => {
  const email = `shopper-${Date.now()}@e2e.test`;

  await page.goto('/en/authorize/signup');
  await page.locator('[formcontrolname=name]').fill('Shopper');
  await page.locator('[formcontrolname=email]').fill(email);
  await page.locator('[formcontrolname=password]').fill('Shop123');
  const signedUp = page.waitForResponse((r) => r.url().includes('/api/auth/signup'));
  await page.locator('button[type=submit]').click();
  expect((await signedUp).status()).toBe(201);

  await signIn(page, email, 'Shop123');
  await expect(page.getByText('SIGNIN_SUCCESS')).toBeVisible();
  const logout = page.getByRole('menuitem', { name: /Logout/ }).or(page.getByText('Logout'));
  await expect(logout.first()).toBeVisible();
  await expect(page.getByText('Dashboard')).toHaveCount(0); // not an admin

  await logout.first().click();
  await expect(page.getByText('Logout')).toHaveCount(0);
});

test('rejects a wrong password', async ({ page }) => {
  // Known bug (docs/audit.md BUG-05): the client stores the 401 error response as the user and
  // shows SIGNIN_SUCCESS. Marked as expected failure; remove test.fail() once BUG-05 is fixed.
  test.fail();
  const signin = page.waitForResponse((r) => r.url().includes('/api/auth/signin'));
  await signIn(page, E2E.admin.email, 'Wrong123');
  expect((await signin).status()).toBe(401);
  await expect(page.getByText('SIGNIN_SUCCESS')).toHaveCount(0);
});
