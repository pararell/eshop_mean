import request from 'supertest';
import sgMail from '@sendgrid/mail';
import { eq } from 'drizzle-orm';

import { orders, stripeEvents } from '../../src/db/schema';
import { signWebhook, StripeStub } from '../utils/stripe-stub';
import { adminToken, createTestApp, createUser, eventually, loginToken, productFixture, TestApp } from '../utils/test-app';

const WEBHOOK_SECRET = 'whsec_test_secret';
const address = { name: 'Jane Doe', line1: 'Main 1', city: 'Bratislava', zip: '81101', country: 'SK' };
const buyer = { email: 'buyer@test.dev', addresses: [address], notes: 'Ring twice' };
// One email to the customer and one per ADMIN_EMAILS entry (two in test/setup/env.ts)
const EMAILS_PER_ORDER = 3;

describe('Payments API (Stripe Payment Element)', () => {
  let t: TestApp;
  let stripe: StripeStub;
  let carId: string;

  beforeAll(async () => {
    stripe = await new StripeStub().start();
    Object.assign(process.env, { STRIPE_API_BASE: stripe.url, STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET });
    t = await createTestApp();
    carId = String((await t.model('Product').create(productFixture('car')))._id); // 25 EUR, basic shipping 5
  });
  afterAll(async () => {
    await t.close();
    await stripe.stop();
    Object.assign(process.env, { STRIPE_API_BASE: 'http://127.0.0.1:9', STRIPE_WEBHOOK_SECRET: '' });
  });
  beforeEach(async () => {
    stripe.reset();
    await t.model('Order').deleteMany({});
    await t.db.delete(stripeEvents);
    jest.clearAllMocks();
  });

  async function shopper(qty = 2, lang = 'en', productId = carId) {
    const agent = request.agent(t.app.getHttpServer());
    for (let i = 0; i < qty; i++) {
      await agent.get('/api/cart/add').query({ id: productId }).set('lang', lang).expect(200);
    }
    return agent;
  }
  const intent = (agent: ReturnType<typeof request.agent>, body: object = buyer, lang = 'en') =>
    agent.post('/api/payments/intent').set('lang', lang).send(body);
  const complete = (agent: ReturnType<typeof request.agent>, orderId: string) =>
    agent.post('/api/payments/complete').set('lang', 'en').send({ orderId });
  const orderRow = async (orderId: string) => (await t.db.select().from(orders).where(eq(orders.orderNumber, orderId)))[0];
  const webhook = (payload: string, signature = signWebhook(payload, WEBHOOK_SECRET)) =>
    t.http.post('/api/payments/webhook').set('content-type', 'application/json').set('stripe-signature', signature).send(payload);
  const emailCount = () => (sgMail.send as jest.Mock).mock.calls.length;

  describe('POST /api/payments/intent', () => {
    it('creates a pending order and a PaymentIntent from the server-side cart total', async () => {
      const agent = await shopper(2);

      const res = await intent(agent).expect(200);

      expect(res.body).toEqual({
        orderId: expect.stringMatching(/^order\d+t\d+$/),
        clientSecret: 'pi_stub_1_secret_stub',
        amount: 55,
        currency: 'EUR',
      });
      const row = await orderRow(res.body.orderId);
      expect(row).toMatchObject({
        status: 'PENDING_PAYMENT',
        type: 'WITH_PAYMENT',
        amount: 55,
        currency: 'EUR',
        customerEmail: 'buyer@test.dev',
        notes: 'Ring twice',
        paymentIntentId: 'pi_stub_1',
      });
      const [create] = stripe.apiCalls('POST', '/v1/payment_intents');
      expect(create.body).toMatchObject({
        amount: '5500',
        currency: 'eur',
        automatic_payment_methods: { enabled: 'true' },
        receipt_email: 'buyer@test.dev',
        metadata: { orderId: res.body.orderId, lang: 'en' },
      });
      expect(create.idempotencyKey).toBe(`order-${res.body.orderId}`);
      // nothing is paid yet: no emails, cart kept
      expect(emailCount()).toBe(0);
      expect((await agent.get('/api/cart').set('lang', 'en')).body.totalQty).toBe(2);
    });

    it('never takes amount, currency or the user from the client', async () => {
      const someone = await createUser(t, { email: 'someone@test.dev' });
      const agent = await shopper(1);

      const res = await intent(agent, { ...buyer, amount: 1, currency: 'CZK', userId: someone._id }).expect(200);

      expect(res.body).toMatchObject({ amount: 30, currency: 'EUR' });
      expect((await orderRow(res.body.orderId)).userId).toBeNull();
    });

    it('attaches the order to the logged-in user', async () => {
      const me = await createUser(t, { email: 'me@test.dev' });
      const token = await loginToken(t, 'me@test.dev');
      const agent = await shopper(1);

      const res = await intent(agent).set('Authorization', `Bearer ${token}`).expect(200);

      expect((await orderRow(res.body.orderId)).userId).toBe(me._id);
    });

    it('validates the customer details (422) and refuses an empty cart', async () => {
      const agent = await shopper(1);
      await intent(agent, { ...buyer, email: 'not-an-email' }).expect(422);
      await intent(agent, { ...buyer, addresses: [] }).expect(422);
      await intent(agent, { ...buyer, addresses: [{ ...address, city: '' }] }).expect(422);

      const empty = await intent(request.agent(t.app.getHttpServer())).expect(422);
      expect(empty.body.message).toBe('Your cart is empty.');
      expect(stripe.apiCalls()).toHaveLength(0);
    });

    it('reuses the pending order and updates the intent when the customer retries', async () => {
      const agent = await shopper(1);
      const first = await intent(agent).expect(200);
      await agent.get('/api/cart/add').query({ id: carId }).set('lang', 'en').expect(200);

      const second = await intent(agent, { ...buyer, email: 'new@test.dev' }).expect(200);

      expect(second.body).toMatchObject({ orderId: first.body.orderId, clientSecret: first.body.clientSecret, amount: 55 });
      expect(await t.model('Order').countDocuments()).toBe(1);
      expect(stripe.apiCalls('POST', '/v1/payment_intents/pi_stub_1')[0].body).toMatchObject({ amount: '5500', receipt_email: 'new@test.dev' });
      expect(await orderRow(first.body.orderId)).toMatchObject({ amount: 55, customerEmail: 'new@test.dev' });
    });

    it('charges in the currency of the language, in integer minor units (SEC-03, BUG-01)', async () => {
      const czech = await t
        .model('Product')
        .create(productFixture('czech-car', { cs: { ...productFixture('x').en, title: 'Auto', salePrice: 500 } }));
      const res = await intent(await shopper(1, 'cs', String(czech._id)), buyer, 'cs').expect(200);
      expect(res.body).toMatchObject({ amount: 650, currency: 'CZK' }); // 500 + 150 CZK shipping
      expect(stripe.apiCalls('POST', '/v1/payment_intents')[0].body).toMatchObject({ amount: '65000', currency: 'czk' });

      const decimal = await t.model('Product').create(productFixture('decimal-car', { en: { ...productFixture('x').en, salePrice: 12.35 } }));
      await intent(await shopper(1, 'en', String(decimal._id))).expect(200);
      // 12.35 + 5 = 17.35, and 17.35 * 100 is 1735.0000000000002 in floating point
      expect(stripe.apiCalls('POST', '/v1/payment_intents')[1].body.amount).toBe('1735');
    });

    it('answers 502 when Stripe refuses, marks that order failed and lets the customer retry', async () => {
      const agent = await shopper(1);
      stripe.failNext = [400];

      const failed = await intent(agent).expect(502);
      expect(failed.body.message).toMatch(/could not be started/);
      const [first] = await t.db.select().from(orders);
      expect(first.status).toBe('PAYMENT_FAILED');

      const retry = await intent(agent).expect(200);
      expect(retry.body.orderId).not.toBe(first.orderNumber);
    });
  });

  describe('POST /api/payments/complete', () => {
    it('marks the order paid once Stripe says succeeded, empties the cart and emails once', async () => {
      const agent = await shopper(2);
      const { orderId } = (await intent(agent).expect(200)).body;
      await stripe.confirm('pi_stub_1', 'succeeded');

      const res = await complete(agent, orderId).expect(200);

      expect(res.body).toMatchObject({ paymentStatus: 'succeeded', order: { orderId, status: 'PAID', cardId: 'ch_stub_2' }, cart: { items: [] } });
      expect((await agent.get('/api/cart').set('lang', 'en')).body.totalQty).toBe(0);
      await eventually(async () => expect(emailCount()).toBe(EMAILS_PER_ORDER));
      // the session is done with this order
      await complete(agent, orderId).expect(404);
      expect(emailCount()).toBe(EMAILS_PER_ORDER);
    });

    it('keeps the order pending and the cart while the payment is processing', async () => {
      const agent = await shopper(1);
      const { orderId } = (await intent(agent).expect(200)).body;
      await stripe.confirm('pi_stub_1', 'processing');

      const res = await complete(agent, orderId).expect(200);

      expect(res.body).toMatchObject({ paymentStatus: 'processing', order: { status: 'PENDING_PAYMENT' }, cart: { totalQty: 1 } });
      expect(emailCount()).toBe(0);
    });

    it('is only available to the session that started the payment', async () => {
      const { orderId } = (await intent(await shopper(1)).expect(200)).body;
      await complete(request.agent(t.app.getHttpServer()), orderId).expect(404);
      await complete(await shopper(1), orderId).expect(404);
    });
  });

  describe('POST /api/payments/webhook', () => {
    it('marks the order paid from a signed payment_intent.succeeded event, exactly once', async () => {
      const agent = await shopper(1);
      const { orderId } = (await intent(agent).expect(200)).body;
      const paid = await stripe.confirm('pi_stub_1', 'succeeded');
      const { payload, event } = await stripe.sendEvent('payment_intent.succeeded', paid, { deliver: false });

      expect((await webhook(payload).expect(200)).body).toEqual({ received: true });

      expect(await orderRow(orderId)).toMatchObject({ status: 'PAID', cardId: 'ch_stub_2' });
      await eventually(async () => expect(emailCount()).toBe(EMAILS_PER_ORDER));
      expect((await t.db.select().from(stripeEvents))[0]).toMatchObject({ id: event.id, type: 'payment_intent.succeeded' });

      // a redelivery of the same event, and the customer coming back, change nothing
      expect((await webhook(payload).expect(200)).body).toEqual({ received: true, duplicate: true });
      const res = await complete(agent, orderId).expect(200);
      expect(res.body.cart.items).toEqual([]);
      expect(emailCount()).toBe(EMAILS_PER_ORDER);
    });

    it('rejects a missing, wrong or tampered signature', async () => {
      const { orderId } = (await intent(await shopper(1)).expect(200)).body;
      const paid = await stripe.confirm('pi_stub_1', 'succeeded');
      const { payload } = await stripe.sendEvent('payment_intent.succeeded', paid, { deliver: false });

      await t.http.post('/api/payments/webhook').set('content-type', 'application/json').send(payload).expect(400);
      await webhook(payload, signWebhook(payload, 'whsec_someone_else')).expect(400);
      await webhook(payload.replace('"amount":3000', '"amount":1'), signWebhook(payload, WEBHOOK_SECRET)).expect(400);
      await webhook(payload, signWebhook(payload, WEBHOOK_SECRET, Math.floor(Date.now() / 1000) - 3600)).expect(400);

      expect((await orderRow(orderId)).status).toBe('PENDING_PAYMENT');
    });

    it('records a failed payment; the customer retries with the same order', async () => {
      const agent = await shopper(1);
      const { orderId } = (await intent(agent).expect(200)).body;
      const declined = await stripe.confirm('pi_stub_1', 'declined');
      await webhook((await stripe.sendEvent('payment_intent.payment_failed', declined, { deliver: false })).payload).expect(200);

      expect(await orderRow(orderId)).toMatchObject({ status: 'PAYMENT_FAILED', description: 'Your card was declined.' });

      const retry = await intent(agent).expect(200);
      expect(retry.body.orderId).toBe(orderId);
      expect((await orderRow(orderId)).status).toBe('PENDING_PAYMENT');
    });

    it('acknowledges events it does not handle', async () => {
      const { payload } = await stripe.sendEvent('customer.created', { id: 'cus_1', object: 'customer' }, { deliver: false });
      await webhook(payload).expect(200);
    });
  });

  describe('POST /api/admin/orders/:orderId/refund', () => {
    async function paidOrder() {
      const agent = await shopper(2);
      const { orderId } = (await intent(agent).expect(200)).body;
      await stripe.confirm('pi_stub_1', 'succeeded');
      await complete(agent, orderId).expect(200);
      return orderId as string;
    }

    it('refunds part, then the rest, and refuses more', async () => {
      const orderId = await paidOrder();
      const auth = { Authorization: `Bearer ${await adminToken(t)}` };

      const partial = await t.http.post(`/api/admin/orders/${orderId}/refund`).set(auth).send({ amount: 10 }).expect(200);
      expect(partial.body).toMatchObject({ status: 'PAID', amount_refunded: 10 });
      const [first] = stripe.apiCalls('POST', '/v1/refunds');
      expect(first.body).toMatchObject({ payment_intent: 'pi_stub_1', amount: '1000', metadata: { orderId } });
      expect(first.idempotencyKey).toBe(`refund-${orderId}-0-1000`);

      await t.http.post(`/api/admin/orders/${orderId}/refund`).set(auth).send({ amount: 50 }).expect(422);
      const rest = await t.http.post(`/api/admin/orders/${orderId}/refund`).set(auth).send({}).expect(200);
      expect(rest.body).toMatchObject({ status: 'REFUNDED', amount_refunded: 55 });
      await t.http.post(`/api/admin/orders/${orderId}/refund`).set(auth).send({}).expect(409);

      // Stripe's charge.refunded event later confirms the same totals
      const charge = stripe.charges.get('ch_stub_2')!;
      await webhook((await stripe.sendEvent('charge.refunded', charge, { deliver: false })).payload).expect(200);
      expect(await orderRow(orderId)).toMatchObject({ status: 'REFUNDED', amountRefunded: 55 });
    });

    it('only refunds paid card orders, and only for admins', async () => {
      const { orderId } = (await intent(await shopper(1)).expect(200)).body;
      const auth = { Authorization: `Bearer ${await adminToken(t)}` };
      await t.http.post(`/api/admin/orders/${orderId}/refund`).set(auth).send({}).expect(409);
      await t.http.post('/api/admin/orders/no-such-order/refund').set(auth).send({}).expect(404);
      await t.http.post(`/api/admin/orders/${orderId}/refund`).send({}).expect(401);
      expect(stripe.apiCalls('POST', '/v1/refunds')).toHaveLength(0);
    });
  });
});

describe('Payments API without Stripe configuration', () => {
  let t: TestApp;
  beforeAll(async () => {
    Object.assign(process.env, { STRIPE_SECRETKEY: '' });
    t = await createTestApp();
  });
  afterAll(async () => {
    await t.close();
    Object.assign(process.env, { STRIPE_SECRETKEY: 'sk_test_dummy' });
  });

  it('answers 503 for payments and webhooks', async () => {
    const car = await t.model('Product').create(productFixture('car'));
    const agent = request.agent(t.app.getHttpServer());
    await agent
      .get('/api/cart/add')
      .query({ id: String(car._id) })
      .set('lang', 'en')
      .expect(200);

    await agent.post('/api/payments/intent').set('lang', 'en').send(buyer).expect(503);
    await t.http.post('/api/payments/webhook').set('content-type', 'application/json').set('stripe-signature', 't=1,v1=x').send('{}').expect(503);
  });
});
