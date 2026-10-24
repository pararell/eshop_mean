// Storefront screenshots for the README (`npm run docs:media`), light and dark.
// Taken from the live demo (real product photos); only public pages are read. The cart shot puts
// one product in an anonymous cart, like any visitor. Override the shop with DOCS_MEDIA_URL.
import { Browser, BrowserContextOptions, Page, test } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const shop = (process.env.DOCS_MEDIA_URL || 'https://eshop.privatelibrary.eu').replace(/\/$/, '');
const images = resolve(__dirname, '../../docs/images');
/** Full-size PNGs; optimize-images.mjs turns them into the WebP files the README uses */
const out = resolve(images, 'raw');
mkdirSync(out, { recursive: true });

const desktop: BrowserContextOptions = { viewport: { width: 1440, height: 900 } };
const mobile: BrowserContextOptions = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const schemes = ['light', 'dark'] as const;

/** Opens a page and waits for its images; the theme follows the emulated color scheme */
async function open(page: Page, path: string) {
  await page.goto(shop + path, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = [...document.images].filter((img) => img.getBoundingClientRect().top < window.innerHeight);
    await Promise.all(images.map((img) => (img.complete ? null : new Promise((done) => img.addEventListener('load', done, { once: true })))));
  });
  await page.waitForTimeout(500);
}

async function newPage(browser: Browser, options: BrowserContextOptions, colorScheme: 'light' | 'dark') {
  const context = await browser.newContext({ ...options, colorScheme });
  // No analytics or captcha traffic from the screenshot run
  await context.route(/googletagmanager|google-analytics|recaptcha/, (route) => route.abort());
  return context.newPage();
}

test.describe.configure({ mode: 'serial' });
test.setTimeout(120_000);

for (const scheme of schemes) {
  const suffix = scheme === 'dark' ? '-dark' : '';

  test(`storefront (${scheme})`, async ({ browser }) => {
    const page = await newPage(browser, desktop, scheme);

    // The home page is a full-bleed photo with the same look in both themes: light only
    if (scheme === 'light') {
      await open(page, '/');
      await page.screenshot({ path: `${out}/storefront.png` });
      // The same photo without header and text, as the social preview background
      await page.addStyleTag({ content: 'app-header, .hero-copy { visibility: hidden !important; }' });
      await page.screenshot({ path: `${out}/storefront-photo.png` });
    }

    await open(page, '/en/product/category/tents');
    await page.screenshot({ path: `${out}/category${suffix}.png` });

    const product = await page.locator('.product_card a[href*="/product/"]').first().getAttribute('href');
    await open(page, product!);
    await page.screenshot({ path: `${out}/product${suffix}.png` });

    const added = page.waitForResponse((r) => r.url().includes('/api/cart/add') && r.ok());
    await page.locator('app-product-content .cart_show-wrap').first().click();
    await added;
    await open(page, '/en/cart');
    await page.screenshot({ path: `${out}/cart${suffix}.png` });

    await page.context().close();
  });
}

test('mobile home', async ({ browser }) => {
  const page = await newPage(browser, mobile, 'light');
  await open(page, '/');
  await page.screenshot({ path: `${out}/mobile-home.png` });
  await page.context().close();
});

/** GitHub social preview (1280×640): the storefront photo with the project name */
test('social preview', async ({ browser }) => {
  const page = await newPage(browser, { viewport: { width: 1280, height: 640 } }, 'light');
  const photo = readFileSync(`${out}/storefront-photo.png`).toString('base64');
  await page.setContent(`
    <body style="margin:0">
      <div style="position:relative;width:1280px;height:640px;overflow:hidden;font-family:system-ui,-apple-system,'Segoe UI',sans-serif">
        <img src="data:image/png;base64,${photo}" style="position:absolute;width:1440px;left:-160px;top:-130px">
        <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgb(0 0 0/70%),rgb(0 0 0/35%) 55%,rgb(0 0 0/0%) 80%)"></div>
        <div style="position:absolute;left:72px;top:190px;color:#fff;max-width:700px">
          <div style="font-size:84px;font-weight:700;letter-spacing:-1px">eshop_mean</div>
          <div style="margin-top:16px;font-size:34px;line-height:1.3">Full-stack e-commerce with an AI-assisted admin</div>
          <div style="margin-top:36px;font-size:24px;opacity:.85">Angular SSR · NestJS · PostgreSQL · Stripe</div>
        </div>
      </div>
    </body>`);
  await page.screenshot({ path: `${images}/social-preview.png` });
  await page.context().close();
});
