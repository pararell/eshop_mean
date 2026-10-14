# Testing

There are two test layers. Neither one needs a running database, Docker or real API keys.

| Layer                      | Tool                      | What runs                                                                       | Command               | Time                           |
| -------------------------- | ------------------------- | ------------------------------------------------------------------------------- | --------------------- | ------------------------------ |
| Server unit and API tests  | Jest 30 + SWC + Supertest | The real Nest `AppModule` with production middleware, against in-memory MongoDB | `npm run test:server` | about 4 s                      |
| End-to-end (browser) tests | Playwright (Chromium)     | The production SSR build (`dist/`) against seeded in-memory MongoDB             | `npm run test:e2e`    | about 30 s including the build |

Also run `npm run typecheck`. It type-checks the client, the server, the server tests and the e2e specs. The test runners don't do this themselves, because SWC and Playwright only strip types.

## First-time setup

```bash
npm ci
npx playwright install chromium   # browser for e2e, downloaded once
```

The first test run downloads a MongoDB binary for `mongodb-memory-server-core` into
`~/.cache/mongodb-binaries`. This happens only once.

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
  - [test/setup/global-setup.cjs](../server/test/setup/global-setup.cjs) starts one in-memory MongoDB per run.
  - [test/setup/env.ts](../server/test/setup/env.ts) gives each test file its own fresh database.
- **Environment:** `env.ts` sets every variable the server reads. A local `.env` can never leak
  into tests, because `ConfigModule` doesn't override variables that are already set.
- **External services are always mocked:**
  - `@sendgrid/mail` → [test/mocks/sendgrid.ts](../server/test/mocks/sendgrid.ts);
  - `stripe` → [test/mocks/stripe.ts](../server/test/mocks/stripe.ts) (via `moduleNameMapper`);
  - the reCAPTCHA and geolocation HTTP calls → `httpMock` in
    [test/utils/test-app.ts](../server/test/utils/test-app.ts).
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
  1. starts an in-memory MongoDB and seeds two products, two categories, an active shop
     config with 5 EUR shipping, and an admin user (see [fixtures.mjs](../e2e/support/fixtures.mjs));
  2. runs `dist/eshop/server/server.mjs` on port 4600 with explicit test environment values;
  3. writes the database URI to `test-results/e2e-state.json`, so specs can assert stored data.
- **Hermetic:**
  - in the browser, Stripe.js is replaced by a small fake, and TinyMCE, reCAPTCHA and analytics
    are blocked ([helpers.ts](../e2e/tests/helpers.ts));
  - on the server, outbound HTTPS goes to a dead local proxy, so SendGrid, Stripe and
    reCAPTCHA are never reached.
- **Execution:** specs run serially (one worker) against the shared server, so they create
  unique data (timestamps in emails and slugs).

## What is covered

### Server: 107 tests

| Area                | Spec                                    | Covers                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cart logic (unit)   | `src/cart/utils/cart.spec.ts`           | Add, increment, decrement, remove, unknown ids                                                                                                                                                                                                                                                                                                                          |
| Pricing (unit)      | `src/shared/utils/prepareUtils.spec.ts` | Totals = sale price × qty; basic vs. extended shipping; free shipping at the limit; just-below-limit; fallback shipping table; hidden or unpriced items excluded; localized product shape                                                                                                                                                                               |
| Products API        | `test/api/products.spec.ts`             | Visible-only listing, 12-per-page pagination, all four sort orders, category and max-price filters, invalid sort → 400, detail and 404, categories by position; admin create (with auto-created category), duplicate → 400, edit, delete                                                                                                                                |
| Auth API            | `test/api/auth.spec.ts`                 | Signup (hashed password, no client roles: **SEC-01 regression**), duplicate → 409, weak password → 400, signin token and profile, wrong password and unknown user → 401, `GET /api/auth` with valid and invalid tokens                                                                                                                                                  |
| Cart API            | `test/api/cart.spec.ts`                 | Session persistence, totals with default and config shipping, extended shipping, free shipping, remove, missing id → 400                                                                                                                                                                                                                                                |
| Orders API          | `test/api/orders.spec.ts`               | Cash-on-delivery order from the session cart (server total, client amount ignored, cart emptied), emails to customer and admins, invalid body → 422 without crashing (**SEC-02 regression**), Stripe charge amount, currency, token, capture → PAID order, declined charge → 422 with no order and the cart kept, user order history, admin list, get and status update |
| Admin authorization | `test/api/admin-authorization.spec.ts`  | All 23 admin endpoints reject anonymous users and non-admin users                                                                                                                                                                                                                                                                                                       |
| Shop API            | `test/api/eshop.spec.ts`                | Public config exposes `FE_*` values and the active theme but no secrets; admin page create then public read; contact: valid captcha → emails, invalid captcha → 400 without crashing (**SEC-02 regression**), captcha service down → 500                                                                                                                                |

Line coverage is about 75% of server code. `prepareUtils.ts` and `cart.ts` are at 100%, and `orders.service.ts` at 95%.

### E2E: 13 tests

| Flow                                                                                                                                                                                                        | Spec               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Home page is server-rendered with products; product list with prices; category filter; product detail (title, price, description, `<title>`)                                                                | `browse.spec.ts`   |
| Add to cart, header badge, totals with shipping, cart persists across reload, remove item                                                                                                                   | `cart.spec.ts`     |
| Checkout, cash on delivery: address → payment → order; confirmation shown; cart emptied; order stored with server-side total                                                                                | `checkout.spec.ts` |
| Checkout, card: Stripe.js card element → `createToken` → the token, currency, email and address are sent to `/api/orders/stripe` (the API response is stubbed; the server side is covered by the API tests) | `checkout.spec.ts` |
| Signup → login → logout; wrong password                                                                                                                                                                     | `auth.spec.ts`     |
| Admin login → create product (appears in the shop) → edit product price                                                                                                                                     | `admin.spec.ts`    |

## Known failures

None at the moment. If a test has to pin the _correct_ behavior of a known bug, mark it with
`test.fail()` (Playwright) or `it.failing()` (Jest), reference the audit ID, and remove the marker
with the fix.

Regression tests for fixed findings: SEC-01, SEC-02, SEC-03, BUG-01 (`server/test/api`), and BUG-04,
BUG-05, BUG-28 (`e2e/tests`). Each was checked to fail on the code before its fix.

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
  `page.route` in e2e.
