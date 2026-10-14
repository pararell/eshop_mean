import { eq, sql } from 'drizzle-orm';

import { orders, products, productTranslations, themes, users } from '../../src/db/schema';
import { createTestDatabase, TestDatabase } from '../utils/test-db';

/** Drizzle wraps driver errors; the PostgreSQL error (code, constraint) is the `cause`. */
async function expectUniqueViolation(query: Promise<unknown>, constraint: string) {
  const error = await query.then(
    () => undefined,
    (e: unknown) => e as { cause?: { code?: string; constraint?: string } },
  );
  expect(error?.cause).toMatchObject({ code: '23505', constraint });
}

/** Schema rules from docs/postgres-migration.md §3 that later code relies on. */
describe('PostgreSQL schema', () => {
  let t: TestDatabase;

  beforeAll(async () => {
    t = await createTestDatabase();
  });
  afterAll(() => t.drop());

  it('runs on PostgreSQL 18', async () => {
    const { rows } = await t.pool.query<{ server_version: string }>('SHOW server_version');
    expect(rows[0].server_version).toMatch(/^18\./);
  });

  it('generates time-ordered uuidv7 primary keys', async () => {
    const [a] = await t.db.insert(products).values({ titleUrl: 'first' }).returning();
    const [b] = await t.db.insert(products).values({ titleUrl: 'second' }).returning();

    const uuidV7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(a.id).toMatch(uuidV7);
    expect(b.id > a.id).toBe(true);
    expect(a.createdAt).toBeInstanceOf(Date);
    expect(a.images).toEqual([]);
  });

  it('stores per-language product data with prices returned as numbers', async () => {
    const [product] = await t.db
      .insert(products)
      .values({ titleUrl: 'priced', tags: ['cars'] })
      .returning();
    await t.db.insert(productTranslations).values([
      { productId: product.id, lang: 'en', title: 'Car', salePrice: 19.99, regularPrice: 25, visibility: true },
      { productId: product.id, lang: 'cs', title: 'Auto', salePrice: 499, visibility: true },
    ]);

    const rows = await t.db.select().from(productTranslations).where(eq(productTranslations.productId, product.id)).orderBy(productTranslations.lang);
    expect(rows.map((r) => [r.lang, r.title, r.salePrice])).toEqual([
      ['en', 'Car', 19.99],
      ['cs', 'Auto', 499],
    ]);
    expect(typeof rows[0].salePrice).toBe('number');
  });

  it('rejects a second translation for the same language and cascades deletes', async () => {
    const [product] = await t.db.insert(products).values({ titleUrl: 'cascade' }).returning();
    await t.db.insert(productTranslations).values({ productId: product.id, lang: 'en' });

    await expect(t.db.insert(productTranslations).values({ productId: product.id, lang: 'en' })).rejects.toThrow();

    await t.db.delete(products).where(eq(products.id, product.id));
    const left = await t.db.select().from(productTranslations).where(eq(productTranslations.productId, product.id));
    expect(left).toEqual([]);
  });

  it('rejects unknown languages', async () => {
    const [product] = await t.db.insert(products).values({ titleUrl: 'lang-check' }).returning();
    await expect(t.pool.query(`INSERT INTO product_translations (product_id, lang) VALUES ($1, 'de')`, [product.id])).rejects.toThrow(
      /invalid input value for enum lang_code/,
    );
  });

  it('enforces unique slugs and order numbers', async () => {
    await t.db.insert(products).values({ titleUrl: 'unique-slug' });
    await expectUniqueViolation(t.db.insert(products).values({ titleUrl: 'unique-slug' }), 'products_title_url_unique');

    const order = { orderNumber: 'order1t1', customerEmail: 'a@test.dev', currency: 'EUR', amount: 30, cart: {} as never };
    await t.db.insert(orders).values(order);
    await expectUniqueViolation(t.db.insert(orders).values(order), 'orders_order_number_unique');
  });

  it('treats emails case-insensitively for uniqueness (D5)', async () => {
    await t.db.insert(users).values({ email: 'Shopper@Test.dev' });
    await expectUniqueViolation(t.db.insert(users).values({ email: 'shopper@test.dev' }), 'users_email_lower_uq');
  });

  it('allows at most one active theme (D8)', async () => {
    await t.db.insert(themes).values({ titleUrl: 'light', active: true });
    await t.db.insert(themes).values({ titleUrl: 'dark', active: false });
    await expectUniqueViolation(t.db.insert(themes).values({ titleUrl: 'blue', active: true }), 'themes_one_active');
  });

  it('keeps order snapshots as jsonb and defaults status to NEW', async () => {
    const cart = { items: [], totalPrice: 30, totalQty: 1, shippingCost: 5, shippingLimit: 100, shippingType: 'basic' };
    const [order] = await t.db
      .insert(orders)
      .values({
        orderNumber: 'order2t2',
        customerEmail: 'b@test.dev',
        currency: 'EUR',
        amount: 30,
        cart,
        addresses: [{ line1: 'Main 1', city: 'BA', zip: '81101', country: 'SK' }],
      })
      .returning();

    expect(order.status).toBe('NEW');
    expect(order.cart).toEqual(cart);
    expect(order.addresses[0].city).toBe('BA');
    const { rows } = await t.pool.query(`SELECT cart->>'totalPrice' AS total FROM orders WHERE id = $1`, [order.id]);
    expect(rows[0].total).toBe('30');
  });

  it('updates updated_at on change', async () => {
    const [product] = await t.db.insert(products).values({ titleUrl: 'touch' }).returning();
    await t.db.execute(sql`SELECT pg_sleep(0.01)`);
    const [updated] = await t.db
      .update(products)
      .set({ images: ['a.jpg'] })
      .where(eq(products.id, product.id))
      .returning();
    expect(updated.updatedAt.getTime()).toBeGreaterThan(product.updatedAt.getTime());
  });
});
