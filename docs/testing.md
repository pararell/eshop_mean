# Testing

There are two test layers. They need Docker (a disposable PostgreSQL 18 via Testcontainers) but no running database of your own and no real API keys: every external service, AI providers included, is mocked or stubbed.

| Layer                      | Tool                      | What runs                                                                                | Command               | Time                           |
| -------------------------- | ------------------------- | ---------------------------------------------------------------------------------------- | --------------------- | ------------------------------ |
| Server unit and API tests  | Jest 30 + SWC + Supertest | The real Nest `AppModule` with production middleware, against a disposable PostgreSQL 18 | `npm run test:server` | about 10 s                     |
| End-to-end (browser) tests | Playwright (Chromium)     | The production SSR build (`dist/`) against a seeded, disposable PostgreSQL 18            | `npm run test:e2e`    | about 30 s including the build |

Also run `npm run typecheck`. It type-checks the client, the server, the server tests and the e2e specs. The test runners don't do this themselves, because SWC and Playwright only strip types.

## First-time setup

```bash
npm ci
npx playwright install chromium   # browser for e2e, downloaded once
# Docker must be running: server tests start a disposable postgres:18 (Testcontainers)
```

The first run pulls the `postgres:18` Docker image. This happens only once.

## Running

```bash
npm test                       # = npm run test:server
npm run test:server:watch      # re-run on change
npm run test:server:cov        # coverage report in server/coverage/
npm run test:e2e               # builds (build:ssr), then runs Playwright
npx playwright test -c e2e/playwright.config.ts   # e2e without rebuilding
npm run test:e2e:ui            # Playwright UI mode for debugging
npx playwright show-report     # HTML report of the last e2e run
```

On failure, Playwright keeps a trace, a screenshot and the error context in
`test-results/e2e/<test>/`. Open the trace with `npx playwright show-trace <path>/trace.zip`.

## How it works

### Server tests (`server/`)

- **Configuration:** [server/jest.config.cjs](../server/jest.config.cjs).
  - Unit specs live next to the code: `src/**/*.spec.ts`.
  - API specs live in `test/api/*.spec.ts`.
- **Database:**
  - [test/setup/global-setup.cjs](../server/test/setup/global-setup.cjs) starts one `postgres:18` container per run.
  - `createTestApp()` ([test/utils/test-app.ts](../server/test/utils/test-app.ts)) gives each test file its own fresh database;
    `t.model(name)` ([test-models.ts](../server/test/utils/test-models.ts)) seeds and reads it with the API document shapes.
- **Environment:** `env.ts` sets every variable the server reads. A local `.env` can never leak
  into tests, because `ConfigModule` doesn't override variables that are already set.
- **External services are always mocked:**
  - email: specs replace the Resend transport with a spy ([test/utils/email.ts](../server/test/utils/email.ts), `sentEmails()`); the test env has no Resend key and a closed base URL, and the real transport is unit-tested against a local stub (`resend-transport.spec.ts`);
  - Stripe: the real SDK talks to [test/utils/stripe-stub.ts](../server/test/utils/stripe-stub.ts), a
    local stub of the Stripe API (PaymentIntents, refunds, idempotency, signed webhooks), via
    `STRIPE_API_BASE`; by default that points at a closed port, so a test without the stub fails
    instead of reaching Stripe;
  - the reCAPTCHA and geolocation HTTP calls → `httpMock` in
    [test/utils/test-app.ts](../server/test/utils/test-app.ts);
  - AI providers: `env.ts` blanks every AI key, so the feature is off by default. Unit specs mock
    `fetch` or inject a scripted `LlmProvider`; API specs enable the feature against
    [test/utils/ai-stub.ts](../server/test/utils/ai-stub.ts), a local server playing Gemini, Claude
    and Cloudinary image delivery (`AI_BASE_URL`, `AI_IMAGE_ORIGIN`).
