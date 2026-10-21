import { fetchWithTimeout, httpError, LlmError, LlmProvider, LlmRequest, LlmResponse } from './llm-provider';

interface AnthropicResponse {
  content?: { type: string; name?: string; input?: unknown }[];
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

const TOOL_NAME = 'save_product_draft';

/**
 * Anthropic Messages API: the JSON schema is the input schema of a forced tool call. Also used for
 * other providers that offer an Anthropic-compatible endpoint (DeepSeek, see deepseek.provider.ts).
 */
export class AnthropicProvider implements LlmProvider {
  readonly name: LlmProvider['name'] = 'anthropic';
  /** Used in error messages */
  protected readonly label: string = 'Claude';

  constructor(
    readonly model: string,
    private readonly apiKey: string,
    private readonly baseUrl = 'https://api.anthropic.com',
  ) {}

  /** Provider-specific request fields */
  protected extraBody(): Record<string, unknown> {
    return {};
  }

  async generate({ system, prompt, images, schema, timeoutMs, maxOutputTokens }: LlmRequest): Promise<LlmResponse> {
    const response = await fetchWithTimeout(
      `${this.baseUrl}/v1/messages`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxOutputTokens,
          temperature: 0.4,
          system,
          messages: [
            {
              role: 'user',
              content: [
                ...images.map((image) => ({ type: 'image', source: { type: 'base64', media_type: image.mimeType, data: image.data } })),
                { type: 'text', text: prompt },
              ],
            },
          ],
          tools: [{ name: TOOL_NAME, description: 'Save the product draft for the shop admin to review.', input_schema: schema }],
          tool_choice: { type: 'tool', name: TOOL_NAME },
          ...this.extraBody(),
        }),
      },
      timeoutMs,
    );

    if (!response.ok) {
      throw await httpError(this.label, response);
    }

    const body = (await response.json()) as AnthropicResponse;
    const usage = { inputTokens: body.usage?.input_tokens ?? 0, outputTokens: body.usage?.output_tokens ?? 0 };

    if (body.stop_reason === 'refusal') {
      throw new LlmError('refused', `${this.label} declined this input`, usage);
    }
    if (body.stop_reason === 'max_tokens') {
      throw new LlmError('invalid_output', `${this.label} ran out of output tokens`, usage);
    }
    const toolUse = body.content?.find((block) => block.type === 'tool_use' && block.name === TOOL_NAME);
    if (!toolUse || typeof toolUse.input !== 'object' || toolUse.input === null) {
      throw new LlmError('invalid_output', `${this.label} did not return the product draft`, usage);
    }
    return { json: toolUse.input, usage };
  }
}
