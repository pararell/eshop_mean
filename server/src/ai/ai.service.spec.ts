import { HttpException } from '@nestjs/common';

import { createTestDatabase, TestDatabase } from '../../test/utils/test-db';
import { aiUsage, categories, products, users } from '../db/schema';
import type { Database } from '../db/database.module';
import { readAiConfig } from './ai.config';
import { AiService, primaryFirst } from './ai.service';
import { LlmError, LlmProvider, LlmRequest, LlmResponse } from './providers/llm-provider';

/** Scripted provider: each call takes the next step (an answer or an error) */
class FakeProvider implements LlmProvider {
  readonly name = 'gemini' as const;
  readonly model = 'fake-flash';
  readonly calls: LlmRequest[] = [];
  steps: (LlmResponse | LlmError | (() => Promise<LlmResponse>))[] = [];

  async generate(request: LlmRequest): Promise<LlmResponse> {
    this.calls.push(request);
    const step = this.steps.shift();
    if (!step) throw new Error('no scripted answer');
    if (step instanceof LlmError) throw step;
    return typeof step === 'function' ? step() : step;
  }
}

const lang = (title: string) => ({
  title,
  shortDescription: 'short',
  descriptionHtml: '<p>body</p>',
  attributes: [],
  seoTitle: 'seo',
  metaDescription: 'meta',
});
const answer = (overrides: Record<string, unknown> = {}): LlmResponse => ({
  json: {
    titleUrl: 'jacket',
    categories: ['jackets'],
    suggestedCategories: [],
    warnings: [],
    translations: { en: lang('Jacket'), sk: lang('Bunda'), cs: lang('Bunda') },
    ...overrides,
  },
  usage: { inputTokens: 1_000_000, outputTokens: 100_000 },
});

const status = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return { status: (error as HttpException).getStatus(), message: (error as HttpException).message };
  }
  return { status: 200, message: '' };
};

