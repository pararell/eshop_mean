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
  // Account actions live in the header's account menu
  await page.getByRole('button', { name: 'Account' }).click();
  const logout = page.getByRole('menuitem', { name: /Logout/ });
  await expect(logout).toBeVisible();
  await expect(page.getByRole('menuitem', { name: /Dashboard/ })).toHaveCount(0); // not an admin

  await logout.click();
  await expect(page.getByRole('button', { name: 'Account' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Login/ }).first()).toBeVisible();
});

test('rejects a wrong password (BUG-05 regression)', async ({ page }) => {
  const signin = page.waitForResponse((r) => r.url().includes('/api/auth/signin'));
  await signIn(page, E2E.admin.email, 'Wrong123');
  expect((await signin).status()).toBe(401);
  await expect(page.getByText('SIGNIN_SUCCESS')).toHaveCount(0);
  // still logged out
  await expect(page.getByText('Logout')).toHaveCount(0);
});
