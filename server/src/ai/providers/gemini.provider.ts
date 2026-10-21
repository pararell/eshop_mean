import { fetchWithTimeout, httpError, LlmError, LlmProvider, LlmRequest, LlmResponse } from './llm-provider';

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
}

/** Google Gemini via `models.generateContent` with JSON-schema structured output */
export class GeminiProvider implements LlmProvider {
  readonly name = 'gemini' as const;

  constructor(
    readonly model: string,
    private readonly apiKey: string,
    private readonly baseUrl = 'https://generativelanguage.googleapis.com',
  ) {}

  async generate({ system, prompt, images, schema, timeoutMs, maxOutputTokens }: LlmRequest): Promise<LlmResponse> {
    const response = await fetchWithTimeout(
      `${this.baseUrl}/v1beta/models/${encodeURIComponent(this.model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': this.apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [
            {
              role: 'user',
              parts: [...images.map((image) => ({ inlineData: { mimeType: image.mimeType, data: image.data } })), { text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseJsonSchema: schema,
            temperature: 0.4,
            maxOutputTokens,
          },
        }),
      },
      timeoutMs,
    );

    if (!response.ok) {
      throw await httpError('Gemini', response);
    }

    const body = (await response.json()) as GeminiResponse;
    const usage = {
      inputTokens: body.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: (body.usageMetadata?.candidatesTokenCount ?? 0) + (body.usageMetadata?.thoughtsTokenCount ?? 0),
    };

    if (body.promptFeedback?.blockReason) {
      throw new LlmError('refused', `Gemini blocked the input (${body.promptFeedback.blockReason})`, usage);
    }
    const candidate = body.candidates?.[0];
    const finishReason = candidate?.finishReason ?? 'MISSING';
    if (finishReason !== 'STOP') {
      const kind = /SAFETY|PROHIBITED|BLOCKLIST|SPII|RECITATION/.test(finishReason) ? 'refused' : 'invalid_output';
      throw new LlmError(kind, `Gemini stopped early (${finishReason})`, usage);
    }

    const text = (candidate?.content?.parts ?? [])
      .filter((part) => !part.thought && typeof part.text === 'string')
      .map((part) => part.text)
      .join('');
    try {
      return { json: JSON.parse(text), usage };
    } catch {
      throw new LlmError('invalid_output', 'Gemini returned text that is not JSON', usage);
    }
  }
}
