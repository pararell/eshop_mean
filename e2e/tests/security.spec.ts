import { expect, test } from '@playwright/test';
import { addToCart, E2E, e2eState, isolateExternalServices } from './helpers';

test.beforeEach(({ page }) => isolateExternalServices(page));

test('pages run under the enforced CSP without violations', async ({ page }) => {
  // Products made by the AI draft test use images from the local Cloudinary stub (plain http, test
  // only); real Cloudinary images are https and allowed
  const { aiStubUrl } = e2eState();
  const stubOrigin = new URL(aiStubUrl).origin;
  const violations: string[] = [];
  page.on('console', (message) => {
    const text = message.text();
    if (/Content Security Policy/i.test(text) && !text.includes(stubOrigin)) violations.push(text);
  });

  const response = await page.goto('/');
  const csp = response!.headers()['content-security-policy'];
  expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+'/);

  // Every inline script in the server-rendered page carries this response's nonce
  const nonce = /'nonce-([A-Za-z0-9+/=]+)'/.exec(csp)![1];
  const html = await (await page.request.get('/')).text();
  const inlineWithoutNonce = [...html.matchAll(/<script\b([^>]*)>(?!<\/script>)/g)].filter(
    ([, attrs]) => !/\bsrc=/.test(attrs) && !/application\/(ld\+)?json/.test(attrs) && !/\bnonce="/.test(attrs),
  );
  expect(inlineWithoutNonce).toEqual([]);
  expect(html).not.toContain(nonce); // another request, another nonce

  // Interactive pages: hydration, event replay, product gallery, card payment form
  await page.goto(`/en/product/${E2E.car.titleUrl}`);
  await addToCart(page, E2E.car.titleUrl);
  await page.goto('/en/cart');
  await page.getByRole('radio', { name: /with card/ }).check();
  await expect(page.getByTestId('fake-card-number')).toBeVisible();
  await page.goto('/en/authorize/signin');
  await page.goto('/en/no-such-page');

  expect(violations).toEqual([]);
});
