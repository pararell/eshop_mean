// A realistic shop for the README / docs screenshots (npm run docs:media): the public catalog of the
// live demo (titles, prices, photos; read-only) copied into the disposable e2e database, plus demo
// orders over the last 30 days for the admin Overview. Never used by the e2e tests.
import { withDb } from '../tests/helpers';

const shop = (process.env.DOCS_MEDIA_URL || 'https://eshop.privatelibrary.eu').replace(/\/$/, '');
const langs = ['en', 'sk', 'cs'] as const;

interface PublicProduct {
  titleUrl: string;
  title: string;
  description?: string;
  salePrice?: number;
  regularPrice?: number;
  mainImage?: { url: string; name?: string };
  images?: string[];
  tags?: string[];
}
interface PublicCategory {
  titleUrl: string;
  title: string;
  mainImage?: { url: string; type?: boolean };
}

async function get<T>(path: string, lang: string): Promise<T> {
  const res = await fetch(`${shop}${path}`, { headers: { lang } });
  if (!res.ok) throw new Error(`${path} (${lang}): HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** Deterministic pseudo-random numbers, so screenshots are reproducible */
function random(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
}

export async function seedDemoShop(): Promise<void> {
  const byLang = Object.fromEntries(
    await Promise.all(
      langs.map(async (lang) => [lang, (await get<{ all: PublicProduct[] }>(`/api/products?lang=${lang}&page=1&sort=newest`, lang)).all] as const),
    ),
  ) as Record<(typeof langs)[number], PublicProduct[]>;
  const categories = await get<PublicCategory[]>('/api/products/categories', 'en');
  const products = byLang.en;

  await withDb(async (db) => {
    // The placeholder products of the e2e seed would look out of place
    await db.query(`DELETE FROM products WHERE title_url LIKE 'e2e-%'`);
    for (const category of categories) {
      const { rows } = await db.query(
        `INSERT INTO categories (title_url, main_image_url, main_image_cover) VALUES ($1, $2, $3)
         ON CONFLICT (title_url) DO UPDATE SET main_image_url = excluded.main_image_url RETURNING id`,
        [category.titleUrl, category.mainImage?.url ?? null, !!category.mainImage?.type],
      );
      await db.query(
        `INSERT INTO category_translations (category_id, lang, title, position, visibility) VALUES ($1, 'en', $2, 0, true)
         ON CONFLICT DO NOTHING`,
        [rows[0].id, category.title],
      );
    }
    for (const product of products) {
      const { rows } = await db.query(
        `INSERT INTO products (title_url, main_image_url, main_image_name, images, tags) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (title_url) DO NOTHING RETURNING id`,
        [product.titleUrl, product.mainImage?.url ?? null, product.titleUrl, product.images ?? [], product.tags ?? []],
      );
      if (!rows[0]) continue;
      for (const lang of langs) {
        const local = byLang[lang].find((p) => p.titleUrl === product.titleUrl);
        if (!local) continue;
        await db.query(
          `INSERT INTO product_translations (product_id, lang, title, description, sale_price, regular_price, on_sale, stock, visibility, shipping)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'onStock', true, 'basic')`,
          [rows[0].id, lang, local.title, local.description ?? '', local.salePrice ?? null, local.regularPrice ?? null, !!local.regularPrice],
        );
      }
    }

    // About 60 orders over the last ~55 days (so the Overview can compare periods), mostly EUR, a few CZK
    const rand = random(42);
    const names = ['Jana Nováková', 'Peter Kováč', 'Eva Horváthová', 'Martin Varga', 'Lucia Tóthová', 'Tomáš Novák', 'Anna Dvořáková'];
    const statuses = ['COMPLETED', 'COMPLETED', 'SHIPPING', 'PAID', 'PAID', 'NEW', 'REFUNDED'];
    for (let i = 0; i < 64; i++) {
      const product = products[Math.floor(rand() * products.length)];
      const qty = 1 + Math.floor(rand() * 2);
      const czk = i % 7 === 3;
      const price = Math.round((product.salePrice ?? 50) * (czk ? 25 : 1));
      const daysAgo = i < 40 ? Math.floor(rand() * rand() * 30) : 30 + Math.floor(rand() * 25);
      const status = i < 2 ? 'NEW' : statuses[Math.floor(rand() * statuses.length)];
      const cart = {
        items: [{ id: product.titleUrl, qty, price, shipingCostType: 'basic', item: { titleUrl: product.titleUrl, title: product.title } }],
      };
      await db.query(
        `INSERT INTO orders (order_number, customer_email, status, type, currency, amount, amount_refunded, cart, addresses, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now() - make_interval(days => $10, hours => $11))`,
        [
          `order-demo-${i}`,
          `customer${i}@example.com`,
          status,
          i % 3 ? 'WITH_PAYMENT' : 'PAYMENT_ON_DELIVERY',
          czk ? 'CZK' : 'EUR',
          price * qty,
          status === 'REFUNDED' ? price * qty : null,
          JSON.stringify(cart),
          JSON.stringify([{ name: names[i % names.length], line1: 'Hlavná 12', city: 'Bratislava', zip: '811 01', country: 'SK' }]),
          daysAgo,
          Math.floor(rand() * 10),
        ],
      );
    }
    await db.query(`INSERT INTO ai_usage (provider, model, status, cost_usd, created_at)
      SELECT 'deepseek', 'deepseek-flash', CASE WHEN g % 12 = 0 THEN 'timeout'::ai_usage_status ELSE 'ok'::ai_usage_status END, 0.0009, now() - make_interval(days => g % 28)
      FROM generate_series(1, 34) AS g`);
  });
}
