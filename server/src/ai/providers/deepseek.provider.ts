import { AnthropicProvider } from './anthropic.provider';
import { LlmProvider } from './llm-provider';

/**
 * DeepSeek through its Anthropic-compatible endpoint (https://api-docs.deepseek.com/guides/anthropic_api):
 * base64 images, tools with `input_schema` and a forced `tool_choice` are supported, so the request
 * is the Anthropic one. Thinking mode is on by default at DeepSeek; it is turned off here (form
 * filling needs no reasoning, and it would make the call slower and more expensive).
 */
export class DeepSeekProvider extends AnthropicProvider {
  override readonly name: LlmProvider['name'] = 'deepseek';
  protected override readonly label = 'DeepSeek';

  constructor(model: string, apiKey: string, baseUrl = 'https://api.deepseek.com/anthropic') {
    super(model, apiKey, baseUrl);
  }

  protected override extraBody(): Record<string, unknown> {
    return { thinking: { type: 'disabled' } };
  }
}
