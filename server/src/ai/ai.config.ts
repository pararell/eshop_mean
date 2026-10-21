// AI product drafts: configuration from the environment (documented in docs/ai.md and .env.example).

export type AiProviderName = 'deepseek' | 'gemini' | 'anthropic';

const PROVIDERS: AiProviderName[] = ['deepseek', 'gemini', 'anthropic'];
const API_KEY_VARS: Record<AiProviderName, string> = { deepseek: 'DEEPSEEK_API_KEY', gemini: 'GEMINI_API_KEY', anthropic: 'ANTHROPIC_API_KEY' };

export interface AiConfig {
  enabled: boolean;
  /** Why the feature is off (logged at startup; never contains a key) */
  disabledReason?: string;
  provider: AiProviderName;
  model: string;
  apiKey: string;
  /** Provider API base URL; overridden only by tests and the hermetic e2e server */
  baseUrl?: string;
  /** Per provider call; 0 = no timeout */
  timeoutMs: number;
  /** Upper bound for one answer (all languages) */
  maxOutputTokens: number;
  /** First wait before retrying a busy provider (429/503); doubles per retry */
  retryDelayMs: number;
  maxImages: number;
  /** Largest image accepted after Cloudinary resized it */
  maxImageBytes: number;
  /** Where product images are fetched from (Cloudinary delivery); overridden by the e2e server */
  imageOrigin: string;
  cloudName: string;
  price: ModelPrice;
}

export interface TokenPrice {
  inputPerMTok: number;
  outputPerMTok: number;
}

/** List price; `offPeak` applies outside the provider's peak hours (`isPeak`) */
export interface ModelPrice extends TokenPrice {
  offPeak?: TokenPrice;
  isPeak?: (at: Date) => boolean;
}

/**
 * DeepSeek peak hours (https://api-docs.deepseek.com/quick_start/pricing, checked 2026-10-21):
 * Monday–Friday 01:00–04:00 and 06:00–10:00 UTC; off-peak is half price. Chinese public holidays
 * are off-peak too, but are not modelled: they are billed as peak here (an upper bound).
 */
export const isDeepSeekPeak = (at: Date): boolean => {
  const day = at.getUTCDay();
  const hour = at.getUTCHours();
  return day >= 1 && day <= 5 && ((hour >= 1 && hour < 4) || (hour >= 6 && hour < 10));
};

const DEEPSEEK_FLASH: ModelPrice = {
  inputPerMTok: 0.3,
  outputPerMTok: 1.2,
  offPeak: { inputPerMTok: 0.15, outputPerMTok: 0.6 },
  isPeak: isDeepSeekPeak,
};

export const DEFAULT_MODELS: Record<AiProviderName, string> = {
  /** Accepts images; the legacy name deepseek-v4-flash-vision-exp is served by the same model */
  deepseek: 'deepseek-flash',
  gemini: 'gemini-3.8-flash',
  anthropic: 'claude-haiku-5-5',
};

/**
 * List prices in USD per million tokens (Gemini and Claude checked 2026-10-15, DeepSeek 2026-10-21).
 * Input is priced as a cache miss (an upper bound; DeepSeek bills cached input at 2 %). Free-tier
 * Gemini requests are not billed. Gemini 3.6/3.8 Flash prices double on 2027-01-01. Override with
 * AI_PRICE_INPUT_PER_MTOK / AI_PRICE_OUTPUT_PER_MTOK (one flat price, no off-peak discount).
 */
export const MODEL_PRICES: Record<string, ModelPrice> = {
  'deepseek-flash': DEEPSEEK_FLASH,
  // Retired names that DeepSeek still accepts and bills at the Flash price
  'deepseek-v4-flash-vision-exp': DEEPSEEK_FLASH,
  'deepseek-v4-flash': DEEPSEEK_FLASH,
  'gemini-3.8-flash': { inputPerMTok: 0.75, outputPerMTok: 3.75 },
  'gemini-3.6-flash': { inputPerMTok: 0.75, outputPerMTok: 3.75 },
  'gemini-2.5-flash': { inputPerMTok: 0.3, outputPerMTok: 2.5 },
  'claude-haiku-5-5': { inputPerMTok: 0.1, outputPerMTok: 0.5 },
  'claude-haiku-4-5': { inputPerMTok: 1, outputPerMTok: 5 },
};

const number = (value: string | undefined, fallback: number): number => {
  const parsed = value === undefined || value === '' ? NaN : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export function readAiConfig(env: NodeJS.ProcessEnv = process.env): AiConfig {
  const requested = (env.AI_PROVIDER || 'deepseek').toLowerCase();
  const known = (PROVIDERS as string[]).includes(requested);
  const provider: AiProviderName = known ? (requested as AiProviderName) : 'deepseek';
  const apiKey = env[API_KEY_VARS[provider]] ?? '';
  const model = env.AI_MODEL || DEFAULT_MODELS[provider];
  const knownPrice: ModelPrice = MODEL_PRICES[model] ?? { inputPerMTok: 0, outputPerMTok: 0 };
  const priceOverride = !!(env.AI_PRICE_INPUT_PER_MTOK || env.AI_PRICE_OUTPUT_PER_MTOK);

  let disabledReason: string | undefined;
  if (!known) {
    disabledReason = `AI_PROVIDER must be one of ${PROVIDERS.map((p) => `"${p}"`).join(', ')}, got "${requested}"`;
  } else if (!apiKey) {
    disabledReason = `${API_KEY_VARS[provider]} is not set`;
  } else if (!env.CLOUDINARY_NAME) {
    disabledReason = 'CLOUDINARY_NAME is not set (product images live on Cloudinary)';
  }

  return {
    enabled: !disabledReason,
    disabledReason,
    provider,
    model,
    apiKey,
    baseUrl: env.AI_BASE_URL || undefined,
    timeoutMs: number(env.AI_TIMEOUT_MS, 0),
    maxOutputTokens: number(env.AI_MAX_OUTPUT_TOKENS, 8192),
    retryDelayMs: number(env.AI_RETRY_DELAY_MS, 1000),
    maxImages: 3,
    maxImageBytes: number(env.AI_MAX_IMAGE_BYTES, 4 * 1024 * 1024),
    imageOrigin: (env.AI_IMAGE_ORIGIN || 'https://res.cloudinary.com').replace(/\/$/, ''),
    cloudName: env.CLOUDINARY_NAME ?? '',
    price: priceOverride
      ? {
          inputPerMTok: number(env.AI_PRICE_INPUT_PER_MTOK, knownPrice.inputPerMTok),
          outputPerMTok: number(env.AI_PRICE_OUTPUT_PER_MTOK, knownPrice.outputPerMTok),
        }
      : knownPrice,
  };
}

/** The price per token at a given time (off-peak discount where the provider has one) */
export const priceAt = (price: ModelPrice, at: Date): TokenPrice =>
  price.offPeak && price.isPeak && !price.isPeak(at) ? price.offPeak : { inputPerMTok: price.inputPerMTok, outputPerMTok: price.outputPerMTok };

export const estimateCostUsd = (usage: { inputTokens: number; outputTokens: number }, price: ModelPrice, at: Date = new Date()): number => {
  const { inputPerMTok, outputPerMTok } = priceAt(price, at);
  return Math.round(((usage.inputTokens * inputPerMTok + usage.outputTokens * outputPerMTok) / 1_000_000) * 1e6) / 1e6;
};
