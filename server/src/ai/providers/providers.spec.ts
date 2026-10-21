import { AnthropicProvider } from './anthropic.provider';
import { DeepSeekProvider } from './deepseek.provider';
import { GeminiProvider } from './gemini.provider';
import { LlmError, LlmRequest, retryAfterMs } from './llm-provider';

const request: LlmRequest = {
  system: 'You write product listings.',
  prompt: 'Create the product draft.',
  images: [{ mimeType: 'image/jpeg', data: 'AAAA' }],
  schema: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] },
  timeoutMs: 5000,
  maxOutputTokens: 4096,
};

const realFetch = global.fetch;
let fetchMock: jest.Mock;
const reply = (body: unknown, status = 200) => fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
const sent = () => ({ url: fetchMock.mock.calls[0][0] as string, init: fetchMock.mock.calls[0][1] as RequestInit });
const sentBody = () => JSON.parse(sent().init.body as string);

const expectLlmError = async (promise: Promise<unknown>, kind: string) => {
  await expect(promise).rejects.toBeInstanceOf(LlmError);
  await promise.catch((error: LlmError) => expect(error.kind).toBe(kind));
};

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock;
});
afterAll(() => {
  global.fetch = realFetch;
});

describe('GeminiProvider', () => {
  const provider = new GeminiProvider('gemini-3.8-flash', 'secret-key', 'http://stub');
  const ok = (text: string, finishReason = 'STOP') => ({
    candidates: [{ content: { parts: [{ text: 'thinking…', thought: true }, { text }] }, finishReason }],
    usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, thoughtsTokenCount: 5 },
  });

  it('sends the images, prompt and JSON schema, with the key in a header', async () => {
    reply(ok('{"title":"Jacket"}'));

    await expect(provider.generate(request)).resolves.toEqual({ json: { title: 'Jacket' }, usage: { inputTokens: 100, outputTokens: 25 } });

    expect(sent().url).toBe('http://stub/v1beta/models/gemini-3.8-flash:generateContent');
    expect((sent().init.headers as Record<string, string>)['x-goog-api-key']).toBe('secret-key');
    expect(sent().url).not.toContain('secret-key');
    const body = sentBody();
    expect(body.systemInstruction.parts[0].text).toBe(request.system);
    expect(body.contents[0].parts).toEqual([{ inlineData: { mimeType: 'image/jpeg', data: 'AAAA' } }, { text: request.prompt }]);
    expect(body.generationConfig).toMatchObject({ responseMimeType: 'application/json', responseJsonSchema: request.schema });
  });

  it('maps HTTP errors', async () => {
    reply({ error: {} }, 429);
    await expectLlmError(provider.generate(request), 'unavailable');
    reply({ error: {} }, 403);
    await expectLlmError(provider.generate(request), 'auth');
    reply({ error: {} }, 500);
    await expectLlmError(provider.generate(request), 'upstream');
  });

  it('reports blocked input, early stops and non-JSON answers', async () => {
    reply({ promptFeedback: { blockReason: 'SAFETY' } });
    await expectLlmError(provider.generate(request), 'refused');
    reply(ok('{}', 'SAFETY'));
    await expectLlmError(provider.generate(request), 'refused');
    reply(ok('{"title":', 'MAX_TOKENS'));
    await expectLlmError(provider.generate(request), 'invalid_output');
    reply(ok('not json'));
    await expectLlmError(provider.generate(request), 'invalid_output');
  });

  it('keeps the usage of a failed call for cost tracking', async () => {
    reply(ok('not json'));
    await provider.generate(request).catch((error: LlmError) => expect(error.usage).toEqual({ inputTokens: 100, outputTokens: 25 }));
  });

  it('times out', async () => {
    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => init.signal!.addEventListener('abort', () => reject(init.signal!.reason as Error))),
    );
    await expectLlmError(provider.generate({ ...request, timeoutMs: 20 }), 'timeout');
  });

  it('turns network errors into upstream errors', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    await expectLlmError(provider.generate(request), 'upstream');
  });
});

