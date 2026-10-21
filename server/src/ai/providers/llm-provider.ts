// Provider-neutral contract for structured generation (docs/ai.md, docs/adr/0001-ai-provider-abstraction.md).

export interface LlmImage {
  mimeType: string;
  /** base64, without a data: prefix */
  data: string;
}

export interface LlmRequest {
  system: string;
  prompt: string;
  images: LlmImage[];
  /** JSON Schema the answer must follow (the subset both providers support) */
  schema: Record<string, unknown>;
  timeoutMs: number;
  /** Upper bound for the answer (all languages); too low cuts the JSON off */
  maxOutputTokens: number;
}

export interface LlmUsage {
  inputTokens: number;
  /** Includes reasoning ("thinking") tokens, which are billed as output */
  outputTokens: number;
}

export interface LlmResponse {
  /** The parsed JSON answer; still untrusted, validate it before use */
  json: unknown;
  usage: LlmUsage;
}

export interface LlmProvider {
  readonly name: 'gemini' | 'anthropic' | 'deepseek';
  readonly model: string;
  generate(request: LlmRequest): Promise<LlmResponse>;
}

/** Injection token; resolves to `null` when the feature is disabled (no API key) */
export const LLM_PROVIDER = Symbol('LLM_PROVIDER');

export type LlmErrorKind =
  /** No answer within the timeout */
  | 'timeout'
  /** Provider quota / rate limit / overload */
  | 'unavailable'
  /** API key rejected */
  | 'auth'
  /** The provider refused the input (safety filters) */
  | 'refused'
  /** Answer missing, truncated or not JSON */
  | 'invalid_output'
  /** Any other provider or network error */
  | 'upstream';

export class LlmError extends Error {
  constructor(
    readonly kind: LlmErrorKind,
    message: string,
    /** Usage of a failed call, when the provider reported it */
    readonly usage?: LlmUsage,
    /** How long the provider asked us to wait before retrying (Retry-After), if it said so */
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

/** Maps an HTTP status from a provider API to an error kind */
export const errorKindForStatus = (status: number): LlmErrorKind => {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429 || status === 503 || status === 529) return 'unavailable';
  return 'upstream';
};

/** Runs `fetch` with a timeout, turning aborts and network failures into LlmError */
/** `timeoutMs` 0 = no timeout (the default) */
export async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  try {
    return await fetch(url, timeoutMs > 0 ? { ...init, signal: AbortSignal.timeout(timeoutMs) } : init);
  } catch (error) {
    const name = (error as Error).name;
    if (name === 'TimeoutError' || name === 'AbortError') {
      throw new LlmError('timeout', `No answer from the AI provider within ${Math.round(timeoutMs / 1000)} s`);
    }
    throw new LlmError('upstream', `Could not reach the AI provider (${(error as Error).message})`);
  }
}

/** `Retry-After` in milliseconds (seconds or an HTTP date), or undefined */
export function retryAfterMs(response: Response, now = Date.now()): number | undefined {
  const value = response.headers.get('retry-after');
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
}

/** The LlmError for a non-OK provider response */
export async function httpError(label: string, response: Response): Promise<LlmError> {
  return new LlmError(errorKindForStatus(response.status), `${label}: ${await errorDetail(response)}`, undefined, retryAfterMs(response));
}

/** Short, key-free description of a provider error body for logs */
export async function errorDetail(response: Response): Promise<string> {
  const text = await response.text().catch(() => '');
  return `HTTP ${response.status}${text ? ': ' + text.slice(0, 300) : ''}`;
}
