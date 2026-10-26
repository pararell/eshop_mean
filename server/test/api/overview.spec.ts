import type { AdminOverview, LocalizedCart } from '@eshop/shared';

import { aiUsage, orders, translations } from '../../src/db/schema';
import { adminToken, createTestApp, productFixture, TestApp } from '../utils/test-app';

const cart = (titleUrl: string, title: string, qty: number, price: number) =>
  ({
    items: [{ id: titleUrl, qty, price, shipingCostType: 'basic', item: { titleUrl, title } }],
    totalQty: qty,
    totalPrice: qty * price,
    shippingCost: 0,
    shippingLimit: 100,
    shippingType: 'free',
  }) as unknown as LocalizedCart;

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 3600 * 1000);

describe('GET /api/admin/overview', () => {
  let t: TestApp;
  let auth: { Authorization: string };

  beforeAll(async () => {
    t = await createTestApp();
    auth = { Authorization: `Bearer ${await adminToken(t)}` };

    let n = 0;
    const order = (values: Partial<typeof orders.$inferInsert>) =>
      ({
        orderNumber: `order-${++n}`,
        customerEmail: `c${n}@test.dev`,
        currency: 'EUR',
        amount: 0,
        cart: cart('tent', 'Tent', 1, 0),
        ...values,
      }) as typeof orders.$inferInsert;
    await t.db.insert(orders).values([
      order({
        status: 'NEW',
        amount: 100,
        cart: cart('tent', 'Tent', 1, 100),
        addresses: [{ name: 'Jana', line1: 'x', city: 'y', zip: '1', country: 'SK' }],
      }),
      order({ status: 'PAID', amount: 60, cart: cart('poles', 'Poles', 2, 30) }),
      // Refunded in part: counts net of the refund
      order({ status: 'REFUNDED', amount: 50, amountRefunded: 20, cart: cart('poles', 'Poles', 1, 50) }),
      // Not sales
      order({ status: 'PAYMENT_FAILED', amount: 999 }),
      order({ status: 'PENDING_PAYMENT', amount: 999 }),
      // Other currency, kept apart
      order({ status: 'PAID', amount: 1500, currency: 'CZK', cart: cart('tent', 'Tent', 1, 1500) }),
      // The previous 7 days, and older than both periods
      order({ status: 'COMPLETED', amount: 80, createdAt: daysAgo(10) }),
      order({ status: 'COMPLETED', amount: 500, createdAt: daysAgo(40) }),
    ]);

    await t.model('Product').create(productFixture('hidden-tent', { en: { ...productFixture('x').en, stock: 'unavailable', visibility: true } }));
    await t.model('Product').create(productFixture('car'));
    await t.db.insert(translations).values([
      { lang: 'en', keys: { Hello: 'Hello', Bye: 'Bye' } },
      { lang: 'sk', keys: { Hello: 'Ahoj', Bye: '' } },
    ]);
    await t.db.insert(aiUsage).values([
      { provider: 'deepseek', model: 'deepseek-flash', status: 'ok', costUsd: 0.001 },
      { provider: 'deepseek', model: 'deepseek-flash', status: 'timeout', costUsd: 0 },
    ]);
  });
  afterAll(() => t.close());

  it('is admin only', async () => {
    await t.http.get('/api/admin/overview').expect(401);
  });

  it('sums sales per currency, net of refunds, with the previous period', async () => {
    const res = await t.http.get('/api/admin/overview').query({ days: 7 }).set(auth).expect(200);
    const body = res.body as AdminOverview;

    expect(body.days).toBe(7);
    // EUR first, then the other currencies
    expect(body.sales).toEqual([
      { currency: 'EUR', revenue: 190, orders: 3, averageOrder: 63.33, previousRevenue: 80, previousOrders: 1 },
      { currency: 'CZK', revenue: 1500, orders: 1, averageOrder: 1500, previousRevenue: 0, previousOrders: 0 },
    ]);
    // NEW + PAID orders, all time
    expect(body.toHandle).toBe(3);
    // Every day of the period for each currency that sold
    expect(body.revenueByDay.filter((d) => d.currency === 'EUR')).toHaveLength(7);
    expect(body.revenueByDay.filter((d) => d.currency === 'EUR').reduce((sum, d) => sum + d.revenue, 0)).toBe(190);
    expect(body.topProducts[0]).toEqual({ titleUrl: 'tent', title: 'Tent', qty: 1, revenue: 1500, currency: 'CZK' });
    expect(body.topProducts).toContainEqual({ titleUrl: 'poles', title: 'Poles', qty: 3, revenue: 110, currency: 'EUR' });
    expect(body.recentOrders).toHaveLength(5);
    expect(body.recentOrders.find((o) => o.orderId === 'order-1')).toMatchObject({ customer: 'Jana', amount: 100, status: 'NEW' });
  });

  it('flags what needs attention and reports AI usage', async () => {
    const body = (await t.http.get('/api/admin/overview').query({ days: 30 }).set(auth).expect(200)).body as AdminOverview;

    expect(body.attention.unavailableVisible).toBe(1);
    // The fixtures have English texts only
    expect(body.attention.missingLanguage).toEqual([
      { lang: 'sk', count: 2 },
      { lang: 'cs', count: 2 },
    ]);
    expect(body.attention.missingSeo).toEqual([{ lang: 'en', count: 2 }]);
    expect(body.attention.untranslated).toEqual([
      { lang: 'sk', count: 1 },
      { lang: 'cs', count: 2 },
    ]);
    expect(body.ai).toEqual({ drafts: 2, ok: 1, failed: 1, costUsd: 0.001, lastModel: expect.stringMatching(/^deepseek\/deepseek-flash$/) });
  });

  it('accepts today, 7 or 30 days and falls back to 7', async () => {
    expect((await t.http.get('/api/admin/overview').query({ days: 1 }).set(auth).expect(200)).body.revenueByDay.length).toBeGreaterThanOrEqual(1);
    expect((await t.http.get('/api/admin/overview').query({ days: 365 }).set(auth).expect(200)).body.days).toBe(7);
  });
});