describe('AiService', () => {
  let database: TestDatabase;
  let db: Database;
  let provider: FakeProvider;
  let service: AiService;
  let userId: string;
  const env = {
    AI_PROVIDER: 'gemini',
    CLOUDINARY_NAME: 'shop',
    GEMINI_API_KEY: 'k',
  };
  // No real waits between retries in tests
  const config = { ...readAiConfig(env), price: { inputPerMTok: 0.5, outputPerMTok: 2 }, retryDelayMs: 0 };

  beforeAll(async () => {
    database = await createTestDatabase();
    db = database.db;
    [{ id: userId }] = await db
      .insert(users)
      .values({ email: 'admin@test.dev', roles: ['admin'] })
      .returning({ id: users.id });
    await db.insert(categories).values({ titleUrl: 'jackets' });
  });
  afterAll(() => database.drop());

  beforeEach(async () => {
    await db.delete(aiUsage);
    provider = new FakeProvider();
    service = new AiService(db, config, provider);
  });

  it('returns a draft with summed usage and logs one usage row', async () => {
    provider.steps = [answer()];

    const result = await service.createDraft(userId, { text: 'black jacket' });

    expect(result.draft.en!.title).toBe('Jacket');
    expect(result.usage).toMatchObject({ provider: 'gemini', model: 'fake-flash', inputTokens: 1_000_000, outputTokens: 100_000, costUsd: 0.7 });
    const [row] = await db.select().from(aiUsage);
    expect(row).toMatchObject({ userId, status: 'ok', inputTokens: 1_000_000, outputTokens: 100_000, costUsd: 0.7, imageCount: 0 });
  });

  it('passes the categories and languages to the provider', async () => {
    provider.steps = [answer()];
    await service.createDraft(userId, { text: 'jacket' });

    const [call] = provider.calls;
    expect(call.system).toContain('jackets');
    expect((call.schema as { properties: { categories: { items: { enum: string[] } } } }).properties.categories.items.enum).toEqual(['jackets']);
    expect(call.prompt).toContain('<<<\njacket\n>>>');
    expect(call.timeoutMs).toBe(0);
    expect(call.maxOutputTokens).toBe(8192);
  });

  it("writes the admin's language first (lang header), the others after it", async () => {
    provider.steps = [answer()];
    await service.createDraft(userId, { text: 'jacket' }, 'sk');

    const [call] = provider.calls;
    const translations = (call.schema as { properties: { translations: { properties: object; required: string[] } } }).properties.translations;
    expect(Object.keys(translations.properties)).toEqual(['sk', 'en', 'cs']);
    expect(translations.required).toEqual(['sk', 'en', 'cs']);
    expect(call.system).toContain('Write Slovak (sk) first');
  });

  it('keeps the configured order for a missing or unknown language', () => {
    expect(primaryFirst(['en', 'sk', 'cs'], undefined)).toEqual(['en', 'sk', 'cs']);
    expect(primaryFirst(['en', 'sk', 'cs'], 'de')).toEqual(['en', 'sk', 'cs']);
    expect(primaryFirst(['en', 'sk', 'cs'], 'cs')).toEqual(['cs', 'en', 'sk']);
  });

  it('retries a busy provider (429/503) with backoff, then succeeds', async () => {
    provider.steps = [new LlmError('unavailable', 'HTTP 429'), new LlmError('unavailable', 'HTTP 503'), answer()];

    const result = await service.createDraft(userId, { text: 'jacket' });

    expect(provider.calls).toHaveLength(3);
    expect(result.draft.en!.title).toBe('Jacket');
    expect((await db.select().from(aiUsage)).map((r) => r.status).sort()).toEqual(['error', 'error', 'ok']);
  });

  it('gives up after three busy answers with a clear 503', async () => {
    provider.steps = [1, 2, 3].map(() => new LlmError('unavailable', 'HTTP 429'));

    expect(await status(service.createDraft(userId, { text: 'jacket' }))).toMatchObject({
      status: 503,
      message: expect.stringMatching(/busy/),
    });
    expect(provider.calls).toHaveLength(3);
  });

  it("waits as long as the provider's Retry-After says (capped)", async () => {
    const slow = new AiService(db, { ...config, retryDelayMs: 0 }, provider);
    provider.steps = [new LlmError('unavailable', 'HTTP 429', undefined, 300), answer()];

    const started = Date.now();
    await slow.createDraft(userId, { text: 'jacket' });

    expect(Date.now() - started).toBeGreaterThanOrEqual(290);
  });

  it('retries an invalid answer once and adds up both attempts', async () => {
    provider.steps = [answer({ translations: {} }), answer()];

    const result = await service.createDraft(userId, { text: 'jacket' });

    expect(provider.calls).toHaveLength(2);
    expect(result.usage.costUsd).toBe(1.4);
    expect((await db.select().from(aiUsage)).map((r) => r.status).sort()).toEqual(['invalid_output', 'ok']);
  });

  it.each([
    ['timeout', 504, 'timeout'],
    ['auth', 502, 'error'],
    ['refused', 422, 'error'],
    ['upstream', 502, 'error'],
  ] as const)('maps a %s error to HTTP %i without retrying', async (kind, httpStatus, rowStatus) => {
    provider.steps = [new LlmError(kind, 'boom', { inputTokens: 10, outputTokens: 0 })];

    expect((await status(service.createDraft(userId, { text: 'jacket' }))).status).toBe(httpStatus);
    expect(provider.calls).toHaveLength(1);
    const [row] = await db.select().from(aiUsage);
    expect(row).toMatchObject({ status: rowStatus, errorCode: kind, inputTokens: 10 });
  });

  it('allows one request at a time per admin', async () => {
    let release!: () => void;
    provider.steps = [() => new Promise<LlmResponse>((resolve) => (release = () => resolve(answer())))];

    const first = service.createDraft(userId, { text: 'jacket' });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(await status(service.createDraft(userId, { text: 'jacket' }))).toMatchObject({ status: 429, message: expect.stringMatching(/already/) });

    release();
    await expect(first).resolves.toBeDefined();
    // the lock is released afterwards
    provider.steps = [answer()];
    await expect(service.createDraft(userId, { text: 'jacket' })).resolves.toBeDefined();
  });

  it('has no usage limits: a full usage log never blocks a draft', async () => {
    await db
      .insert(aiUsage)
      .values(Array.from({ length: 500 }, () => ({ userId, provider: 'gemini', model: 'm', status: 'ok' as const, costUsd: 1 })));
    provider.steps = [answer()];
    await expect(service.createDraft(userId, { text: 'x' })).resolves.toBeDefined();
    expect(provider.calls).toHaveLength(1);
  });

  it('rejects requests without input and images from other hosts before calling the AI', async () => {
    expect((await status(service.createDraft(userId, { text: '  ' }))).status).toBe(422);
    expect(await status(service.createDraft(userId, { imageUrls: ['https://example.com/a.jpg'] }))).toMatchObject({
      status: 422,
      message: expect.stringMatching(/Cloudinary/),
    });
    expect(provider.calls).toHaveLength(0);
    expect(await db.select().from(aiUsage)).toHaveLength(0);
  });

  it('suffixes the slug when a product already uses it', async () => {
    await db.insert(products).values([{ titleUrl: 'jacket' }, { titleUrl: 'jacket-2' }]);
    provider.steps = [answer()];

    const result = await service.createDraft(userId, { text: 'jacket' });

    expect(result.draft.titleUrl).toBe('jacket-3');
    expect(result.draft.mainImage.name).toBe('jacket-3');
    await db.delete(products);
  });

  it('is disabled without a provider', async () => {
    const disabled = new AiService(db, readAiConfig({}), null);
    expect(disabled.status()).toEqual({ enabled: false });
    expect((await status(disabled.createDraft(userId, { text: 'x' }))).status).toBe(404);
    expect(service.status()).toEqual({ enabled: true, provider: 'gemini', model: 'fake-flash' });
  });

  describe('theme drafts', () => {
    const band = (title: string) => ({ title, text: 'Gear for the ridge.', button: 'Explore' });
    const themeAnswer = (overrides: Record<string, unknown> = {}): LlmResponse => ({
      json: {
        primaryColor: '#B45309',
        heroTint: 'warm',
        shopName: 'Ridge Gear',
        band: { en: band('Autumn'), sk: band('Jeseň'), cs: band('Podzim') },
        ...overrides,
      },
      usage: { inputTokens: 1000, outputTokens: 500 },
    });

    it('returns the proposal, asks with its own tool and logs usage', async () => {
      provider.steps = [themeAnswer()];

      const result = await service.createThemeDraft(userId, ' calm autumn hiking shop ', 'sk');

      expect(result.draft).toEqual({
        primaryColor: '#b45309',
        heroTint: 'warm',
        shopName: 'Ridge Gear',
        band: { en: band('Autumn'), sk: band('Jeseň'), cs: band('Podzim') },
      });
      expect(result.usage).toMatchObject({ provider: 'gemini', inputTokens: 1000, outputTokens: 500 });
      const [call] = provider.calls;
      expect(call.tool?.name).toBe('save_theme_draft');
      expect(call.prompt).toContain('calm autumn hiking shop');
      expect(Object.keys((call.schema as { properties: { band: { properties: object } } }).properties.band.properties)).toEqual(['sk', 'en', 'cs']);
      expect(await db.select().from(aiUsage)).toHaveLength(1);
    });

    it('retries an invalid color once, then gives up with 502', async () => {
      provider.steps = [themeAnswer({ primaryColor: 'green' }), themeAnswer({ heroTint: 'cold' })];

      expect((await status(service.createThemeDraft(userId, 'shop'))).status).toBe(502);
      expect(await db.select().from(aiUsage)).toHaveLength(2);
    });

    it('needs a brief and a provider', async () => {
      expect((await status(service.createThemeDraft(userId, '   '))).status).toBe(422);
      const disabled = new AiService(db, config, null);
      expect((await status(disabled.createThemeDraft(userId, 'shop'))).status).toBe(404);
      expect(provider.calls).toHaveLength(0);
    });
  });
});
