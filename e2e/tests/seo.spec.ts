import { APIRequestContext, expect, test } from '@playwright/test';
import { E2E, withDb } from './helpers';

// What search engines get: the server-rendered HTML, without running any JavaScript.
const SHOP = { name: 'E2E Trail Shop', description: 'Gear for e2e trails' };

test.beforeAll(() =>
  withDb((db) =>
    db.query(`UPDATE translations SET keys = keys || $1::jsonb WHERE lang = 'en'`, [
      JSON.stringify({ ESHOP_TITLE: SHOP.name, ESHOP_DESCRIPTION: SHOP.description }),
    ]),
  ),
);
test.afterAll(() => withDb((db) => db.query(`UPDATE translations SET keys = keys - 'ESHOP_TITLE' - 'ESHOP_DESCRIPTION' WHERE lang = 'en'`)));

/** The head of a server-rendered page: title, meta tags by name/property, canonical URL and JSON-LD */
async function head(request: APIRequestContext, path: string) {
  const html = await (await request.get(path)).text();
  const meta = (key: string) => new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)"`).exec(html)?.[1];
  return {
    html,
    title: /<title>([^<]*)<\/title>/.exec(html)?.[1],
    description: meta('description'),
    ogUrl: meta('og:url'),
    siteName: meta('og:site_name'),
    canonical: /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1],
    jsonLd: [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([^<]*)<\/script>/g)].map(([, json]) => JSON.parse(json)),
  };
}

test('the home page is named and described by the shop, and its structured data holds no personal data', async ({ request }) => {
  const page = await head(request, '/');

  expect(page.title).toBe(SHOP.name);
  expect(page.description).toBe(SHOP.description);
  expect(page.siteName).toBe(SHOP.name);
  expect(page.canonical).toMatch(/^http:\/\/[^/]+\/$/);
  expect(page.jsonLd).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ '@type': 'WebSite', name: SHOP.name, description: SHOP.description }),
      { '@context': 'https://schema.org', '@type': 'Organization', name: SHOP.name, url: expect.stringMatching(/^http:\/\//) },
    ]),
  );
  expect(page.html).not.toMatch(/Smrtic|miro218|smrtic\.eu|Angular - Node\.js/);
});

test('a category page is titled by its category, a product page by its product and the price paid', async ({ request }) => {
  const category = await head(request, '/en/product/category/cars');
  expect(category.title).toBe(`Cars | ${SHOP.name}`);
  expect(category.canonical).toMatch(/\/en\/product\/category\/cars$/);

  const product = await head(request, `/en/product/${E2E.car.titleUrl}`);
  expect(product.title).toBe(`${E2E.car.title} | ${SHOP.name}`);
  expect(product.description).toBe(`${E2E.car.title} short description`);
  expect(product.ogUrl).toMatch(new RegExp(`/en/product/${E2E.car.titleUrl}$`));
  // The sale price (what the customer pays), not the struck-through regular price
  expect(product.jsonLd).toEqual(
    expect.arrayContaining([expect.objectContaining({ '@type': 'Product', offers: expect.objectContaining({ price: E2E.car.price }) })]),
  );
});

test('the title follows navigation inside the app', async ({ page }) => {
  await page.goto('/en/product/all');
  await page.locator('html[data-app-ready]').waitFor({ state: 'attached' });
  await expect(page).toHaveTitle(SHOP.name);
  await page.locator('a.sidebar-item[href$="/category/cars"]:visible').click();
  await expect(page).toHaveTitle(`Cars | ${SHOP.name}`);
  await page.getByRole('link', { name: E2E.car.title }).first().click();
  await expect(page).toHaveTitle(`${E2E.car.title} | ${SHOP.name}`);
  await page.goBack();
  await expect(page).toHaveTitle(`Cars | ${SHOP.name}`);
});
