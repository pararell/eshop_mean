import request from 'supertest';
import { createTestApp, productFixture, TestApp } from '../utils/test-app';

describe('Cart API (session based)', () => {
  let t: TestApp;
  let carId: string;
  let bikeId: string;

  beforeAll(async () => {
    t = await createTestApp();
    const [car, bike] = await t.model('Product').create([
      productFixture('car'), // 25, basic shipping
      productFixture('bike', { en: { ...productFixture('bike').en, salePrice: 60, shipping: 'extended' } }),
    ]);
    carId = String(car._id);
    bikeId = String(bike._id);
  });
  afterAll(() => t.close());

  // An agent keeps the session cookie between requests, like a browser
  const shopper = () => request.agent(t.app.getHttpServer());

  it('starts with an empty cart', async () => {
    const res = await shopper().get('/api/cart').set('lang', 'en').expect(200);
    expect(res.body).toMatchObject({ items: [], totalPrice: 0, totalQty: 0, shippingCost: 0 });
  });

  it('adds products and keeps them in the session', async () => {
    const agent = shopper();
    await agent.get('/api/cart/add').query({ id: carId }).set('lang', 'en').expect(200);
    await agent.get('/api/cart/add').query({ id: carId }).set('lang', 'en').expect(200);

    const res = await agent.get('/api/cart').set('lang', 'en').expect(200);

    expect(res.body.totalQty).toBe(2);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ id: carId, qty: 2, price: 25 });
    // no active shop config → built-in table: en basic costs 5 below 100
    expect(res.body.shippingCost).toBe(5);
    expect(res.body.totalPrice).toBe(2 * 25 + 5);
  });

  it('switches to extended shipping when an item requires it', async () => {
    const agent = shopper();
    await agent.get('/api/cart/add').query({ id: carId }).set('lang', 'en');
    const res = await agent.get('/api/cart/add').query({ id: bikeId }).set('lang', 'en').expect(200);

    expect(res.body.shippingType).toBe('extended');
    expect(res.body.shippingCost).toBe(10);
    expect(res.body.totalPrice).toBe(25 + 60 + 10);
  });

  it('uses the active shop config for shipping once it is loaded into the session', async () => {
    await t.model('Config').create({
      titleUrl: 'default',
      active: true,
      en: { shippingCost: { basic: { cost: 3, limit: 40 }, extended: { cost: 7, limit: 300 } } },
    });
    const agent = shopper();
    await agent.get('/api/eshop/config').expect(200); // stores the active config in the session

    const res = await agent.get('/api/cart/add').query({ id: carId }).set('lang', 'en').expect(200);
    expect(res.body.shippingCost).toBe(3);

    const free = await agent.get('/api/cart/add').query({ id: carId }).set('lang', 'en').expect(200);
    expect(free.body.shippingType).toBe('free'); // 50 >= limit 40
    expect(free.body.totalPrice).toBe(50);

    await t.model('Config').deleteMany({});
  });

  it('removes one unit at a time', async () => {
    const agent = shopper();
    await agent.get('/api/cart/add').query({ id: carId }).set('lang', 'en');
    await agent.get('/api/cart/add').query({ id: carId }).set('lang', 'en');

    const once = await agent.get('/api/cart/remove').query({ id: carId }).set('lang', 'en').expect(200);
    expect(once.body.totalQty).toBe(1);

    const twice = await agent.get('/api/cart/remove').query({ id: carId }).set('lang', 'en').expect(200);
    expect(twice.body).toMatchObject({ items: [], totalQty: 0, totalPrice: 0 });
  });

  it('requires a product id', async () => {
    await shopper().get('/api/cart/add').set('lang', 'en').expect(400);
  });
});
