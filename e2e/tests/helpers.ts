import { expect, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

export { E2E } from '../support/fixtures.mjs';

/**
 * Stand-in for Stripe.js (Payment Element, deferred-intent flow). It renders a fake card field,
 * records what the shop asked for in `window.__stripeCalls`, and "confirms" through the local
 * Stripe stub (support/start-server.mjs), which then sends the signed webhook to the app.
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
        const response = await fetch(window.__stripeStubUrl + '/__test/confirm/' + id, {
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
  await page.addInitScript((url) => ((window as unknown as { __stripeStubUrl: string }).__stripeStubUrl = url), e2eState().stripeStubUrl);
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