describe('AnthropicProvider', () => {
  const provider = new AnthropicProvider('claude-haiku-5-5', 'secret-key', 'http://stub');
  const ok = (input: unknown, stop_reason = 'tool_use') => ({
    content: [{ type: 'tool_use', name: 'save_product_draft', input }],
    stop_reason,
    usage: { input_tokens: 300, output_tokens: 40 },
  });

  it('forces the draft tool with our schema as its input schema', async () => {
    reply(ok({ title: 'Jacket' }));

    await expect(provider.generate(request)).resolves.toEqual({ json: { title: 'Jacket' }, usage: { inputTokens: 300, outputTokens: 40 } });

    expect(sent().url).toBe('http://stub/v1/messages');
    const headers = sent().init.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('secret-key');
    expect(headers['anthropic-version']).toBe('2023-06-01');
    const body = sentBody();
    expect(body).toMatchObject({
      model: 'claude-haiku-5-5',
      max_tokens: 4096,
      system: request.system,
      tool_choice: { type: 'tool', name: 'save_product_draft' },
    });
    expect(body.thinking).toBeUndefined();
    expect(body.tools[0].input_schema).toEqual(request.schema);
    expect(body.messages[0].content).toEqual([
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'AAAA' } },
      { type: 'text', text: request.prompt },
    ]);
  });

  it('maps errors, refusals and truncated answers', async () => {
    reply({ error: {} }, 529);
    await expectLlmError(provider.generate(request), 'unavailable');
    reply({ error: {} }, 401);
    await expectLlmError(provider.generate(request), 'auth');
    reply({ content: [], stop_reason: 'refusal', usage: {} });
    await expectLlmError(provider.generate(request), 'refused');
    reply(ok({ title: 'Ja' }, 'max_tokens'));
    await expectLlmError(provider.generate(request), 'invalid_output');
    reply({ content: [{ type: 'text', text: 'Here you go' }], stop_reason: 'end_turn', usage: {} });
    await expectLlmError(provider.generate(request), 'invalid_output');
  });
});

describe('DeepSeekProvider', () => {
  const answer = {
    content: [{ type: 'tool_use', name: 'save_product_draft', input: { title: 'Bunda' } }],
    stop_reason: 'tool_use',
    usage: { input_tokens: 500, output_tokens: 60 },
  };

  it("uses DeepSeek's Anthropic-compatible endpoint with thinking turned off", async () => {
    const provider = new DeepSeekProvider('deepseek-flash', 'ds-key');
    reply(answer);

    await expect(provider.generate(request)).resolves.toEqual({ json: { title: 'Bunda' }, usage: { inputTokens: 500, outputTokens: 60 } });

    expect(provider.name).toBe('deepseek');
    expect(sent().url).toBe('https://api.deepseek.com/anthropic/v1/messages');
    expect((sent().init.headers as Record<string, string>)['x-api-key']).toBe('ds-key');
    const body = sentBody();
    expect(body).toMatchObject({
      model: 'deepseek-flash',
      max_tokens: 4096,
      thinking: { type: 'disabled' },
      tool_choice: { type: 'tool', name: 'save_product_draft' },
    });
    expect(body.tools[0].input_schema).toEqual(request.schema);
    expect(body.messages[0].content[0]).toEqual({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'AAAA' } });
  });

  it('names DeepSeek in errors and passes on Retry-After', async () => {
    const provider = new DeepSeekProvider('deepseek-flash', 'ds-key', 'http://stub');
    fetchMock.mockResolvedValueOnce(new Response('{"error":{"message":"busy"}}', { status: 429, headers: { 'retry-after': '3' } }));

    const error = await provider.generate(request).catch((e: LlmError) => e);

    expect(error).toBeInstanceOf(LlmError);
    expect(error).toMatchObject({ kind: 'unavailable', retryAfterMs: 3000 });
    expect((error as LlmError).message).toMatch(/^DeepSeek: HTTP 429/);
    expect((error as LlmError).message).not.toContain('ds-key');
  });
});

describe('retryAfterMs', () => {
  const withHeader = (value?: string) => new Response(null, { status: 429, headers: value ? { 'retry-after': value } : {} });

  it('reads seconds and HTTP dates', () => {
    expect(retryAfterMs(withHeader('2'))).toBe(2000);
    expect(retryAfterMs(withHeader('Wed, 21 Oct 2026 10:00:05 GMT'), Date.parse('2026-10-21T10:00:00Z'))).toBe(5000);
    expect(retryAfterMs(withHeader())).toBeUndefined();
    expect(retryAfterMs(withHeader('soon'))).toBeUndefined();
  });
});
