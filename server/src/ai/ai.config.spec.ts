import { DEFAULT_MODELS, estimateCostUsd, readAiConfig } from './ai.config';

describe('readAiConfig', () => {
  const base = { CLOUDINARY_NAME: 'shop' };

  it('is disabled without an API key, and says why', () => {
    const config = readAiConfig({ ...base });
    expect(config.enabled).toBe(false);
    expect(config.disabledReason).toBe('GEMINI_API_KEY is not set');
  });

  it('defaults to Gemini Flash with the documented limits', () => {
    const config = readAiConfig({ ...base, GEMINI_API_KEY: 'k' });
    expect(config).toMatchObject({
      enabled: true,
      provider: 'gemini',
      model: DEFAULT_MODELS.gemini,
      apiKey: 'k',
      timeoutMs: 45_000,
      maxImages: 3,
      ratePerHour: 30,
      dailyLimit: 200,
      monthlyBudgetUsd: 10,
      imageOrigin: 'https://res.cloudinary.com',
      price: { inputPerMTok: 0.75, outputPerMTok: 3.75 },
    });
  });

  it('switches to Anthropic, which needs its own key', () => {
    expect(readAiConfig({ ...base, AI_PROVIDER: 'anthropic', GEMINI_API_KEY: 'k' }).disabledReason).toBe('ANTHROPIC_API_KEY is not set');
    const config = readAiConfig({ ...base, AI_PROVIDER: 'Anthropic', ANTHROPIC_API_KEY: 'a' });
    expect(config).toMatchObject({
      enabled: true,
      provider: 'anthropic',
      model: 'claude-haiku-5-5',
      price: { inputPerMTok: 0.1, outputPerMTok: 0.5 },
    });
  });

  it('rejects an unknown provider instead of guessing', () => {
    const config = readAiConfig({ ...base, AI_PROVIDER: 'openai', GEMINI_API_KEY: 'k' });
    expect(config.enabled).toBe(false);
    expect(config.disabledReason).toMatch(/AI_PROVIDER/);
  });

  it('needs Cloudinary, where product images live', () => {
    expect(readAiConfig({ GEMINI_API_KEY: 'k' }).disabledReason).toMatch(/CLOUDINARY_NAME/);
  });

  it('reads overrides and ignores invalid numbers', () => {
    const config = readAiConfig({
      ...base,
      GEMINI_API_KEY: 'k',
      AI_MODEL: 'some-new-model',
      AI_TIMEOUT_MS: '1000',
      AI_RATE_LIMIT_PER_HOUR: 'lots',
      AI_MONTHLY_BUDGET_USD: '-5',
      AI_PRICE_INPUT_PER_MTOK: '2',
      AI_IMAGE_ORIGIN: 'http://127.0.0.1:9999/',
    });
    expect(config.model).toBe('some-new-model');
    expect(config.timeoutMs).toBe(1000);
    expect(config.ratePerHour).toBe(30);
    expect(config.monthlyBudgetUsd).toBe(10);
    // unknown model: no list price, so only the override counts
    expect(config.price).toEqual({ inputPerMTok: 2, outputPerMTok: 0 });
    expect(config.imageOrigin).toBe('http://127.0.0.1:9999');
  });
});

describe('estimateCostUsd', () => {
  it('prices input and output tokens per million, rounded to micro-dollars', () => {
    expect(estimateCostUsd({ inputTokens: 1_000_000, outputTokens: 0 }, { inputPerMTok: 0.75, outputPerMTok: 3.75 })).toBe(0.75);
    expect(estimateCostUsd({ inputTokens: 1200, outputTokens: 1000 }, { inputPerMTok: 0.75, outputPerMTok: 3.75 })).toBe(0.00465);
    expect(estimateCostUsd({ inputTokens: 1, outputTokens: 1 }, { inputPerMTok: 0.1, outputPerMTok: 0.5 })).toBe(0.000001);
  });
});