- **App setup:** `createTestApp()` boots `AppModule` with `setAppDB()`, so sessions, cookies and CORS
  behave as in production. `request.agent(...)` keeps the session cookie between requests,
  which is how the cart works in a browser.
- **ESM:** Nest 12 packages are ESM-only. Jest loads them through Node's `require(esm)`. This
  needs Node ≥ 24.9 and `--experimental-vm-modules`, which the npm scripts pass.
- **`eventually()`:** some services persist without awaiting the write (see the audit). Tests
  use `eventually()` to poll for the result instead of sleeping.

### E2E tests (`e2e/`)

- **Configuration:** [e2e/playwright.config.ts](../e2e/playwright.config.ts). The `webServer` runs
  [e2e/support/start-server.mjs](../e2e/support/start-server.mjs), which:
  1. starts a disposable `postgres:18`, runs the migrations and seeds two products, two categories, an active shop
     config with 5 EUR shipping, and an admin user (see [fixtures.mjs](../e2e/support/fixtures.mjs));
  2. starts [support/ai-stub.mjs](../e2e/support/ai-stub.mjs), a local Gemini + Cloudinary stub
     (uploads reach it through `CLOUDINARY_URL`'s `upload_prefix`, AI calls through `AI_BASE_URL`);
     its answers are in `E2E.ai` in `fixtures.mjs`, and a description containing `E2E_FAIL` makes it fail;
  3. runs `dist/eshop/server/server.mjs` on port 4600 with explicit test environment values;
  4. writes the database URI and the stub URL to `test-results/e2e-state.json`, so specs can assert
     stored data and what the stub received (`GET <stub>/__requests`).
- **Hermetic:**
  - in the browser, Stripe.js is replaced by a small fake, and TinyMCE, reCAPTCHA and analytics
    are blocked ([helpers.ts](../e2e/tests/helpers.ts));
  - on the server, there is no Resend key (emails are skipped), outbound HTTPS goes to a dead local proxy, so reCAPTCHA is never
    reached; AI and Cloudinary go to the local AI stub, the Stripe API to the shared Stripe stub,
    which also sends signed webhooks to the app. Stripe.js in the browser is a fake that renders a
    stand-in card field and confirms through that stub (`window.__e2eCardOutcome` = `declined` /
    `redirect` for the other paths).
- **Execution:** specs run serially (one worker) against the shared server, so they create
  unique data (timestamps in emails and slugs).

## What is covered

### Server: 235 tests

| Area                | Spec                                    | Covers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cart logic (unit)   | `src/cart/utils/cart.spec.ts`           | Add, increment, decrement, remove, unknown ids                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Pricing (unit)      | `src/shared/utils/prepareUtils.spec.ts` | Totals = sale price × qty; basic vs. extended shipping; free shipping at the limit; just-below-limit; fallback shipping table; hidden or unpriced items excluded; localized product shape                                                                                                                                                                                                                                                                                                                               |
| AI drafts (unit)    | `src/ai/*.spec.ts`                      | Config and off switch; schema (languages, category enum, no price/stock fields, provider-safe keywords) and prompt delimiters; mapping (validation, HTML sanitizing, escaping, SEO trimming, categories, slug); image URL rules (only this shop's Cloudinary); Gemini and Claude clients against mocked `fetch` (request shape, key in header, usage, every error kind); `AiService` with a scripted provider (usage log, retry, error → HTTP mapping, one request per admin, hourly/daily/monthly limits, unique slug) |
| AI drafts API       | `test/api/ai.spec.ts`                   | Disabled → 404 and status; unknown provider → off; draft via stubbed Gemini (what is sent, sanitized result, no prices, usage row, never saved); unknown categories dropped, slug suffix; invalid answer → retry → 502; provider 429/401/500 mapping without leaking the key; timeout → 504; safety block → 422; input validation and foreign images → 422; hourly limit → 429; monthly budget → 503; draft via stubbed Claude (forced tool call)                                                                       |
| Security            | `test/api/security.spec.ts`             | helmet headers with a report-only CSP; session cookie `HttpOnly`, `SameSite=Lax`, `Secure` only over HTTPS behind `TRUST_PROXY`; per-IP rate limit on sign-in/sign-up (429 with `Retry-After`, other IPs and GET endpoints unaffected)                                                                                                                                                                                                                                                                                  |
| Migrations          | `test/db/migrate.spec.ts`               | On an empty database: all migrations pending, applied once, then none; three concurrent runs (advisory lock) apply exactly once; `prepareDatabase` logs, `DB_MIGRATE_ON_START=false` only reports, missing `DATABASE_URL` fails                                                                                                                                                                                                                                                                                         |
| Database module     | `src/db/database.module.spec.ts`        | Startup fails without `DATABASE_URL`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Products API        | `test/api/products.spec.ts`             | Visible-only listing, 12-per-page pagination, all four sort orders, category and max-price filters, invalid sort → 400, detail and 404, categories by position; admin create (with auto-created category), SEO title and meta description stored per language, duplicate → 400, edit, delete                                                                                                                                                                                                                            |
| Auth API            | `test/api/auth.spec.ts`                 | Signup (hashed password, no client roles: **SEC-01 regression**), duplicate → 409, weak password → 400, signin token and profile, wrong password and unknown user → 401, `GET /api/auth` with valid and invalid tokens                                                                                                                                                                                                                                                                                                  |
| Cart API            | `test/api/cart.spec.ts`                 | Session persistence, totals with default and config shipping, extended shipping, free shipping, remove, missing id → 400                                                                                                                                                                                                                                                                                                                                                                                                |
| Payments API        | `test/api/payments.spec.ts`             | Intent from the server-side cart (minor units, EUR/CZK by language, idempotency key, never amount/currency/user from the body, user from the JWT), validation and empty cart → 422, retry reuses the order and updates the intent, Stripe failure → 502; complete: paid once with emails once, processing, other sessions → 404; webhooks: signature missing/wrong/tampered/too old → 400, duplicates skipped, payment_failed, charge.refunded; refunds partial/full/too much/unpaid/admin only; no Stripe key → 503    |
| Orders API          | `test/api/orders.spec.ts`               | Cash-on-delivery order from the session cart (server total, client amount ignored, cart emptied), emails to customer and admins, invalid body → 422 without crashing (**SEC-02 regression**), Stripe charge amount, currency, token, capture → PAID order, declined charge → 422 with no order and the cart kept, user order history, admin list, get and status update                                                                                                                                                 |
| Admin authorization | `test/api/admin-authorization.spec.ts`  | All 26 admin endpoints (including the AI and refund endpoints) reject anonymous users and non-admin users                                                                                                                                                                                                                                                                                                                                                                                                               |
| Shop API            | `test/api/eshop.spec.ts`                | Public config exposes `FE_*` values and the active theme but no secrets; admin page create then public read; contact: valid captcha → emails, invalid captcha → 400 without crashing (**SEC-02 regression**), captcha service down → 500                                                                                                                                                                                                                                                                                |

Line coverage is about 75% of server code. `prepareUtils.ts` and `cart.ts` are at 100%, and `orders.service.ts` at 95%.

### E2E: 25 tests

| Flow                                                                                                                                                                                                                                                                                                                                                                                           | Spec               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Home page is server-rendered with products; product list with prices; category filter; product detail (title, price, description, `<title>`)                                                                                                                                                                                                                                                   | `browse.spec.ts`   |
| Add to cart, header badge, totals with shipping, cart persists across reload, remove item                                                                                                                                                                                                                                                                                                      | `cart.spec.ts`     |
| Checkout, cash on delivery: address → payment → order; confirmation shown; cart emptied; order stored with server-side total                                                                                                                                                                                                                                                                   | `checkout.spec.ts` |
| Checkout, card: Payment Element (deferred intent, cart amount, locale, no Apple Pay) → intent from the server → confirm → signed webhook from the stub → order PAID, cart emptied, summary; declined card then retry pays the same order; 3-D Secure redirect back to the summary; incomplete card stops before anything is sent                                                               | `checkout.spec.ts` |
| Signup → login → logout; wrong password                                                                                                                                                                                                                                                                                                                                                        | `auth.spec.ts`     |
| Language from the URL: server-rendered `/sk` pages in Slovak (`<html lang>`, content, UI labels); switcher changes the prefix; `/sk` lists only products with Slovak content; `/` keeps the cookie language                                                                                                                                                                                    | `language.spec.ts` |
| Admin product table and editor: create a product (URL from the title, category chip, visible) that appears in the shop; search the table → edit a price; validation explains a missing price before anything is sent; order list → order detail; refund part of a card order                                                                                                                   | `admin.spec.ts`    |
| AI product draft: upload a photo (Cloudinary stub) + a few words → Fill with AI → 16 fields marked in en/sk/cs → edit clears a mark, accept a language, add a suggested category → price and visibility → "Save anyway" → stored product (all languages, the one uploaded image, no AI prices) and SEO `<title>` in the shop; what the AI stub received; AI failure → clear error, form usable | `ai-draft.spec.ts` |

### Database (PostgreSQL)

- `test/setup/global-setup.cjs` starts one `postgres:18` container per run (Testcontainers), applies the
  migrations to a template database, and `test/utils/test-db.ts` clones a fresh database per test
  file (`createTestDatabase()`).
- `test/db/schema.spec.ts` checks the schema rules (uuidv7 keys, per-language rows, numeric prices as
  numbers, unique slugs/emails/order numbers, one active theme); `test/db/seed.spec.ts` checks the seed
  (fills an empty DB, idempotent, never overwrites dashboard edits).

### Server errors during e2e

`e2e/support/start-server.mjs` collects uncaught exceptions, unhandled rejections and Angular runtime
errors (`NG0xxx`, and exceptions Angular logs as `ERROR …Error`) from the app's output; `e2e/support/check-server-errors.mjs` (Playwright
`globalTeardown`) fails the run if any were logged — SSR errors otherwise go unnoticed because the page
still renders.

## Known failures

None at the moment. If a test has to pin the _correct_ behavior of a known bug, mark it with
`test.fail()` (Playwright) or `it.failing()` (Jest), reference the audit ID, and remove the marker
with the fix.

Regression tests for fixed findings: SEC-01, SEC-02, SEC-03, BUG-01 (`server/test/api`), and BUG-04,
BUG-05, BUG-28, BUG-03 (`e2e/tests`). Each was checked to fail on the code before its fix.

Other tests deliberately assert _current_ behavior that the audit flags:

- `RolesGuard` returns 401 instead of 403 (BUG-24);
- the cart uses product snapshots (BUG-06).

Update those tests together with the fix.

## Writing new tests

- **API test:**
  1. `const t = await createTestApp()` in `beforeAll`, and `t.close()` in `afterAll`.
  2. Use `t.http` for requests, `request.agent(t.app.getHttpServer())` when a session or cart is
     needed, and `t.model('Product')` to seed or inspect data.
  3. Use `adminToken(t)` / `createUser` / `loginToken` for auth.
- **E2E test:**
  1. Call `isolateExternalServices(page)` in `beforeEach`.
  2. Use the helpers in `e2e/tests/helpers.ts`.
  3. Use unique data, because the database is shared across specs in a run.
- Never call real external services. Add a mock instead: `moduleNameMapper` on the server,
  `page.route` in e2e, or extend the local stubs (`server/test/utils/ai-stub.ts`,
  `e2e/support/ai-stub.mjs`) for HTTP APIs the server calls.
