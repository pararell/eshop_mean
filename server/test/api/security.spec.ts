import { createTestApp, productFixture, TestApp } from '../utils/test-app';

describe('Security middleware', () => {
  describe('defaults', () => {
    let t: TestApp;
    let productId: string;

    beforeAll(async () => {
      t = await createTestApp();
      productId = String((await t.model('Product').create(productFixture('car')))._id);
    });
    afterAll(() => t.close());

    it('sends security headers, with the CSP in report-only mode (SEC-09)', async () => {
      const res = await t.http.get('/api/products/categories').set('lang', 'en').expect(200);

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(res.headers['strict-transport-security']).toBe('max-age=15552000');
      expect(res.headers['x-powered-by']).toBeUndefined();
      expect(res.headers['content-security-policy']).toBeUndefined();
      const csp = res.headers['content-security-policy-report-only'];
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain('https://js.stripe.com');
      expect(csp).toContain("object-src 'none'");
    });

    it('sets an httpOnly, SameSite=Lax session cookie, not Secure over plain HTTP (SEC-11)', async () => {
      const res = await t.http.get('/api/cart/add').query({ id: productId }).set('lang', 'en').expect(200);

      const cookie = String(res.headers['set-cookie']);
      expect(cookie).toMatch(/connect\.sid=/);
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/SameSite=Lax/);
      expect(cookie).not.toMatch(/Secure/);
    });

    it('does not trust X-Forwarded-* without TRUST_PROXY', async () => {
      const res = await t.http.get('/api/cart/add').query({ id: productId }).set('lang', 'en').set('X-Forwarded-Proto', 'https').expect(200);
      expect(String(res.headers['set-cookie'])).not.toMatch(/Secure/);
    });
  });

  describe('behind a proxy (TRUST_PROXY=1) with a low rate limit', () => {
    let t: TestApp;
    let productId: string;

    beforeAll(async () => {
      Object.assign(process.env, { TRUST_PROXY: '1', RATE_LIMIT_PER_MINUTE: '3' });
      t = await createTestApp();
      productId = String((await t.model('Product').create(productFixture('car')))._id);
    });
    afterAll(async () => {
      Object.assign(process.env, { TRUST_PROXY: '', RATE_LIMIT_PER_MINUTE: '10000' });
      await t.close();
    });

    it('marks the session cookie Secure when the proxy says the request was HTTPS', async () => {
      const res = await t.http.get('/api/cart/add').query({ id: productId }).set('lang', 'en').set('X-Forwarded-Proto', 'https').expect(200);
      expect(String(res.headers['set-cookie'])).toMatch(/Secure/);
    });

    it('limits sign-in attempts per client IP (SEC-06)', async () => {
      const signIn = (ip: string) => t.http.post('/api/auth/signin').set('X-Forwarded-For', ip).send({ email: 'nobody@test.dev', password: 'abc12' });

      for (let i = 0; i < 3; i++) {
        expect((await signIn('203.0.113.7')).status).toBe(401);
      }
      const blocked = await signIn('203.0.113.7');
      expect(blocked.status).toBe(429);
      expect(blocked.body.message).toMatch(/Too many requests/);
      expect(blocked.headers['retry-after']).toBeDefined();

      // another client is not affected
      expect((await signIn('198.51.100.20')).status).toBe(401);
    });

    it('counts each endpoint separately and leaves other endpoints alone', async () => {
      const ip = '203.0.113.99';
      for (let i = 0; i < 3; i++) {
        await t.http
          .post('/api/auth/signup')
          .set('X-Forwarded-For', ip)
          .send({ email: `u${i}@test.dev`, password: 'abc12' });
      }
      expect((await t.http.post('/api/auth/signup').set('X-Forwarded-For', ip).send({ email: 'u9@test.dev', password: 'abc12' })).status).toBe(429);
      // GET endpoints (SSR) are never limited
      for (let i = 0; i < 10; i++) {
        await t.http.get('/api/products/categories').set('X-Forwarded-For', ip).set('lang', 'en').expect(200);
      }
    });
  });
});
