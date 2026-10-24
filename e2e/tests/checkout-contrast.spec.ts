import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';
import { addToCart, choosePayment, E2E, isolateExternalServices } from './helpers';

test.beforeEach(({ page }) => isolateExternalServices(page));

/** WCAG AA text contrast (axe `color-contrast`, 4.5:1 / 3:1 for large text) on the checkout */
async function contrastViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withRules(['color-contrast'])
    // Stripe's iframe is styled through `appearance`, not our CSS
    .exclude('[data-testid="payment-element"]')
    .analyze();
  return results.violations.flatMap((v) => v.nodes.map((n) => `${n.target.join(' ')}: ${n.failureSummary?.split('\n').pop()?.trim()}`));
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`cart and checkout meet WCAG AA contrast (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await addToCart(page, E2E.car.titleUrl);
    await page.goto('/en/cart');
    await page.locator('html[data-app-ready]').waitFor({ state: 'attached' });

    await choosePayment(page, 'card');
    expect(await contrastViolations(page)).toEqual([]);

    await choosePayment(page, 'delivery');
    expect(await contrastViolations(page)).toEqual([]);
  });
}

test('the card form follows the light/dark switch without a reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await addToCart(page, E2E.car.titleUrl);
  await page.goto('/en/cart');
  await page.locator('html[data-app-ready]').waitFor({ state: 'attached' });
  await choosePayment(page, 'card');

  type Call = { method: string; options?: { appearance?: { theme?: string; variables?: Record<string, string> } } };
  const appearance = async () => {
    const calls = await page.evaluate(() => (window as unknown as { __stripeCalls?: Call[] }).__stripeCalls);
    return (calls ?? []).filter((c) => c.options?.appearance).pop()?.options?.appearance;
  };
  await expect.poll(async () => (await appearance())?.theme).toBe('stripe');
  // Colors come from the design tokens, resolved to concrete values for Stripe
  expect((await appearance())?.variables?.colorText).toMatch(/^rgb/);

  await page.getByRole('button', { name: /dark mode/i }).click();
  await expect.poll(async () => (await appearance())?.theme).toBe('night');
});
