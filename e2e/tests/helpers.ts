import AxeBuilder from '@axe-core/playwright';
import { expect, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

export { E2E } from '../support/fixtures.mjs';

/**
 * Stand-in for Stripe.js (Payment Element, deferred-intent flow). It renders a fake card field,
 * records what the shop asked for in `window.__stripeCalls`, and "confirms" through the local
 * Stripe stub (support/start-server.mjs; reached as https://api.stripe.com/__test/…, which
 * isolateExternalServices routes to it), which then sends the signed webhook to the app.
 * `window.__e2eCardOutcome = 'declined'` makes the next payment fail like a declined card; `'redirect'`
 * pays and then redirects to return_url (3-D Secure on its own page).
 */
const fakeStripeJs = `
(function () {
  const calls = (window.__stripeCalls = []);
  function Stripe(key) {
    calls.push({ method: 'Stripe', key });
    return {
      _registerWrapper() {},
      elements(options) {
        calls.push({ method: 'elements', options });
        const handlers = {};
        let element;
        const elements = {
          create(type, createOptions) {
            calls.push({ method: 'create', type, options: createOptions });
            element = {
              mount(container) {
                container.innerHTML = '<label>Card number <input data-testid="fake-card-number" autocomplete="off"></label>';
                container.querySelector('input').addEventListener('input', (e) => (handlers.change || (() => {}))({ complete: e.target.value.length >= 16 }));
                setTimeout(() => (handlers.ready || (() => {}))({}), 20);
              },
              on(event, handler) { handlers[event] = handler; },
              destroy() {},
            };
            return element;
          },
          update(options) { calls.push({ method: 'update', options }); },
          getElement() { return element; },
          async submit() {
            const value = document.querySelector('[data-testid=fake-card-number]')?.value || '';
            return value.length >= 16 ? {} : { error: { type: 'validation_error', message: 'Your card number is incomplete.' } };
          },
        };
        return elements;
      },
      async confirmPayment({ clientSecret, confirmParams, redirect }) {
        calls.push({ method: 'confirmPayment', clientSecret, confirmParams, redirect });
        const outcome = window.__e2eCardOutcome || 'succeeded';
        window.__e2eCardOutcome = undefined;
        const id = clientSecret.split('_secret_')[0];
        // Like real Stripe.js, talk to api.stripe.com (allowed by the CSP); the test routes it to the local stub
        const response = await fetch('https://api.stripe.com/__test/confirm/' + id, {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ outcome }),
        });
        const intent = await response.json();
        if (outcome === 'redirect') {
          // Like 3-D Secure on a separate page: Stripe sends the customer to return_url
          window.location.assign(confirmParams.return_url + '&payment_intent=' + id + '&redirect_status=succeeded');
          return new Promise(() => {});
        }
        return outcome === 'declined'
          ? { error: { type: 'card_error', code: 'card_declined', message: 'Your card was declined.' } }
          : { paymentIntent: { id: intent.id, status: intent.status } };
      },
    };
  }
  Stripe.version = 'endive';
  window.Stripe = Stripe;
})();`;

/** URLs the e2e server wrote (support/start-server.mjs) */
export const e2eState = (): { databaseUrl: string; baseURL: string; aiStubUrl: string; stripeStubUrl: string } =>
  JSON.parse(readFileSync(resolve(__dirname, '../../test-results/e2e-state.json'), 'utf8'));

/** Keeps tests hermetic: fake Stripe.js, no TinyMCE cloud, reCAPTCHA or analytics. */
export async function isolateExternalServices(page: Page) {
  const { stripeStubUrl } = e2eState();
  await page.route('https://api.stripe.com/__test/**', async (route) => {
    const response = await route.fetch({ url: stripeStubUrl + new URL(route.request().url()).pathname });
    await route.fulfill({ response });
  });
  await page.route('https://js.stripe.com/**', (route) => route.fulfill({ contentType: 'application/javascript', body: fakeStripeJs }));
  await page.route(/tiny\.cloud|tinymce|recaptcha|googletagmanager|google-analytics/, (route) => route.abort());
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/en/authorize/signin');
  const submit = page.locator('button[type=submit]');
  // Typing can race the hydration of the server-rendered form; retype until the form accepted it
  await expect(async () => {
    await page.locator('[formcontrolname=email]').fill(email);
    await page.locator('[formcontrolname=password]').fill(password);
    await expect(submit).toBeEnabled({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  await submit.click();
}

/** Adds a product to the cart from its detail page, `times` times. */
export async function addToCart(page: Page, titleUrl: string, times = 1) {
  await page.goto(`/en/product/${titleUrl}`);
  for (let i = 0; i < times; i++) {
    const added = page.waitForResponse((r) => r.url().includes('/api/cart/add') && r.ok());
    await page.locator('app-product-content .cart_show-wrap').first().click();
    await added;
  }
}

/** Opens a page and waits until Angular has hydrated it (typing before that is lost) */
export async function gotoReady(page: Page, url: string) {
  await page.goto(url);
  await page.locator('html[data-app-ready]').waitFor({ state: 'attached' });
}

/** Fills the address section of the one-page checkout */
export async function fillAddressStep(page: Page, email = 'jane@e2e.test') {
  const field = (name: string) => page.locator(`[formcontrolname="${name}"]`);
  await field('name').fill('Jane Doe');
  await field('email').fill(email);
  await field('address').fill('Main 1');
  await field('city').fill('Bratislava');
  await field('zip').fill('81101');
  await field('country').fill('SK');
}

export async function choosePayment(page: Page, method: 'card' | 'delivery') {
  await page.getByRole('radio', { name: method === 'card' ? /with card/ : /on delivery/ }).check();
}

/** Buys `qty` of a product with the (fake) card through the real checkout; returns the order number */
export async function payByCard(page: Page, titleUrl: string, email: string, qty = 1): Promise<string> {
  await addToCart(page, titleUrl, qty);
  await page.goto('/en/cart');
  await fillAddressStep(page, email);
  await choosePayment(page, 'card');
  await page.getByTestId('fake-card-number').fill('4242424242424242');
  const intent = page.waitForResponse((r) => r.url().includes('/api/payments/intent'));
  await page.locator('#submit-button').click();
  const { orderId } = await (await intent).json();
  await expect(page).toHaveURL('/en/cart/summary');
  return orderId;
}

/** Direct database access for assertions (URL written by support/start-server.mjs). */
export async function withDb<T>(fn: (db: pg.Pool) => Promise<T>): Promise<T> {
  const { databaseUrl } = e2eState();
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  try {
    return await fn(pool);
  } finally {
    await pool.end();
  }
}

/** The header badge shows the item count; it shows no number for an empty cart. */
export async function expectCartCount(page: Page, count: number) {
  const badge = page.locator('.nav-cart-wrap');
  if (count === 0) {
    await expect(badge).not.toContainText(/\d/);
  } else {
    await expect(badge).toContainText(String(count));
  }
}

/**
 * Accessibility violations (axe, WCAG 2.1 A/AA) as readable lines, [] when clean.
 * The app scrolls inside `.main-scroll-wrap` (absolutely positioned, overflow auto); axe treats
 * content in it as off-screen and silently skips it, so it is un-clipped during the check.
 */
export async function axeViolations(page: Page, options: { rules?: string[]; exclude?: string[] } = {}): Promise<string[]> {
  const unclip = await page.addStyleTag({
    content: '.main-scroll-wrap { position: static !important; overflow: visible !important; } body { overflow: visible !important; }',
  });
  try {
    let builder = new AxeBuilder({ page });
    builder = options.rules ? builder.withRules(options.rules) : builder.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
    for (const selector of options.exclude ?? []) builder = builder.exclude(selector);
    const { violations } = await builder.analyze();
    return violations.flatMap((v) =>
      v.nodes.map((n) => `${v.id}: ${n.target.join(' ')} (${(n.any[0]?.message ?? n.failureSummary ?? '').split('\n')[0].slice(0, 140)})`),
    );
  } finally {
    await unclip.evaluate((el) => (el as Element).remove());
  }
}
