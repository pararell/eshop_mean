import { DEFAULT_MODELS, estimateCostUsd, isDeepSeekPeak, MODEL_PRICES, readAiConfig } from './ai.config';

describe('readAiConfig', () => {
  const base = { CLOUDINARY_NAME: 'shop' };

  it('is disabled without an API key, and says why', () => {
    const config = readAiConfig({ ...base });
    expect(config.enabled).toBe(false);
    expect(config.disabledReason).toBe('DEEPSEEK_API_KEY is not set');
  });

  it('defaults to DeepSeek Flash with the documented settings', () => {
    const config = readAiConfig({ ...base, DEEPSEEK_API_KEY: 'k' });
    expect(config).toMatchObject({
      enabled: true,
      provider: 'deepseek',
      model: 'deepseek-flash',
      apiKey: 'k',
      timeoutMs: 0,
      maxOutputTokens: 8192,
      retryDelayMs: 1000,
      maxImages: 3,
      imageOrigin: 'https://res.cloudinary.com',
      price: { inputPerMTok: 0.3, outputPerMTok: 1.2, offPeak: { inputPerMTok: 0.15, outputPerMTok: 0.6 } },
    });
    expect(DEFAULT_MODELS.deepseek).toBe('deepseek-flash');
  });

  it('knows the retired DeepSeek vision model name (billed at the Flash price)', () => {
    const config = readAiConfig({ ...base, DEEPSEEK_API_KEY: 'k', AI_MODEL: 'deepseek-v4-flash-vision-exp' });
    expect(config.price).toBe(MODEL_PRICES['deepseek-flash']);
  });

  it('switches to Gemini, which needs its own key', () => {
    expect(readAiConfig({ ...base, AI_PROVIDER: 'gemini', DEEPSEEK_API_KEY: 'k' }).disabledReason).toBe('GEMINI_API_KEY is not set');
    const config = readAiConfig({ ...base, AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'k' });
    expect(config).toMatchObject({
      enabled: true,
      provider: 'gemini',
      model: DEFAULT_MODELS.gemini,
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
    const config = readAiConfig({ ...base, AI_PROVIDER: 'openai', DEEPSEEK_API_KEY: 'k' });
    expect(config.enabled).toBe(false);
    expect(config.disabledReason).toMatch(/AI_PROVIDER/);
  });

  it('needs Cloudinary, where product images live', () => {
    expect(readAiConfig({ DEEPSEEK_API_KEY: 'k' }).disabledReason).toMatch(/CLOUDINARY_NAME/);
  });

  it('reads overrides and ignores invalid numbers', () => {
    const config = readAiConfig({
      ...base,
      DEEPSEEK_API_KEY: 'k',
      AI_MODEL: 'some-new-model',
      AI_MAX_OUTPUT_TOKENS: '4000',
      AI_TIMEOUT_MS: '1000',
      AI_RETRY_DELAY_MS: 'soon',
      AI_PRICE_INPUT_PER_MTOK: '2',
      AI_IMAGE_ORIGIN: 'http://127.0.0.1:9999/',
    });
    expect(config.model).toBe('some-new-model');
    expect(config.timeoutMs).toBe(1000);
    expect(config.maxOutputTokens).toBe(4000);
    expect(config.retryDelayMs).toBe(1000);
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

describe('DeepSeek peak and off-peak pricing', () => {
  const price = MODEL_PRICES['deepseek-flash'];
  const usage = { inputTokens: 1_000_000, outputTokens: 1_000_000 };

  it('knows the peak hours (weekdays 01–04 and 06–10 UTC)', () => {
    expect(isDeepSeekPeak(new Date('2026-10-21T01:00:00Z'))).toBe(true); // Wednesday
    expect(isDeepSeekPeak(new Date('2026-10-21T03:59:59Z'))).toBe(true);
    expect(isDeepSeekPeak(new Date('2026-10-21T04:00:00Z'))).toBe(false);
    expect(isDeepSeekPeak(new Date('2026-10-21T09:30:00Z'))).toBe(true);
    expect(isDeepSeekPeak(new Date('2026-10-21T10:00:00Z'))).toBe(false);
    expect(isDeepSeekPeak(new Date('2026-10-21T00:30:00Z'))).toBe(false);
    expect(isDeepSeekPeak(new Date('2026-10-24T02:00:00Z'))).toBe(false); // Saturday
  });

  it('bills the full price at peak and half off-peak', () => {
    expect(estimateCostUsd(usage, price, new Date('2026-10-21T08:00:00Z'))).toBe(1.5);
    expect(estimateCostUsd(usage, price, new Date('2026-10-21T15:00:00Z'))).toBe(0.75);
  });

  it('uses one flat price when it is overridden', () => {
    const config = readAiConfig({ CLOUDINARY_NAME: 'shop', DEEPSEEK_API_KEY: 'k', AI_PRICE_OUTPUT_PER_MTOK: '2' });
    expect(config.price).toEqual({ inputPerMTok: 0.3, outputPerMTok: 2 });
    expect(estimateCostUsd(usage, config.price, new Date('2026-10-21T15:00:00Z'))).toBe(2.3);
  });
});
