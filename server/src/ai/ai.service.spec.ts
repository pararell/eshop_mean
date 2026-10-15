import { HttpException } from '@nestjs/common';

import { createTestDatabase, TestDatabase } from '../../test/utils/test-db';
import { aiUsage, categories, products, users } from '../db/schema';
import type { Database } from '../db/database.module';
import { readAiConfig } from './ai.config';
import { AiService } from './ai.service';
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
  const env = { CLOUDINARY_NAME: 'shop', GEMINI_API_KEY: 'k', AI_RATE_LIMIT_PER_HOUR: '3', AI_DAILY_LIMIT: '5', AI_MONTHLY_BUDGET_USD: '2' };
  const config = { ...readAiConfig(env), price: { inputPerMTok: 0.5, outputPerMTok: 2 } };

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
    expect(call.timeoutMs).toBe(45_000);
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
    ['unavailable', 503, 'error'],
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

  it('applies the hourly, daily and monthly limits from the usage log', async () => {
    const log = (n: number, values: Partial<typeof aiUsage.$inferInsert> = {}) =>
      db.insert(aiUsage).values(Array.from({ length: n }, () => ({ provider: 'gemini', model: 'm', status: 'ok' as const, ...values })));

    await log(3, { userId });
    expect(await status(service.createDraft(userId, { text: 'x' }))).toMatchObject({
      status: 429,
      message: expect.stringMatching(/3 drafts per hour/),
    });

    await db.delete(aiUsage);
    await log(5, { userId: null });
    expect(await status(service.createDraft(userId, { text: 'x' }))).toMatchObject({ status: 503, message: expect.stringMatching(/daily AI limit/) });

    await db.delete(aiUsage);
    await log(1, { userId: null, costUsd: 2 });
    expect(await status(service.createDraft(userId, { text: 'x' }))).toMatchObject({
      status: 503,
      message: expect.stringMatching(/monthly AI budget/),
    });

    // usage from earlier months does not count
    await db.delete(aiUsage);
    await log(1, { userId: null, costUsd: 50, createdAt: new Date('2020-01-01') });
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
});
