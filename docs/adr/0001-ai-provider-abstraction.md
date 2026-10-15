# ADR 0001: AI provider abstraction and structured output

- Status: accepted
- Date: 2026-10-15
- Context: AI product drafts ([docs/ai.md](../ai.md))

## Context

Admins should get a multi-language product draft from photos and a few words. Requirements:

- two providers, switchable by configuration: Google Gemini (Flash, default, free tier) and
  Anthropic Claude (Haiku);
- the answer must always be valid JSON in a known shape, with categories only from the shop's list;
- no real API calls in tests, and the feature must turn off cleanly without a key;
- the server is bundled by esbuild into the single SSR process (`angular.json`
  `externalDependencies`), so dependencies should be small and bundle cleanly.

## Decision

1. **A small `LlmProvider` interface** ([llm-provider.ts](../../server/src/ai/providers/llm-provider.ts)):
   `generate({ system, prompt, images, schema, timeoutMs }) → { json, usage }`, with typed
   `LlmError` kinds (`timeout`, `unavailable`, `auth`, `refused`, `invalid_output`, `upstream`).
   Everything provider-specific (request format, how the schema is passed, how usage and errors are
   reported) stays inside the two implementations. `AiService` (limits, retry, mapping, usage log)
   only sees the interface, injected through the `LLM_PROVIDER` token; the token resolves to `null`
   when no key is configured, which is the off switch.
2. **Thin `fetch` clients instead of the vendor SDKs.** Each implementation is one HTTP call of
   about 60 lines. No new runtime dependency, nothing to externalize in the esbuild bundle, and the
   base URL can point at a local stub, so tests exercise the real request/response code.
3. **Structured output through each provider's native mechanism**, with one JSON Schema built per
   request (languages and categories from the database):
   - Gemini: `generationConfig.responseMimeType = application/json` + `responseJsonSchema`;
   - Claude: the schema as the `input_schema` of a single tool, forced with `tool_choice`.

   The schema uses only keywords both support (`type`, `properties`, `required`, `items`, `enum`,
   `maxItems`, `description`); lengths and formats are stated in descriptions and enforced afterwards.

4. **The answer stays untrusted.** It is validated with class-validator DTOs, sanitized, trimmed and
   mapped to the admin form's shape; a structurally invalid answer is retried once. Nothing is
   persisted except a usage row.

## Alternatives considered

- **Vendor SDKs** (`@google/genai`, `@anthropic-ai/sdk`): convenient, typed, follow API changes.
  Rejected for now: two more dependencies to keep bundling-compatible in the SSR build, harder to
  stub in e2e, and we use a single endpoint of each. Revisit if we need streaming, files, or caching.
- **A multi-provider library** (e.g. Vercel AI SDK, LangChain): one API for many providers and
  schema helpers. Rejected: much larger dependency for two providers and one call.
- **Free-form JSON in the prompt + parsing**: works with any model, but invalid or partial JSON is
  common; categories can't be constrained to an enum. Rejected.
- **Claude's newer structured-output mode instead of a forced tool**: also valid; the forced tool
  call is long-standing, works with Haiku, and keeps both providers on "schema in, JSON out".

## Consequences

- Adding a provider means one class implementing `generate` and an entry in `ai.config.ts`
  (default model, prices); `AiService`, the endpoint and the editor don't change.
- API changes on the provider side are ours to follow (they show up as `upstream` errors and in the
  provider unit tests). Model IDs and prices are configuration, not code paths.
- The schema subset is conservative; richer constraints (string lengths, patterns) live in the DTOs.
- Tests are hermetic: unit tests mock `fetch`, API and e2e tests use local stubs via `AI_BASE_URL` /
  `AI_IMAGE_ORIGIN`.
