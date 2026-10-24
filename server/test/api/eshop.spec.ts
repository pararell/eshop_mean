import { of, throwError } from 'rxjs';
import { emailSpy, sentEmails } from '../utils/email';

import { adminToken, createTestApp, eventually, httpMock, TestApp } from '../utils/test-app';

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
