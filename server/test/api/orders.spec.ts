import request from 'supertest';
import sgMail from '@sendgrid/mail';

import { stripeMock } from '../mocks/stripe';
import {
  adminToken,
  createTestApp,
  createUser,
  eventually,
  loginToken,
  productFixture,
  TestApp,
} from '../utils/test-app';

const address = {
  name: 'Jane Doe',
  line1: 'Main 1',
  city: 'Bratislava',
  zip: '81101',
  country: 'SK',
};

describe('Orders API', () => {
  let t: TestApp;
  let carId: string;

  beforeAll(async () => {
    t = await createTestApp();
    const car = await t.model('Product').create(productFixture('car')); // 25, basic shipping
    carId = String(car._id);
  });
  afterAll(() => t.close());

  beforeEach(async () => {
    await t.model('Order').deleteMany({});
    jest.clearAllMocks();
  });

  /** Returns a session agent with `qty` cars in the cart. */
  async function shopperWithCart(qty = 2) {
    const agent = request.agent(t.app.getHttpServer());
    for (let i = 0; i < qty; i++) {
      await agent.get('/api/cart/add').query({ id: carId }).set('lang', 'en').expect(200);
    }
    return agent;
  }

  describe('POST /api/orders/add (cash on delivery)', () => {
    it('creates an order from the session cart and empties the cart', async () => {
      const agent = await shopperWithCart(2);

      const res = await agent
        .post('/api/orders/add')
        .set('lang', 'en')
        .send({ email: 'buyer@test.dev', addresses: [address], currency: 'EUR', amount: 55, notes: 'Ring twice' })
        .expect(201);

      expect(res.body.error).toBe('');
      expect(res.body.cart.items).toEqual([]);

      const order: any = await t.model('Order').findOne({}).lean();
      expect(order).toMatchObject({
        status: 'NEW',
        type: 'PAYMENT_ON_DELIVERY',
        amount: 2 * 25 + 5, // server-side session total incl. shipping
        currency: 'EUR',
        customerEmail: 'buyer@test.dev',
        notes: 'Ring twice',
      });
      expect(order.orderId).toMatch(/^order\d+t\d+$/);
      expect(order.cart.totalQty).toBe(2);

      const cart = await agent.get('/api/cart').set('lang', 'en').expect(200);
      expect(cart.body.totalQty).toBe(0);
    });

    it('ignores the client-sent amount and uses the server-side cart total', async () => {
      const agent = await shopperWithCart(1);

      await agent
        .post('/api/orders/add')
        .set('lang', 'en')
        .send({ email: 'buyer@test.dev', addresses: [address], currency: 'EUR', amount: 1 })
        .expect(201);

      const order: any = await t.model('Order').findOne({}).lean();
      expect(order.amount).toBe(25 + 5);
    });

    it('emails the customer and every admin', async () => {
      const agent = await shopperWithCart(1);

      await agent
        .post('/api/orders/add')
        .set('lang', 'en')
        .send({ email: 'buyer@test.dev', addresses: [address], currency: 'EUR', amount: 30 })
        .expect(201);

      const recipients = await eventually(async () => {
        const to = (sgMail.send as jest.Mock).mock.calls.map(([msg]) => msg.to);
        if (to.length < 3) throw new Error('emails not sent yet');
        return to;
      });
      expect(recipients.sort()).toEqual(['admin1@test.dev', 'admin2@test.dev', 'buyer@test.dev']);
    });

    it('returns 422 instead of crashing on an invalid body (SEC-02 regression)', async () => {
      const agent = await shopperWithCart(1);

      await agent
        .post('/api/orders/add')
        .set('lang', 'en')
        .send({ email: 'buyer@test.dev', notes: { not: 'a string' } })
        .expect(422);

      // the server is still alive
      await agent.get('/api/cart').set('lang', 'en').expect(200);
    });
  });

  describe('POST /api/orders/stripe', () => {
    it('charges the cart total, captures it and stores a paid order', async () => {
      const agent = await shopperWithCart(2);

      const res = await agent
        .post('/api/orders/stripe')
        .set('lang', 'en')
        .send({ token: { id: 'tok_visa' }, email: 'buyer@test.dev', addresses: [address], currency: 'EUR' })
        .expect(201);

      expect(res.body.error).toBe('');
      expect(stripeMock.charges.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: (2 * 25 + 5) * 100, currency: 'EUR', source: 'tok_visa', capture: false }),
      );
      expect(stripeMock.charges.capture).toHaveBeenCalledWith('ch_test_123');

      const order: any = await t.model('Order').findOne({}).lean();
      expect(order).toMatchObject({ status: 'PAID', type: 'WITH_PAYMENT', cardId: 'ch_test_123', amount: 55 });
    });

    it('returns 422 and stores no order when the charge fails', async () => {
      stripeMock.charges.create.mockRejectedValueOnce(new Error('card_declined'));
      const agent = await shopperWithCart(1);

      await agent
        .post('/api/orders/stripe')
        .set('lang', 'en')
        .send({ token: { id: 'tok_declined' }, email: 'buyer@test.dev', addresses: [address], currency: 'EUR' })
        .expect(422);

      expect(await t.model('Order').countDocuments()).toBe(0);
      // the cart is kept so the customer can retry
      const cart = await agent.get('/api/cart').set('lang', 'en').expect(200);
      expect(cart.body.totalQty).toBe(1);
    });
  });

  describe('order history', () => {
    it("lists only the logged-in user's orders", async () => {
      const me = await createUser(t, { email: 'me@test.dev' });
      const token = await loginToken(t, 'me@test.dev');
      await t.model('Order').create([
        { orderId: 'mine', _user: me._id, amount: 10 },
        { orderId: 'someone-else', amount: 20 },
      ]);

      const res = await t.http.get('/api/orders').set('Authorization', `Bearer ${token}`).expect(200);

      expect(res.body.map((o: any) => o.orderId)).toEqual(['mine']);
    });

    it('requires login', async () => {
      await t.http.get('/api/orders').expect(401);
    });
  });

  describe('admin order management', () => {
    it('lists all orders, gets one and updates its status', async () => {
      const token = await adminToken(t, 'orders-admin@test.dev');
      await t.model('Order').create([
        { orderId: 'o1', status: 'NEW', dateAdded: new Date('2026-01-01') },
        { orderId: 'o2', status: 'NEW', dateAdded: new Date('2026-02-01') },
      ]);
      const auth = { Authorization: `Bearer ${token}` };

      const all = await t.http.get('/api/orders/all').set(auth).expect(200);
      expect(all.body.map((o: any) => o.orderId)).toEqual(['o2', 'o1']); // newest first

      const one = await t.http.get('/api/orders/o1').set(auth).expect(200);
      expect(one.body.orderId).toBe('o1');

      const updated = await t.http.patch('/api/orders').set(auth).send({ orderId: 'o1', status: 'SHIPPING' }).expect(200);
      expect(updated.body.status).toBe('SHIPPING');
    });
  });
});
