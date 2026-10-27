import { of, throwError } from 'rxjs';
import { emailSpy, sentEmails } from '../utils/email';

import { adminToken, createTestApp, eventually, httpMock, TestApp } from '../utils/test-app';
import { loadEmailShop } from '../../src/shared/utils/email/email-shop';

const decodeConfig = (config: string) => JSON.parse(Buffer.from(config, 'base64').toString());

describe('Eshop API (config, pages, contact)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/eshop/config', () => {
    it('exposes FE_* variables and the active theme as base64 JSON', async () => {
      await t.model('Theme').create([
        { titleUrl: 'dark', active: true, styles: { primaryColor: '#000' } },
        { titleUrl: 'light', active: false, styles: { primaryColor: '#fff' } },
      ]);

      const res = await t.http.get('/api/eshop/config').expect(200);
      const config = decodeConfig(res.body.config);

      expect(config).toMatchObject({
        FE_STRIPE_PUBLISHABLE_KEY: 'pk_test_dummy',
        FE_TINYMCE_API_KEY: 'test-tinymce',
        styles: { primaryColor: '#000' },
      });
      // server-side secrets are never exposed
      expect(Object.keys(config)).not.toEqual(expect.arrayContaining(['STRIPE_SECRETKEY', 'JWT_SECRET', 'COOKIE_KEY', 'DATABASE_URL']));
    });

    it('does not start a session (shipping is read from the active config when a cart is priced)', async () => {
      await t
        .model('Config')
        .create({ titleUrl: 'default', active: true, en: { shippingCost: { basic: { cost: 3, limit: 40 }, extended: { cost: 7, limit: 300 } } } });
      try {
        const res = await t.http.get('/api/eshop/config').expect(200);
        expect(res.headers['set-cookie']).toBeUndefined();
      } finally {
        await t.model('Config').deleteMany({});
      }
    });

    it('exposes only variables that start with FE_, not ones that merely contain it', async () => {
      process.env.SAFE_TOKEN = 'secret';
      process.env.MY_FE_SECRET = 'secret';
      try {
        const res = await t.http.get('/api/eshop/config').expect(200);
        const keys = Object.keys(decodeConfig(res.body.config));
        expect(keys).toContain('FE_STRIPE_PUBLISHABLE_KEY');
        expect(keys).not.toContain('SAFE_TOKEN');
        expect(keys).not.toContain('MY_FE_SECRET');
      } finally {
        delete process.env.SAFE_TOKEN;
        delete process.env.MY_FE_SECRET;
      }
    });
  });

  describe('themes', () => {
    beforeEach(() => t.model('Theme').deleteMany({}));
    afterEach(() => t.model('Theme').deleteMany({}));

    it('merges a save into the stored settings, so keys the editor does not show are kept', async () => {
      const token = await adminToken(t, 'themes-admin@test.dev');
      await t.model('Theme').create({ titleUrl: 'forest', active: true, styles: { primaryColor: '#15803d', secondaryColor: '#cccccc' } });

      await t.http
        .post('/api/eshop/theme')
        .set('Authorization', `Bearer ${token}`)
        .send({ titleUrl: 'forest', active: true, styles: { primaryColor: '', shopName: 'Trail Shop' } })
        .expect(201);

      const doc: any = await t.model('Theme').findOne({ titleUrl: 'forest' }).lean();
      expect(doc.styles).toEqual({ primaryColor: '', secondaryColor: '#cccccc', shopName: 'Trail Shop' });
    });

    it('rejects invalid settings with the reasons, and stores nothing', async () => {
      const token = await adminToken(t, 'themes-admin@test.dev');

      const res = await t.http
        .post('/api/eshop/theme')
        .set('Authorization', `Bearer ${token}`)
        .send({ titleUrl: 'bad', active: false, styles: { logo: 'javascript:alert(1)', fontFamily: 'x' } })
        .expect(400);

      expect(res.body.message).toEqual(['logo must be an https URL', 'fontFamily is not a theme setting']);
      expect(await t.model('Theme').countDocuments({ titleUrl: 'bad' })).toBe(0);
    });

    it("uses the theme's shop name in emails", async () => {
      await t.model('Theme').create({ titleUrl: 'named', active: true, styles: { shopName: 'Trail Shop' } });
      expect((await loadEmailShop(t.db, 'en')).name).toBe('Trail Shop');
    });
  });

  describe('pages', () => {
    it('lets an admin create a page that is then publicly readable', async () => {
      const token = await adminToken(t, 'pages-admin@test.dev');

      await t.http
        .post('/api/eshop/page')
        .set('Authorization', `Bearer ${token}`)
        .send({ titleUrl: 'about', en: { title: 'About us', contentHTML: '<p>Hi</p>' } })
        .expect(201);

      const page = await eventually(async () => {
        const res = await t.http.get('/api/eshop/page/about').set('lang', 'en').expect(200);
        if (!res.body?.en) throw new Error('page not saved yet');
        return res.body;
      });
      expect(page.en).toEqual({ title: 'About us', contentHTML: '<p>Hi</p>' });
    });
  });

  describe('POST /api/eshop/contact', () => {
    const message = { email: 'visitor@test.dev', name: 'Visitor', notes: 'Hello', token: 'captcha-token' };

    it('sends the message to the visitor and the admins when the captcha is valid', async () => {
      httpMock.post.mockReturnValueOnce(of({ data: { success: true } }));

      await t.http.post('/api/eshop/contact').set('lang', 'en').send(message).expect(201);

      const recipients = await eventually(async () => {
        const to = sentEmails().map((msg) => msg.to);
        if (to.length < 3) throw new Error('emails not sent yet');
        return to;
      });
      expect(recipients.sort()).toEqual(['admin1@test.dev', 'admin2@test.dev', 'visitor@test.dev']);
      // one Resend request for all three, each recipient a separate message
      expect(emailSpy).toHaveBeenCalledTimes(1);
      // The sender gets a copy, the admins a notice they can reply to
      const byRecipient = Object.fromEntries(sentEmails().map((msg) => [msg.to, msg]));
      expect(byRecipient['visitor@test.dev']).toMatchObject({ from: 'shop@test.dev', subject: expect.stringContaining('We received your message') });
      expect(byRecipient['visitor@test.dev'].text).toContain('Hello');
      expect(byRecipient['admin1@test.dev']).toMatchObject({ subject: 'New message from Visitor', reply_to: 'visitor@test.dev' });
    });

    it('rejects an invalid captcha with 400 and keeps running (SEC-02 regression)', async () => {
      httpMock.post.mockReturnValueOnce(of({ data: { success: false } }));

      await t.http.post('/api/eshop/contact').set('lang', 'en').send(message).expect(400);

      expect(emailSpy).not.toHaveBeenCalled();
      await t.http.get('/api/eshop/config').expect(200); // process still alive
    });

    it('returns an error (not a crash) when the captcha service is unreachable', async () => {
      httpMock.post.mockReturnValueOnce(throwError(() => new Error('ECONNREFUSED')));

      await t.http.post('/api/eshop/contact').set('lang', 'en').send(message).expect(500);
      await t.http.get('/api/eshop/config').expect(200);
    });
  });
});
