import { eq } from 'drizzle-orm';

import { aiUsage } from '../../src/db/schema';
import { AiStub, anthropicReply, draftAnswer, geminiReply } from '../utils/ai-stub';
import { MODEL_PRICES, priceAt } from '../../src/ai/ai.config';
import { adminToken, createTestApp, createUser, loginToken, productFixture, TestApp } from '../utils/test-app';

const IMAGE = (stub: AiStub) => `${stub.url}/test/image/upload/v1/products/jacket.jpg`;

describe('AI product drafts API', () => {
  describe('when no API key is configured', () => {
    let t: TestApp;
    beforeAll(async () => {
      t = await createTestApp();
    });
    afterAll(() => t.close());

    it('reports the feature as disabled and answers 404', async () => {
      const token = await adminToken(t);
      const auth = { Authorization: `Bearer ${token}` };

      expect((await t.http.get('/api/admin/ai/status').set(auth).expect(200)).body).toEqual({ enabled: false });
      await t.http.post('/api/admin/products/ai-draft').set(auth).send({ text: 'jacket' }).expect(404);
    });

    it('keeps the status admin only', async () => {
      await t.http.get('/api/admin/ai/status').expect(401);
    });
  });

  describe('with an unknown AI_PROVIDER', () => {
    let t: TestApp;
    beforeAll(async () => {
      Object.assign(process.env, { AI_PROVIDER: 'openai', GEMINI_API_KEY: 'k' });
      t = await createTestApp();
    });
    afterAll(async () => {
      Object.assign(process.env, { AI_PROVIDER: 'gemini', GEMINI_API_KEY: '' });
      await t.close();
    });

    it('stays off rather than guessing a provider', async () => {
      const auth = { Authorization: `Bearer ${await adminToken(t)}` };
      expect((await t.http.get('/api/admin/ai/status').set(auth).expect(200)).body).toEqual({ enabled: false });
    });
  });

  describe('with a provider (stubbed Gemini)', () => {
    let t: TestApp;
    let stub: AiStub;
    let auth: Record<string, string>;

    beforeAll(async () => {
      stub = await new AiStub().start();
      Object.assign(process.env, {
        GEMINI_API_KEY: 'test-gemini-key',
        AI_BASE_URL: stub.url,
        AI_IMAGE_ORIGIN: stub.url,
        AI_TIMEOUT_MS: '1000',
      });
      // AI config is read when the app is created, so later files are unaffected once these are reset
      t = await createTestApp();
      auth = { Authorization: `Bearer ${await adminToken(t)}` };
      await t.model('Category').create({ titleUrl: 'jackets', en: { title: 'Jackets', visibility: true } });
    });
    afterAll(async () => {
      await t.close();
      await stub.stop();
      Object.assign(process.env, { GEMINI_API_KEY: '', AI_BASE_URL: '', AI_IMAGE_ORIGIN: '' });
      delete process.env.AI_TIMEOUT_MS;
    });
    beforeEach(async () => {
      stub.reset();
      await t.db.delete(aiUsage);
    });

    const draft = (body: Record<string, unknown>) => t.http.post('/api/admin/products/ai-draft').set(auth).send(body);

    it('reports the feature as enabled', async () => {
      const res = await t.http.get('/api/admin/ai/status').set(auth).expect(200);
      expect(res.body).toEqual({ enabled: true, provider: 'gemini', model: 'gemini-3.8-flash' });
    });

    it('returns a multi-language draft without prices or stock, and logs usage', async () => {
      stub.replies = [geminiReply(draftAnswer())];

      const res = await draft({ imageUrls: [IMAGE(stub)], text: "men's winter jacket, black, down, L-XXL" }).expect(200);

      const { draft: d, suggestedCategories, warnings, usage } = res.body;
      expect(d.titleUrl).toBe('men-s-winter-jacket');
      expect(d.tags).toEqual(['jackets']);
      expect(d.images).toEqual([IMAGE(stub)]);
      expect(d.mainImage).toEqual({ url: IMAGE(stub), name: 'men-s-winter-jacket' });
      for (const lang of ['en', 'sk', 'cs']) {
        expect(Object.keys(d[lang]).sort()).toEqual(['description', 'descriptionFull', 'metaDescription', 'seoTitle', 'title']);
      }
      expect(d.en.title).toBe('EN winter jacket');
      // HTML is allow-listed; attributes become a list at the end
      expect(d.en.descriptionFull[0]).toBe(
        '<p>Warm jacket for cold days.</p>Big\n<ul><li><strong>Colour:</strong> black</li><li><strong>Sizes:</strong> L–XXL</li></ul>',
      );
      expect(suggestedCategories).toEqual(['Winter wear']);
      expect(warnings).toEqual(['Fill weight is not given.']);
      expect(usage).toMatchObject({ provider: 'gemini', model: 'gemini-3.8-flash', inputTokens: 1200, outputTokens: 1000 });
      expect(usage.costUsd).toBeCloseTo((1200 * 0.75 + 1000 * 3.75) / 1e6, 6);

      // Gemini got the resized image, the text and the schema; the key went in a header
      const [call] = stub.providerCalls();
      expect(call.url).toBe('/v1beta/models/gemini-3.8-flash:generateContent');
      expect(call.headers['x-goog-api-key']).toBe('test-gemini-key');
      expect(call.body.contents[0].parts[0].inlineData.mimeType).toBe('image/png');
      expect(call.body.contents[0].parts[1].text).toContain("men's winter jacket");
      expect(call.body.generationConfig.responseJsonSchema.properties.categories.items.enum).toEqual(['jackets']);
      expect(stub.requests.find((r) => r.method === 'GET')!.url).toBe('/test/image/upload/c_limit,w_1024,h_1024,f_jpg,q_80/v1/products/jacket.jpg');

      const rows = await t.db.select().from(aiUsage);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ status: 'ok', provider: 'gemini', imageCount: 1, inputTokens: 1200, outputTokens: 1000 });
    });

    it('never saves the draft', async () => {
      stub.replies = [geminiReply(draftAnswer({ titleUrl: 'unsaved-jacket' }))];
      await draft({ text: 'jacket' }).expect(200);
      expect(await t.model('Product').countDocuments({ titleUrl: 'unsaved-jacket' })).toBe(0);
    });

    it('drops unknown categories and makes the slug unique', async () => {
      await t.model('Product').create(productFixture('blue-coat'));
      stub.replies = [geminiReply(draftAnswer({ titleUrl: 'blue-coat', categories: ['jackets', 'invented'] }))];

      const res = await draft({ text: 'blue coat' }).expect(200);

      expect(res.body.draft.titleUrl).toBe('blue-coat-2');
      expect(res.body.draft.tags).toEqual(['jackets']);
      expect(res.body.warnings).toContain('Ignored categories that do not exist in the shop.');
    });

    it('retries once on an invalid answer, then answers 502 and logs both attempts', async () => {
      stub.replies = [geminiReply('not json'), geminiReply({ translations: {} })];

      const res = await draft({ text: 'jacket' }).expect(502);

      expect(res.body.message).toMatch(/unusable answer/);
      expect(stub.providerCalls()).toHaveLength(2);
      expect((await t.db.select().from(aiUsage)).map((r) => r.status)).toEqual(['invalid_output', 'invalid_output']);
    });

    it('recovers when the retry is valid', async () => {
      stub.replies = [geminiReply('not json'), geminiReply(draftAnswer())];
      await draft({ text: 'jacket' }).expect(200);
      expect(stub.providerCalls()).toHaveLength(2);
    });

    it.each([
      [429, 503],
      [401, 502],
      [500, 502],
    ])('maps provider HTTP %i to %i', async (providerStatus, status) => {
      stub.replies = [{ status: providerStatus, body: { error: { message: 'nope' } } }];
      const res = await draft({ text: 'jacket' }).expect(status);
      expect(JSON.stringify(res.body)).not.toContain('test-gemini-key');
    });

    it('answers 504 when the provider is too slow', async () => {
      stub.replies = [{ ...geminiReply(draftAnswer()), delayMs: 2500 }];
      const res = await draft({ text: 'jacket' }).expect(504);
      expect(res.body.message).toMatch(/too long/);
      expect((await t.db.select().from(aiUsage)).map((r) => r.status)).toEqual(['timeout']);
    });

    it('answers 422 when the provider blocks the input', async () => {
      stub.replies = [{ body: { promptFeedback: { blockReason: 'SAFETY' }, usageMetadata: { promptTokenCount: 50 } } }];
      const res = await draft({ text: 'jacket' }).expect(422);
      expect(res.body.message).toMatch(/declined/);
      expect(stub.providerCalls()).toHaveLength(1);
    });

    it('validates the input (422)', async () => {
      await draft({}).expect(422);
      await draft({ text: 'x'.repeat(501) }).expect(422);
      await draft({ imageUrls: [IMAGE(stub), IMAGE(stub), IMAGE(stub), IMAGE(stub)] }).expect(422);
      await draft({ text: 'jacket', price: 10 }).expect(422);
      // only this shop's Cloudinary images, never other hosts
      const foreign = await draft({ imageUrls: ['https://example.com/test/image/upload/a.jpg'] }).expect(422);
      expect(foreign.body.message).toMatch(/Cloudinary/);
      await draft({ imageUrls: [`${stub.url}/other-cloud/image/upload/a.jpg`] }).expect(422);
      expect(stub.providerCalls()).toHaveLength(0);
    });

    it('is admin only', async () => {
      await t.http.post('/api/admin/products/ai-draft').send({ text: 'jacket' }).expect(401);
      // RolesGuard answers 401 (not 403) for non-admins, like every admin route
      await createUser(t, { email: 'shopper@test.dev' });
      const shopper = await loginToken(t, 'shopper@test.dev');
      await t.http.post('/api/admin/products/ai-draft').set('Authorization', `Bearer ${shopper}`).send({ text: 'jacket' }).expect(401);
      expect(stub.providerCalls()).toHaveLength(0);
      expect(await t.db.select().from(aiUsage).where(eq(aiUsage.status, 'ok'))).toHaveLength(0);
    });
  });

  describe('with Anthropic (stubbed Claude)', () => {
    let t: TestApp;
    let stub: AiStub;

    beforeAll(async () => {
      stub = await new AiStub().start();
      Object.assign(process.env, {
        AI_PROVIDER: 'anthropic',
        ANTHROPIC_API_KEY: 'test-anthropic-key',
        AI_BASE_URL: stub.url,
        AI_IMAGE_ORIGIN: stub.url,
      });
      t = await createTestApp();
    });
    afterAll(async () => {
      await t.close();
      await stub.stop();
      Object.assign(process.env, { AI_PROVIDER: 'gemini', ANTHROPIC_API_KEY: '', AI_BASE_URL: '', AI_IMAGE_ORIGIN: '' });
    });

    it('creates the same draft through a forced tool call', async () => {
      const auth = { Authorization: `Bearer ${await adminToken(t)}` };
      expect((await t.http.get('/api/admin/ai/status').set(auth).expect(200)).body).toEqual({
        enabled: true,
        provider: 'anthropic',
        model: 'claude-haiku-5-5',
      });
      stub.replies = [anthropicReply(draftAnswer({ categories: [] }))];

      const res = await t.http
        .post('/api/admin/products/ai-draft')
        .set(auth)
        .send({ imageUrls: [IMAGE(stub)], text: 'jacket' })
        .expect(200);

      expect(res.body.draft.sk.title).toBe('SK winter jacket');
      expect(res.body.usage).toMatchObject({ provider: 'anthropic', inputTokens: 2000, outputTokens: 900 });
      expect(res.body.usage.costUsd).toBeCloseTo((2000 * 0.1 + 900 * 0.5) / 1e6, 6);
      const [call] = stub.providerCalls();
      expect(call.url).toBe('/v1/messages');
      expect(call.headers['x-api-key']).toBe('test-anthropic-key');
      expect(call.body.tool_choice).toEqual({ type: 'tool', name: 'save_product_draft' });
      expect(call.body.messages[0].content[0]).toMatchObject({ type: 'image', source: { type: 'base64', media_type: 'image/png' } });
    });
  });

  describe('with DeepSeek (stubbed, the default provider)', () => {
    let t: TestApp;
    let stub: AiStub;

    beforeAll(async () => {
      stub = await new AiStub().start();
      Object.assign(process.env, {
        AI_PROVIDER: 'deepseek',
        DEEPSEEK_API_KEY: 'test-deepseek-key',
        AI_BASE_URL: stub.url,
        AI_IMAGE_ORIGIN: stub.url,
      });
      t = await createTestApp();
    });
    afterAll(async () => {
      await t.close();
      await stub.stop();
      Object.assign(process.env, { AI_PROVIDER: 'gemini', DEEPSEEK_API_KEY: '', AI_BASE_URL: '', AI_IMAGE_ORIGIN: '' });
    });

    it('retries a busy answer, then creates the draft with thinking off and the admin language first', async () => {
      const auth = { Authorization: `Bearer ${await adminToken(t)}` };
      expect((await t.http.get('/api/admin/ai/status').set(auth).expect(200)).body).toEqual({
        enabled: true,
        provider: 'deepseek',
        model: 'deepseek-flash',
      });
      stub.replies = [{ status: 429, body: { error: { message: 'busy' } } }, anthropicReply(draftAnswer({ categories: [] }))];

      const res = await t.http
        .post('/api/admin/products/ai-draft')
        .set(auth)
        .set('lang', 'sk')
        .send({ imageUrls: [IMAGE(stub)], text: 'bunda' })
        .expect(200);

      expect(res.body.draft.sk.title).toBe('SK winter jacket');
      const calls = stub.providerCalls();
      expect(calls).toHaveLength(2);
      const call = calls[1];
      expect(call.url).toBe('/v1/messages');
      expect(call.headers['x-api-key']).toBe('test-deepseek-key');
      expect(call.body).toMatchObject({ model: 'deepseek-flash', thinking: { type: 'disabled' }, max_tokens: 8192 });
      expect(Object.keys(call.body.tools[0].input_schema.properties.translations.properties)).toEqual(['sk', 'en', 'cs']);

      // Cost at the DeepSeek rate of this hour (peak or off-peak); the busy attempt cost nothing
      const rate = priceAt(MODEL_PRICES['deepseek-flash'], new Date());
      expect(res.body.usage).toMatchObject({ provider: 'deepseek', inputTokens: 2000, outputTokens: 900 });
      expect(res.body.usage.costUsd).toBeCloseTo((2000 * rate.inputPerMTok + 900 * rate.outputPerMTok) / 1e6, 6);
    });
  });
});
