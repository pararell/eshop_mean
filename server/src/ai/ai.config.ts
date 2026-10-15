// AI product drafts: configuration from the environment (documented in docs/ai.md and .env.example).

export type AiProviderName = 'gemini' | 'anthropic';

export interface AiConfig {
  enabled: boolean;
  /** Why the feature is off (logged at startup; never contains a key) */
  disabledReason?: string;
  provider: AiProviderName;
  model: string;
  apiKey: string;
  /** Provider API base URL; overridden only by tests and the hermetic e2e server */
  baseUrl?: string;
  timeoutMs: number;
  maxImages: number;
  /** Largest image accepted after Cloudinary resized it */
  maxImageBytes: number;
  /** Where product images are fetched from (Cloudinary delivery); overridden by the e2e server */
  imageOrigin: string;
  cloudName: string;
  ratePerHour: number;
  dailyLimit: number;
  monthlyBudgetUsd: number;
  price: { inputPerMTok: number; outputPerMTok: number };
}

export const DEFAULT_MODELS: Record<AiProviderName, string> = {
  gemini: 'gemini-3.8-flash',
  anthropic: 'claude-haiku-5-5',
};

/**
 * List prices in USD per million tokens (checked 2026-10-15). Free-tier Gemini requests are not
 * billed, so the estimate is an upper bound. Gemini 3.6/3.8 Flash prices double on 2027-01-01;
 * override with AI_PRICE_INPUT_PER_MTOK / AI_PRICE_OUTPUT_PER_MTOK.
 */
export const MODEL_PRICES: Record<string, { inputPerMTok: number; outputPerMTok: number }> = {
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
  const requested = (env.AI_PROVIDER || 'gemini').toLowerCase();
  const provider: AiProviderName = requested === 'anthropic' ? 'anthropic' : 'gemini';
  const apiKey = (provider === 'gemini' ? env.GEMINI_API_KEY : env.ANTHROPIC_API_KEY) ?? '';
  const model = env.AI_MODEL || DEFAULT_MODELS[provider];
  const knownPrice = MODEL_PRICES[model] ?? { inputPerMTok: 0, outputPerMTok: 0 };

  let disabledReason: string | undefined;
  if (requested !== 'gemini' && requested !== 'anthropic') {
    disabledReason = `AI_PROVIDER must be "gemini" or "anthropic", got "${requested}"`;
  } else if (!apiKey) {
    disabledReason = `${provider === 'gemini' ? 'GEMINI_API_KEY' : 'ANTHROPIC_API_KEY'} is not set`;
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
    timeoutMs: number(env.AI_TIMEOUT_MS, 45_000),
    maxImages: 3,
    maxImageBytes: number(env.AI_MAX_IMAGE_BYTES, 4 * 1024 * 1024),
    imageOrigin: (env.AI_IMAGE_ORIGIN || 'https://res.cloudinary.com').replace(/\/$/, ''),
    cloudName: env.CLOUDINARY_NAME ?? '',
    ratePerHour: number(env.AI_RATE_LIMIT_PER_HOUR, 30),
    dailyLimit: number(env.AI_DAILY_LIMIT, 200),
    monthlyBudgetUsd: number(env.AI_MONTHLY_BUDGET_USD, 10),
    price: {
      inputPerMTok: number(env.AI_PRICE_INPUT_PER_MTOK, knownPrice.inputPerMTok),
      outputPerMTok: number(env.AI_PRICE_OUTPUT_PER_MTOK, knownPrice.outputPerMTok),
    },
  };
}

export const estimateCostUsd = (usage: { inputTokens: number; outputTokens: number }, price: AiConfig['price']): number =>
  Math.round(((usage.inputTokens * price.inputPerMTok + usage.outputTokens * price.outputPerMTok) / 1_000_000) * 1e6) / 1e6;
