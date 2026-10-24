# Codebase audit

|         |                                                                                                                                                                                                                        |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Audited | `master` @ `a428525` (2026-10-14)                                                                                                                                                                                      |
| Scope   | `client/`, `server/`, root config, Dockerfile, dependencies, git history                                                                                                                                               |
| Method  | Full read of server and client sources, plus verification on Node 24.15 after `npm ci`: `build:ssr` ✅, `nest build` ✅, `tsc --noEmit` ✅ (non-strict), `ng lint` (158 errors), `lint:scss` (185 errors), `npm audit` |

Each finding has:

- an **ID** (one ID = one trackable task);
- a **priority**:
  - **high**: exploitable, data-loss or production-breaking;
  - **medium**: a real defect or risk with limited impact;
  - **low**: hygiene;
- a **location** and a **proposed fix**.

Every high-priority finding was checked against the source code. Fixes that change behavior
need their own approved change (see [CLAUDE.md](../CLAUDE.md)).

## Summary

| Category     | High   | Medium | Low    | Total   |
| ------------ | ------ | ------ | ------ | ------- |
| security     | 8      | 12     | 7      | 27      |
| bug          | 4      | 12     | 12     | 28      |
| types        | 1      | 2      | 1      | 4       |
| tests        | 1      | 0      | 0      | 1       |
| dependencies | 2      | 4      | 4      | 10      |
| performance  | 0      | 5      | 4      | 9       |
| ui           | 0      | 4      | 7      | 11      |
| tech-debt    | 0      | 6      | 9      | 15      |
| **Total**    | **16** | **45** | **44** | **105** |

## Status

Findings resolved since the audit (2026-10-14). The finding texts below are kept as written, for history.

| ID              | Status            | How                                                                                                                                                                                                                                                                                                        |
| --------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01          | Fixed             | Signup only persists whitelisted fields. Regression test in `server/test/api/auth.spec.ts`.                                                                                                                                                                                                                |
| SEC-02          | Fixed             | Contact, order saves and email rendering are awaited or caught; unhandled rejections are logged. Regression tests in `orders.spec.ts` and `eshop.spec.ts`.                                                                                                                                                 |
| SEC-07          | Fixed             | `.env*` is excluded by `.dockerignore` and no longer copied into the image.                                                                                                                                                                                                                                |
| SEC-08 / DEP-01 | Fixed             | Angular 22.2, Nest 12.1, the database driver upgrade and `npm audit fix`: `npm audit --omit=dev` reports 0 vulnerabilities. Remaining dev-only advisories are in the Jest and stylelint toolchains (braces has no upstream fix).                                                                           |
| SEC-19          | Mitigated         | Angular 22 `CommonEngine` rejects hosts outside an allow-list (derived from `ORIGIN` / `SERVER_URL`, or `NG_ALLOWED_HOSTS`). The SSR API base URL is still built from the validated `Host` header.                                                                                                         |
| DEP-03, DEP-04  | Fixed             | Runtime packages are moved to `dependencies`; `cors`, `body-parser`, `multer` and the missing `@types` are declared.                                                                                                                                                                                       |
| DEP-05          | Fixed (corrected) | Removed `deepmerge`, `fastify-static`, `saslprep`, `ts-loader`, `ts-node` and `@nestjs/serve-static`. **Correction:** `class-transformer` _is_ used, because Nest's `ValidationPipe` loads it at runtime, so it stays. `whatwg-url` stays while it is listed in `externalDependencies` and the Dockerfile. |
| DEP-06          | Partly            | stylelint 15 → 17 (now parses SCSS via `postcss-scss`). `standard-version`, `streamifier` and `@angular/animations` remain.                                                                                                                                                                                |
| DEP-07          | Fixed             | `engines` uses ranges (`node ^24.15.0`). Docker uses `node:24.21-alpine3.24`.                                                                                                                                                                                                                              |
| TST-01          | Fixed             | Jest + Supertest API and unit tests (104) and Playwright e2e tests (12). See [testing.md](testing.md).                                                                                                                                                                                                     |
| TD-02           | Partly            | The client lint uses a flat config (`client/eslint.config.mjs`). The server lint is still broken.                                                                                                                                                                                                          |
| TD-05           | Fixed             | The `*.yml` rule was removed from `.gitignore`.                                                                                                                                                                                                                                                            |
| TYP-01          | Fixed             | `strict: true` for client and server (TypeScript 6), plus Angular `strictTemplates`. 0 errors.                                                                                                                                                                                                             |
| TYP-02          | Fixed             | Explicit `any` went from about 130 to 0 in application code. Lint enforces `no-explicit-any`.                                                                                                                                                                                                              |
| TYP-03          | Fixed             | Server model interfaces are rebuilt on shared types in `shared/types/index.d.ts` (`@eshop/shared`), which client and server both use.                                                                                                                                                                      |
| TD-02           | Fixed             | One `eslint.config.mjs` for the repo (0 errors), Prettier for the whole repo, and husky + lint-staged pre-commit. The legacy `.eslintrc.json` files are removed.                                                                                                                                           |
| DEP-08          | Fixed             | Docker runtime holds only `dist/` + `pg`: 783 MB → 175 MB.                                                                                                                                                                                                                                                 |
| SEC-26          | Mostly fixed      | The image runs as `node`, with `tini` as PID 1 and `CMD node …` (instant `docker stop`). A `HEALTHCHECK` is still missing.                                                                                                                                                                                 |
| TD-15           | Fixed             | The stale `server/dist` is gone; `nest build` uses `rootDir: ./src`.                                                                                                                                                                                                                                       |
| SEC-03          | Fixed             | The server derives the currency from the language (`currencyForLang`: en/sk → EUR, cs → CZK) for the Stripe charge and the stored order; the client value is ignored. Tests in `orders.spec.ts`.                                                                                                           |
| BUG-01          | Fixed             | Stripe amounts are `Math.round(total * 100)`. Test with a 17.35 total (1735.0000000000002 before rounding).                                                                                                                                                                                                |
| BUG-04          | Fixed             | `makeOrder*` stop after recording the error; a failed order keeps the cart and checkout. e2e test in `checkout.spec.ts`.                                                                                                                                                                                   |
| BUG-05          | Fixed             | A failed sign-in no longer replaces the user (`userState.error = true`). The e2e test's `test.fail()` marker is removed.                                                                                                                                                                                   |
| BUG-28          | Mostly fixed      | Saves and deletes reload the page/theme/config/product lists. `POST /api/products/add` now awaits the save before answering. The post-order empty cart, image results and translations (BUG-12) still use `keepAsIs()`.                                                                                    |
| TD-03           | Mostly fixed      | Official migrations: standalone (no NgModules left; lazy `routes.ts`), `inject()`, signal `input()`/`output()`/`viewChild()`, unused imports, self-closing tags. 26 components still opt into `Eager` change detection (OnPush needs per-component review).                                                |
| BUG-03          | Fixed             | The URL prefix (`/en                                                                                                                                                                                                                                                                                       | /sk | /cs`) decides the language at startup (`PlatformLocation`, also during SSR) and on navigation (`languageGuard`); the switcher changes the URL. `/` keeps the cookie language; the cookie is now site-wide (`path: '/'`). e2e: `language.spec.ts`. |
| UI-01           | Mostly fixed      | Shop pages use buttons and links only; the admin screens are left for M3.                                                                                                                                                                                                                                  |
| UI-02           | Fixed             | Decorative images have `alt=""`, the gallery uses the product title; product images use `NgOptimizedImage` with a Cloudinary loader (srcset, f_auto/q_auto).                                                                                                                                               |
| UI-03           | Fixed             | Header menu items are `<a mat-menu-item>` / `<button mat-menu-item>` (M2 redesign).                                                                                                                                                                                                                        |
| UI-06           | Fixed             | Logo link, icon buttons and the phone login link have accessible names.                                                                                                                                                                                                                                    |
| UI-07           | Fixed             | Home video: pause/play button, no autoplay with `prefers-reduced-motion`.                                                                                                                                                                                                                                  |
| UI-09           | Fixed             | The whole payment card selects the option (e2e test in `checkout.spec.ts`).                                                                                                                                                                                                                                |
| UI-10           | Fixed             | The checkout stepper is gone (one-page checkout).                                                                                                                                                                                                                                                          |
| UI-11           | Fixed             | The carousel is removed.                                                                                                                                                                                                                                                                                   |
| SEC-09          | Fixed             | The CSP is enforced with a per-request nonce; `CSP_REPORT_ONLY=true` is the escape hatch.                                                                                                                                                                                                                  |
| UI-05           | Fixed             | `<html lang>` follows the active language, including in SSR output.                                                                                                                                                                                                                                        |

| SEC-10 | Fixed (PostgreSQL migration) | Search and category filter use `ILIKE` with `%`/`_` escaped (`likePattern` in `server/src/db/catalog.ts`): a literal substring match, no regex. |
| SEC-24 | Fixed (PostgreSQL migration) | Login uses `bcrypt.compare`; the `salt` column is gone. |
| BUG-22 | Fixed (PostgreSQL migration) | `23505` is now the right code; emails are unique on `lower(email)`, so a duplicate signup answers 409 from the database. Test in `auth.spec.ts`. |
| TYP-04 | Mitigated | The `order_status` enum is enforced by the database; the DTO still accepts any string, so an invalid status from the admin answers 500 instead of being stored. Validating it in the DTO (422) is a small follow-up. |
| DEP-09 | Partly | The second database connection is gone: the session store shares the app's `pg` pool. Duplicate body parsing (`body-parser` on top of Nest's) remains. |
| PERF-01 | Partly | Category deletion is one `array_remove` update. Admin lists (`getAllOrders`, `getAllProducts`, `getAllCategories`) still have no pagination. |
| PERF-02 | Fixed (PostgreSQL migration) | Unique indexes on slugs, `lower(email)`, `order_number`; GIN on `products.tags`; `product_translations (lang, visibility, sale_price)`; orders by user and date. |
| PERF-03 | Partly | One listing query (`count(*) over ()`) plus one min/max query instead of four. The price range still ignores filters and visibility (kept for parity). |

| SEC-06 | Fixed (M0) | Per-IP rate limit (`@nestjs/throttler`, default 10/min per endpoint) on sign-in, sign-up, contact, order and Stripe endpoints; the AI endpoint has its own limits. Behind a proxy, `TRUST_PROXY` gives the real client IP. Tests in `security.spec.ts`. |
| SEC-09 | Fixed (M0, M2) | helmet: `nosniff`, `X-Frame-Options`, HSTS (this host only), `Referrer-Policy`, no `X-Powered-By`. The CSP is enforced since M2 (per-request nonce for inline scripts). |
| SEC-11 | Fixed (M0) | Session cookie `httpOnly`, `SameSite=Lax`, `Secure` on HTTPS (`secure: 'auto'`, needs `TRUST_PROXY` behind a TLS-terminating proxy). |

| DEP-02 | Fixed (M1) | `stripe@23`, API `2026-09-30.endive`: PaymentIntents with the Payment Element (SCA/3-D Secure), signed webhooks, idempotency keys, admin refunds. The Charges/token flow is removed (`POST /api/orders/stripe` → 410). See [payments.md](payments.md). |
| BUG-02 | Fixed (M1) | The order exists (PENDING_PAYMENT) before the customer pays; it becomes PAID exactly once, from the webhook or the customer's return, with the emails. Nothing is captured without an order. |
| SEC-04 | Partly (M1) | Card orders validate the body (`PaymentIntentDto`, 422) and take the user from the JWT only. Cash-on-delivery orders (`POST /api/orders/add`) still accept `userId` from the body. |

Still open and notable: SEC-04 for cash-on-delivery orders, BUG-06 (stale cart prices), BUG-07 (stock).

---

## Security

### High

**SEC-01: Anyone can sign up as admin (mass assignment)**

- Priority: high
- Location: [server/src/auth/auth.service.ts:29](../server/src/auth/auth.service.ts#L29), [server/src/auth/auth.controller.ts:35](../server/src/auth/auth.controller.ts#L35)
- Problem: `new this.userModel(authCredentialsDto)` persists every body field.
  `ValidationPipe` runs without `whitelist`, and the User schema has `roles`.
  `POST /api/auth/signup {"email":"x@y.z","password":"abc12","roles":["admin"]}` creates
  an admin.
- Fix: build the document from explicit fields (`{ email, password, salt }`). Add a global
  `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`. Audit
  existing users for unexpected `roles`.

**SEC-02: Unauthenticated requests can crash the Node process (unhandled promise rejections)**

- Priority: high
- Location:
  - [server/src/eshop/eshop.controller.ts:38](../server/src/eshop/eshop.controller.ts#L38)
  - [server/src/orders/orders.service.ts:42](../server/src/orders/orders.service.ts#L42)
  - [server/src/shared/utils/email/mailer.ts:12](../server/src/shared/utils/email/mailer.ts#L12)
  - [server/src/orders/orders.service.ts](../server/src/orders/orders.service.ts) (`sendmail` uses `order.addresses[0]`)
- Problem: Node ≥ 15 terminates on unhandled rejections, and no handler is registered.
  - `sendContact()` isn't awaited by its controller, so a request with an invalid reCAPTCHA
    token makes its `BadRequestException` an unhandled rejection.
  - `newOrder.save()` isn't awaited, so a cast error (e.g. `notes: {}`) is unhandled.
  - Email sends aren't awaited, and template rendering (`getContent`) runs outside the
    `try`, so an order without `addresses` throws in a floating promise.
- Fix: `await` (or `return`) every promise; move `getContent` inside the `try`; use
  `Promise.allSettled` for emails; add the `@typescript-eslint/no-floating-promises` lint
  rule. Confirm with a regression test in Step 3.

**SEC-03: Client chooses the Stripe charge currency**

- Priority: high
- Location: [server/src/orders/orders.service.ts:81](../server/src/orders/orders.service.ts#L81)
- Problem: `amount` is computed server-side in the `lang`'s prices, but `currency` comes
  from the body. A €10 order can be charged as 10 CZK.
- Fix: derive the currency on the server from `lang` / the shop config; ignore
  `body.currency`.

**SEC-04: Public order endpoints accept unvalidated bodies; orders can be attached to any user**

- Priority: high
- Location: [server/src/orders/orders.controller.ts:36](../server/src/orders/orders.controller.ts#L36) (`@Body() orderDto` without a pipe), [orders.controller.ts:63](../server/src/orders/orders.controller.ts#L63) (`@Body() body`, untyped), [orders.service.ts:144](../server/src/orders/orders.service.ts#L144) (`userId` → `_user`)
- Problem: the `OrderDto` decorators never run. Any `userId` in the body becomes the
  order's owner, so orders show up in another user's history. Empty carts are accepted.
- Fix: global `ValidationPipe`; nested `AddressDto` with `@ValidateNested`; take the user
  from an optional JWT, never from the body; reject empty carts.

**SEC-05: Email relay and HTML injection via order and contact emails**

- Priority: high
- Location: [server/src/shared/utils/email/email-utils.ts:15-17](../server/src/shared/utils/email/email-utils.ts#L15-L17), [server/src/shared/utils/email/emailTemplates.ts](../server/src/shared/utils/email/emailTemplates.ts) (address and notes interpolation), [server/src/orders/orders.controller.ts](../server/src/orders/orders.controller.ts) (`/add`)
- Problem: `POST /api/orders/add` has no captcha or rate limit and sends a branded HTML
  email to any address in the body. User input (name, notes, address) is interpolated
  without escaping. Customer emails also include `ADMIN_EMAILS`.
- Fix: escape all interpolated values; rate-limit and/or captcha; don't expose admin
  addresses in customer emails.

**SEC-06: No rate limiting anywhere**

- Priority: high
- Location: [server/src/setAppDB.ts](../server/src/setAppDB.ts), [server/src/main-ssr.ts](../server/src/main-ssr.ts)
- Problem: unlimited signin attempts (brute force), signups, orders, contact messages and
  regex searches.
- Fix: `@nestjs/throttler` globally, with stricter limits on `auth/*`, `orders/*` and
  `eshop/contact`.

**SEC-07: `.env` is baked into the Docker image**

- Priority: high
- Location: [Dockerfile:12](../Dockerfile#L12), [.dockerignore](../.dockerignore)
- Problem: the runtime stage copies `.env*`, and `.dockerignore` doesn't exclude it. The
  README advertises a public image (`pararel/eshop-mean`). Any image built from a working
  copy with a real `.env` ships every secret.
- Fix: add `.env*` (except `.env.example`) to `.dockerignore`; drop it from the `COPY`;
  inject config at runtime (`--env-file`, orchestrator secrets). If a published image
  contained a real `.env`, rotate all keys and delete those tags.

**SEC-08: Known-vulnerable runtime dependencies**

- Priority: high
- Location: [package.json](../package.json)
- Problem: `npm audit --omit=dev` reports 31 issues (3 critical, 21 high):
  - the former database driver: search injection, filter bypass, prototype pollution;
  - Angular 20.2.2: XSRF token leak, transfer-cache leak;
  - multer, path-to-regexp and proxy-addr through Nest/Express;
  - tinymce XSS; validator.

  `npm audit` overall: 95 (6 critical, 62 high).

- Fix: Step 5 upgrades, at least the patched database driver, Angular ≥ 20.3.x and
  `@nestjs/platform-express` ≥ 11.1.18.

### Medium

**SEC-09: No security headers**

- Priority: medium
- Location: [server/src/setAppDB.ts](../server/src/setAppDB.ts)
- Problem: no helmet, CSP, HSTS, `X-Content-Type-Options` or frame protection on API and
  SSR responses.
- Fix: `helmet()` with a CSP that allows Stripe, reCAPTCHA, TinyMCE, Cloudinary and
  Google Analytics.

**SEC-10: Regex injection / ReDoS in product search and category filter**

- Priority: medium
- Location: [server/src/products/products.service.ts:33](../server/src/products/products.service.ts#L33), [:35](../server/src/products/products.service.ts#L35), [:78](../server/src/products/products.service.ts#L78)
- Problem: `new RegExp(userInput, 'i')`. An input like `(` gives a 500; catastrophic
  patterns tie up the database.
- Fix: escape regex metacharacters and cap the length (or use a `$text` / prefix index).

**SEC-11: Insecure session cookie**

- Priority: medium
- Location: [server/src/setAppDB.ts:28-42](../server/src/setAppDB.ts#L28-L42)
- Problem: `secure: false` hardcoded, no `sameSite`, default cookie name, 30-day lifetime,
  no `trust proxy`.
- Fix: `secure` in production, `sameSite: 'lax'`, `app.set('trust proxy', 1)` behind a
  proxy, a custom name.

**SEC-12: JWT exposed via the URL and `localStorage`**

- Priority: medium
- Location: [server/src/auth/auth.controller.ts:61](../server/src/auth/auth.controller.ts#L61), [client/src/app/services/api.service.ts](../client/src/app/services/api.service.ts) (`setHeaders`), [client/src/app/components/auth/jwtToken/jwtToken.component.ts](../client/src/app/components/auth/jwtToken/jwtToken.component.ts)
- Problem: the Google callback redirects to `/jwtToken/<jwt>` (browser history, logs,
  `Referer`). The token is kept in `localStorage`, readable by any XSS.
- Fix: an httpOnly `SameSite` cookie set by the server, or a one-time code exchanged by POST.

**SEC-13: JWT secret and expiry are not validated**

- Priority: medium
- Location: [server/src/auth/auth.module.ts:19-24](../server/src/auth/auth.module.ts#L19-L24)
- Problem: if `JWT_EXPIRATION` is unset, tokens never expire. A missing `JWT_SECRET` is not
  detected at startup. There is no revocation or refresh.
- Fix: `ConfigModule.forRoot({ validationSchema })` (Joi or zod) for all env vars;
  `JwtModule.registerAsync` with `ConfigService`.

**SEC-14: Google login links accounts by unverified email (pre-account takeover)**

- Priority: medium
- Location: [server/src/auth/strategy/google.strategy.ts](../server/src/auth/strategy/google.strategy.ts), [server/src/auth/auth.service.ts](../server/src/auth/auth.service.ts) (`signInGoogle`)
- Problem: any existing account with the same email is logged in. An attacker can register
  a victim's email with a password first. `emails[0].verified` is not checked.
- Fix: require `verified`; link only to accounts whose email has been verified.

**SEC-15: Hidden products and internal fields leak**

- Priority: medium
- Location: [server/src/products/products.service.ts:77-94](../server/src/products/products.service.ts#L77-L94)
- Problem: `/api/products/search` (unbounded) and `/api/products/:name` ignore
  `visibility`. Without `?lang` the raw document (including `_user`) is returned.
- Fix: filter on `<lang>.visibility: true`, project public fields only, limit results.

**SEC-16: Image upload without size or type limits**

- Priority: medium
- Location: [server/src/admin/admin.controller.ts:56](../server/src/admin/admin.controller.ts#L56), [server/src/admin/admin.service.ts](../server/src/admin/admin.service.ts) (`resource_type: 'auto'`)
- Problem: `FileInterceptor('file', upload.single('file'))` passes a middleware where
  `MulterOptions` belong, so memory storage has no limits. Any file type goes to
  Cloudinary.
- Fix: `FileInterceptor('file', { limits: { fileSize }, fileFilter })` plus
  `ParseFilePipe`; `resource_type: 'image'`.

**SEC-17: Unvalidated `lang` header is used as a query, projection and sort key**

- Priority: medium
- Location: [server/src/products/products.service.ts](../server/src/products/products.service.ts), [server/src/eshop/eshop.service.ts](../server/src/eshop/eshop.service.ts), [server/src/shared/utils/paginate.ts](../server/src/shared/utils/paginate.ts), [server/src/shared/utils/prepareUtils.ts:63](../server/src/shared/utils/prepareUtils.ts#L63)
- Problem: an arbitrary header value selects arbitrary document paths; unknown values
  cause 500s.
- Fix: a `LangPipe` / custom decorator validating against `languages`, defaulting to `en`.

**SEC-18: Admin update endpoints write raw request bodies**

- Priority: medium
- Location: [server/src/orders/orders.service.ts:128-132](../server/src/orders/orders.service.ts#L128-L132), [server/src/products/products.service.ts](../server/src/products/products.service.ts) (`editProduct`, `editCategory`), [server/src/eshop/eshop.service.ts](../server/src/eshop/eshop.service.ts) (page/theme/config), [server/src/translations/translations.controller.ts](../server/src/translations/translations.controller.ts)
- Problem: no DTOs; query-operator objects are possible in filters (`{ orderId: {$ne: null} }`).
  Admin-only, but combined with SEC-01 they are open to everyone.
- Fix: DTOs plus `$set` of whitelisted fields; cast filter values to strings.

**SEC-19: SSR fetches the API from a URL built from the `Host` header**

- Priority: medium
- Location: [server/src/app-universal.module.ts:27-28](../server/src/app-universal.module.ts#L27-L28), [client/src/app/services/api.service.ts:32-34](../client/src/app/services/api.service.ts#L32-L34)
- Problem: a spoofed `Host` makes the SSR render use data fetched from an attacker host
  (SSRF, cache poisoning).
- Fix: use an internal URL from env (`http://127.0.0.1:$PORT`) or a host allowlist
  (`AngularNodeAppEngine` `allowedHosts`).

**SEC-20: Hydration transfer cache includes POST and authenticated responses**

- Priority: medium
- Location: [client/src/app/app.config.ts:23-26](../client/src/app/app.config.ts#L23-L26)
- Problem: `includePostRequests` and `includeRequestsWithAuthHeaders` would serialize
  user-specific responses into the HTML once SSR requests carry credentials.
- Fix: remove both flags, or add a `filter` that allows only public GETs.

### Low

**SEC-21: `FE_` substring exposes env vars to the browser**

- Priority: low
- Location: [server/src/eshop/eshop.service.ts:38-40](../server/src/eshop/eshop.service.ts#L38-L40)
- Problem: any variable whose name _contains_ `FE_` (e.g. a future `SAFE_SECRET`) is sent
  to the client.
- Fix: `startsWith('FE_')`, or an explicit allow-list.

**SEC-22: `GET /api/eshop/config/all` is public**

- Priority: low
- Location: [server/src/eshop/eshop.controller.ts:86-89](../server/src/eshop/eshop.controller.ts#L86-L89)
- Problem: exposes all (including inactive) shop configs.
- Fix: add the JWT + `RolesGuard` guards.

**SEC-23: State-changing GET endpoints for the cart**

- Priority: low
- Location: [server/src/cart/cart.controller.ts:26](../server/src/cart/cart.controller.ts#L26), [:41](../server/src/cart/cart.controller.ts#L41)
- Problem: cart add/remove are GETs (CSRF-able, cacheable, prefetchable).
- Fix: POST/DELETE (an API contract change; coordinate with the client).

**SEC-24: Non-constant-time password comparison**

- Priority: low
- Location: [server/src/auth/auth.service.ts:96-102](../server/src/auth/auth.service.ts#L96-L102)
- Problem: re-hash plus `===`.
- Fix: `bcrypt.compare`.

**SEC-25: reCAPTCHA verification is incomplete**

- Priority: low
- Location: [server/src/eshop/eshop.service.ts:62](../server/src/eshop/eshop.service.ts#L62)
- Problem: the token is concatenated into the URL unencoded; `score`, `action`, `hostname`
  and `remoteip` are not checked.
- Fix: POST form-encoded params; check the score and action.

**SEC-26: Docker image runs as root, with npm as PID 1**

- Priority: low
- Location: [Dockerfile](../Dockerfile)
- Problem: no `USER`, no `HEALTHCHECK`, no `NODE_ENV=production`; npm doesn't forward
  signals properly.
- Fix: `USER node`, `HEALTHCHECK`, `CMD ["node", "dist/eshop/server/server.mjs"]`.

**SEC-27: Secrets in git history (informational)**

- Priority: low
- Location: git history
- Problem:
  - a self-signed localhost TLS private key (`localhost.key`) is in commit `05bdca7` on the
    local-only `shop` branch and a stash (never pushed);
  - a Stripe **test publishable** key (`pk_test_…`, public by design) is in
    `client/src/config/keys.ts` history (`8f25f1a`, `8b87103`).

  No live secret keys were found in 301 commits.

- Fix: optionally roll the Stripe test publishable key; `*.key`, `*.crt` and `*.pem` are
  now gitignored.

## Bug

### High

**BUG-01: Stripe amount is not an integer**

- Priority: high
- Location: [server/src/orders/orders.service.ts:80](../server/src/orders/orders.service.ts#L80)
- Problem: `totalPrice * 100` gives floats (`19.99*100 = 1998.9999…`), which Stripe
  rejects, so card payment fails for such totals.
- Fix: `Math.round(total * 100)`; consider storing integer minor units.

**BUG-02: Card can be captured without an order being saved**

- Priority: high
- Location: [server/src/orders/orders.service.ts:93-117](../server/src/orders/orders.service.ts#L93-L117)
- Problem: capture happens, then `newOrder.save()` is not awaited. Any later failure is
  swallowed and the payment isn't refunded. No idempotency, no webhook.
- Fix: short term, await the save and refund or void on failure. Long term, migrate to
  PaymentIntents plus a webhook with idempotent order creation (needs a decision; affects
  the client).

**BUG-03: Language in the URL is ignored; SSR always renders the default language**

- Priority: high
- Location: [client/src/app/services/translate.service.ts:63-67](../client/src/app/services/translate.service.ts#L63-L67), [client/src/app/app.routes.ts](../client/src/app/app.routes.ts), [client/src/app/shared/components/header/header.component.ts](../client/src/app/shared/components/header/header.component.ts)
- Problem: the language comes from the `eshop_lang` cookie, which the SSR side can't read
  (`ngx-cookie-service` is browser-only). `/sk/...` URLs may render English, switching
  language doesn't change the URL, and SEO and hydration suffer.
- Fix: derive the language from the first URL segment (a parent `:lang` route or
  resolver); navigate on switch.

**BUG-04: Order error state is overwritten**

- Priority: high
- Location: [client/src/app/store/signal.store.ts:174-214](../client/src/app/store/signal.store.ts#L174-L214)
- Problem: in `makeOrder` / `makeOrderWithPayment` the error branch sets
  `ORDER_SUBMIT_ERROR` and then falls through to a second `update` that overwrites it. A
  failed order can be presented as success or empty.
- Fix: `return` after the error update (and add a test).

### Medium

**BUG-05: Failed sign-in is stored as the logged-in user**

- Priority: medium
- Location: [client/src/app/store/signal.store.ts:19-24](../client/src/app/store/signal.store.ts#L19-L24)
- Problem: the `{ error }` response is written to `user`, so the header shows "Logout".
- Fix: check `response.error` and set an error state.

**BUG-06: Cart prices go stale (product snapshot in the session)**

- Priority: medium
- Location: [server/src/cart/utils/cart.ts:16](../server/src/cart/utils/cart.ts#L16), [server/src/shared/utils/prepareUtils.ts](../server/src/shared/utils/prepareUtils.ts)
- Problem: the full product document is copied into the session. Later price, visibility
  or deletion changes are ignored at checkout for up to 30 days.
- Fix: store `{id, qty}` only and load products when pricing (needs a business decision).

**BUG-07: No stock handling**

- Priority: medium
- Location: [server/src/products/schemas/product.schema.ts:17](../server/src/products/schemas/product.schema.ts#L17), [server/src/orders/orders.service.ts](../server/src/orders/orders.service.ts)
- Problem: `stock` is a String and is never checked or decremented.
- Fix: decide the intended behavior first; then use a numeric stock with an atomic
  decrement (best done with the Postgres migration).

**BUG-08: Upsert edits return 404 after successfully creating the record**

- Priority: medium
- Location: [server/src/products/products.service.ts:121-131](../server/src/products/products.service.ts#L121-L131), [:153-163](../server/src/products/products.service.ts#L153-L163)
- Problem: `findOneAndUpdate(..., {upsert: true})` without `new: true` returns `null` on
  insert, and then a `NotFoundException` is thrown.
- Fix: `{ upsert: true, new: true }`, or remove the upsert.

**BUG-09: Geolocation language detection is broken**

- Priority: medium
- Location: [server/src/translations/translations.controller.ts:21-33](../server/src/translations/translations.controller.ts#L21-L33)
- Problem: the lookup runs from the server, so it gets the server's country. The fallback
  `country['default']` (a string index) should be `countryLang.default`. It also uses POST
  on a GET API.
- Fix: forward the client IP or detect on the client; fix the fallback.

**BUG-10: Unknown `lang` or invalid paging params cause 500s**

- Priority: medium
- Location: [server/src/shared/utils/prepareUtils.ts:19](../server/src/shared/utils/prepareUtils.ts#L19), [:63](../server/src/shared/utils/prepareUtils.ts#L63), [server/src/shared/utils/paginate.ts:15](../server/src/shared/utils/paginate.ts#L15)
- Problem: `shippingCost[lang]` / `product[lang]` are undefined; `page=0`, `-1` or `abc`
  gives a negative or NaN skip.
- Fix: validate with DTOs (`@IsIn(languages)`, `@Type(() => Number) @IsInt() @Min(1)`).

**BUG-11: Env vars read at import time**

- Priority: medium
- Location: [server/src/orders/orders.service.ts:14-15](../server/src/orders/orders.service.ts#L14-L15), [server/src/admin/admin.service.ts:11-15](../server/src/admin/admin.service.ts#L11-L15), [server/src/shared/utils/email/mailer.ts:5](../server/src/shared/utils/email/mailer.ts#L5), [server/src/app.module.ts:22](../server/src/app.module.ts#L22)
- Problem: Stripe, Cloudinary, SendGrid and the database are configured at module load. This only
  works because of import order; it is fragile under bundling and untestable.
- Fix: factory providers with `ConfigService`.

**BUG-12: Route guards depend on the first emitted user value**

- Priority: medium
- Location: [client/src/app/services/auth.guard.ts:8-17](../client/src/app/services/auth.guard.ts#L8-L17)
- Problem: the guards return `toObservable(user)` without waiting for the user to load.
  On a hard reload of `/orders` or `/dashboard` a logged-in user may be rejected.
  `AdminGuard` throws when `roles` is missing (e.g. after the Google `/jwtToken` flow
  stores `{accessToken}` only).
- Fix: wait for the user to finish loading (`filter`, `take(1)`); return a boolean or a
  `UrlTree`; use `roles?.includes`.

**BUG-13: Service worker is never registered or built**

- Priority: medium
- Location: [client/src/main.ts:7-9](../client/src/main.ts#L7-L9), [angular.json](../angular.json)
- Problem: `bootstrapApplication(AppComponent, appConfig)` ignores the merged `config`
  that contains `provideServiceWorker`, and `angular.json` has no `serviceWorker` option.
  PWA support is dead code.
- Fix: decide whether a PWA is wanted. If yes, bootstrap with `config` and add the
  `serviceWorker` option; if not, remove the SW config and dependency.

**BUG-14: HTTP interceptor is never applied**

- Priority: medium
- Location: [client/src/app/app.config.ts:22](../client/src/app/app.config.ts#L22), [:29-33](../client/src/app/app.config.ts#L29-L33)
- Problem: a class-based `HTTP_INTERCEPTORS` entry without `withInterceptorsFromDi()`.
- Fix: a functional interceptor via `withInterceptors([...])` (also the right place for the
  auth header).

**BUG-15: Store actions have no cancellation (out-of-order responses)**

- Priority: medium
- Location: [client/src/app/store/signal.store.ts](../client/src/app/store/signal.store.ts)
- Problem: every action subscribes independently. Fast filter, page or cart changes can
  apply stale responses last.
- Fix: `switchMap` per action stream, or `rxMethod` / `httpResource`.

### Low

**BUG-28: Store writes save results into list slots**

- Priority: medium
- Location: [client/src/app/store/signal.store.ts](../client/src/app/store/signal.store.ts) (`keepAsIs()` call sites)
- Problem: after saving or deleting a page, theme, config or product, the store writes the API
  response (a single document, an update result or nothing) into `page` / `themes` / `configs` /
  `allProducts`. Lists show stale or broken data until the next refetch. The order cart is
  replaced by a session-cart shape. Found by strict typing; marked with `keepAsIs()`.
- Fix: refetch the list after a save, or return the updated list from the API.

**BUG-16: Product meta tags from the previous product**

- Priority: low
- Location: [client/src/app/modules/product/product/product.component.ts](../client/src/app/modules/product/product/product.component.ts) (`setMetaData`)
- Problem: `take(1)` on the store emits the previously loaded product when navigating
  A → B.
- Fix: clear the product on route change, or filter by `titleUrl`.

**BUG-17: Auth headers can be missing on the first requests**

- Priority: low
- Location: [client/src/app/services/api.service.ts](../client/src/app/services/api.service.ts) (`setHeaders`)
- Problem: `requestOptions` are set asynchronously via `toObservable`, so the initial
  `getUser()` and config calls may go out without `Authorization`.
- Fix: read the token synchronously in an interceptor.

**BUG-18: Theme applied only in the browser (unthemed SSR flash)**

- Priority: low
- Location: [client/src/app/services/env-configuration.service.ts](../client/src/app/services/env-configuration.service.ts)
- Problem: CSS variables are set behind `isPlatformBrowser`.
- Fix: set them during SSR too (`DOCUMENT` works on the server).

**BUG-19: `from(lang)` iterates characters**

- Priority: low
- Location: [client/src/app/modules/dashboard/](../client/src/app/modules/dashboard/) (`categories-edit`, `config-edit`, `pages-edit`, `products-edit`)
- Problem: `from('en')` emits `'e'`, `'n'`, so the handler fires twice.
- Fix: `of(lang).pipe(delay(…))`.

**BUG-20: `routerLinkActive` has no effect in the header**

- Priority: low
- Location: [client/src/app/shared/components/header/header.component.ts](../client/src/app/shared/components/header/header.component.ts)
- Problem: `RouterLinkActive` is missing from the standalone `imports`.
- Fix: import it.

**BUG-21: Formatted price string sent as `amount`; prices with cents display wrong**

- Priority: low
- Location: [client/src/app/modules/cart/cart/cart.component.html](../client/src/app/modules/cart/cart/cart.component.html), [client/src/app/pipes/price.pipe.ts](../client/src/app/pipes/price.pipe.ts)
- Problem: the `priceFormat` output (rounded `toFixed(0)` string) is passed as the price.
- Fix: pass numbers; format with `Intl.NumberFormat` / `CurrencyPipe`.

**BUG-22: Duplicate-key detection uses a PostgreSQL error code**

- Priority: low
- Location: [server/src/auth/auth.service.ts:36](../server/src/auth/auth.service.ts#L36)
- Problem: The duplicate-key check used the wrong error code. With no unique index, concurrent signups
  can create duplicate users.
- Fix: a unique index (schema change, deferred to the Postgres migration) and the correct
  code.

**BUG-23: Google-only user signing in with a password gets a 500**

- Priority: low
- Location: [server/src/auth/auth.service.ts:96-102](../server/src/auth/auth.service.ts#L96-L102)
- Problem: `bcrypt.hash(pw, undefined)` throws.
- Fix: return 401 when the user has no password.

**BUG-24: `RolesGuard` returns 401 instead of 403 and crashes without `roles`**

- Priority: low
- Location: [server/src/auth/roles.guard.ts](../server/src/auth/roles.guard.ts)
- Fix: `ForbiddenException`, `roles?.includes`.

**BUG-25: Adding a nonexistent product id to the cart gives a 500**

- Priority: low
- Location: [server/src/cart/cart.service.ts](../server/src/cart/cart.service.ts)
- Problem: `item: null` is pushed, then `prepareProduct(null)` throws.
- Fix: return 404 when the product isn't found.

**BUG-26: Static assets cached for 0.6 s; `titles=false` is truthy**

- Priority: low
- Location: [server/src/app-universal.module.ts:41-43](../server/src/app-universal.module.ts#L41-L43), [server/src/eshop/eshop.controller.ts:41-47](../server/src/eshop/eshop.controller.ts#L41-L47)
- Problem: `maxAge: 600` is milliseconds; the query string `"false"` is truthy.
- Fix: `maxAge: '1y', immutable` for hashed files; parse booleans.

**BUG-27: `ADMIN_EMAILS` entries are not trimmed**

- Priority: low
- Location: [server/src/orders/orders.service.ts](../server/src/orders/orders.service.ts), [server/src/eshop/eshop.service.ts](../server/src/eshop/eshop.service.ts)
- Problem: `"a, b"` produces `" b"` (the format used in `.env.example`).
- Fix: `.map(s => s.trim())`.

## Types

**TYP-01: TypeScript strict mode is off everywhere**

- Priority: high
- Location: [client/tsconfig.json](../client/tsconfig.json), [server/tsconfig.json](../server/tsconfig.json), [server/.eslintrc.json](../server/.eslintrc.json)
- Problem: no `strict`, `noImplicitAny` or `strictNullChecks`; `fullTemplateTypeCheck`
  (deprecated) instead of `strictTemplates`; ESLint disables `no-explicit-any`. Several
  bugs above (BUG-04, BUG-05, BUG-10) would be caught by strict null checks.
- Fix: Step 6, enabling flags incrementally.

**TYP-02: Pervasive `any`**

- Priority: medium
- Location: client about 100 explicit (`client/src/app/services/api.service.ts` about 44,
  `client/src/app/store/signal.store.ts` about 35); server about 31 explicit plus about 20
  untyped `@Body()`, `@Session()` and `@Req()` parameters.
- Fix: typed DTOs and response interfaces; shared DTO types (Step 6).

**TYP-03: TS interfaces don't match the schemas**

- Priority: medium
- Location: [server/src/products/models/product.model.ts](../server/src/products/models/product.model.ts), [server/src/cart/utils/cart.ts](../server/src/cart/utils/cart.ts), [server/src/eshop/eshop.service.ts](../server/src/eshop/eshop.service.ts)
- Problem:
  - the `Product` interface is flat while the schema is per-language;
  - `ProductsWithPagination` doesn't match what `paginate` returns;
  - `updateOne` results are typed as documents.
- Fix: derive the types from the schemas (or the future ORM); correct the return types.

**TYP-04: Order status is a free string**

- Priority: low
- Location: [server/src/orders/schemas/order.schema.ts:10](../server/src/orders/schemas/order.schema.ts#L10)
- Problem: the `OrderStatus` enum exists but isn't enforced by the schema or DTO.
- Fix: validate in the DTO now; add an enum constraint in Postgres.

## Tests

**TST-01: No automated tests at all**

- Priority: high
- Location: repo-wide
- Problem: 0 `*.spec.ts` files, no test runner, no `test` script.
- Fix: Step 3 (Jest + Supertest with a disposable test database, unit tests for
  `prepareCart` / `Cart`, Playwright e2e).

## Dependencies

**DEP-01: Vulnerable versions**

- Priority: high
- Problem: see SEC-08. The database driver is pinned to an old exact version.
- Fix: Step 5.

**DEP-02: Stripe SDK v9 / API version 2020-08-27 / Charges API**

- Priority: high
- Location: [package.json](../package.json), [server/src/orders/orders.service.ts:15](../server/src/orders/orders.service.ts#L15)
- Problem: many majors behind. The Charges API with card tokens has no SCA/3DS support,
  which is required for EU (sk/cs) customers.
- Fix: upgrade the SDK; plan a PaymentIntents migration (a behavior change needing its own
  approval).

**DEP-03: Runtime packages declared as devDependencies**

- Priority: medium
- Location: [package.json](../package.json)
- Problem: `compression` and the session store are used by `server/src/setAppDB.ts`. It only
  works because the SSR bundle inlines them; `npm ci --omit=dev` plus an API-only start
  would break.
- Fix: move them to `dependencies`.

**DEP-04: Imported but undeclared packages and types**

- Priority: medium
- Problem: `cors`, `body-parser` and `multer` resolve transitively. Missing type packages:
  `@types/multer`, `@types/cookie-parser`, `@types/compression`, `@types/passport-jwt`,
  `@types/passport-google-oauth20`, `@types/streamifier`.
- Fix: declare them.

**DEP-05: Unused packages**

- Priority: medium
- Problem: `class-transformer`, `deepmerge`, `fastify-static`, `saslprep`, `ts-loader`,
  `ts-node`, `@nestjs/serve-static` (only in commented code), and `whatwg-url` (only an
  `externalDependencies` entry and a Dockerfile `npm i`). (Later correction: `class-transformer`
  is required by `ValidationPipe`; see Status.)
- Fix: verify each with a build and remove it.

**DEP-06: Deprecated or abandoned packages**

- Priority: medium
- Problem:
  - `standard-version` (deprecated), replace with `release-please` or `commit-and-tag-version`;
  - `streamifier` (2014), replace with `Readable.from(buffer)`;
  - stylelint 15 and its configs;
  - `@angular/animations` / `provideAnimations()` (deprecated since v20.2).
- Fix: Step 5, proposing replacements.

**DEP-07: Exact `engines` pins**

- Priority: low
- Location: [package.json](../package.json)
- Problem: `node 24.4.1` / `npm 11.4.2` exact pins don't match the Docker image or local
  setups.
- Fix: ranges (`>=24.11 <25`), plus `.nvmrc`.

**DEP-08: Dockerfile installs the full dependency tree at runtime**

- Priority: low
- Location: [Dockerfile:6](../Dockerfile#L6), [Dockerfile:13](../Dockerfile#L13)
- Problem: `npm install` (not `npm ci`) in the build stage; `npm i whatwg-url` in the
  runtime stage installs everything, including devDependencies, and rewrites
  `package.json`.
- Fix: `npm ci` in the build stage; copy only `dist` (plus the real externals) into the
  runtime stage.

**DEP-09: Duplicate body parsing and a second database connection**

- Priority: low
- Location: [server/src/setAppDB.ts:13-14](../server/src/setAppDB.ts#L13-L14), [:24-26](../server/src/setAppDB.ts#L24-L26)
- Problem: `body-parser` on top of Nest's parser; a second database connection is opened
  for the session store.
- Fix: `app.useBodyParser`; reuse the app's connection for the session store (touches the DB
  wiring, so defer to the database migration).

**DEP-10: Material Icons / fonts loaded twice**

- Priority: low
- Location: [client/src/index.html](../client/src/index.html), [angular.json](../angular.json) (`material-icons.css` in styles)
- Fix: self-host one copy.

**DEP-11: `url.parse()` deprecation warning at startup (added 2026-10-15)**

- Priority: low
- Location: `passport-oauth2` 1.8.0 (via `passport-google-oauth20` 2.0.0), `lib/strategy.js`
- Problem: the Google strategy's constructor calls the legacy `url.parse()`, so Node prints
  `DEP0169` once at startup. The parsed URLs come from configuration (`authorizationURL`,
  `callbackURL`), not from requests, so it is noise rather than a vulnerability. Both packages are
  at their latest versions and unmaintained.
- Fix: none upstream. Replace them (e.g. with `openid-client`) if Google login is reworked.

## Performance

**PERF-01: Unbounded queries**

- Priority: medium
- Location: [server/src/orders/orders.service.ts](../server/src/orders/orders.service.ts) (`getAllOrders`), [server/src/products/products.service.ts](../server/src/products/products.service.ts) (`getAllProducts`, `getAllCategories`, `/search`, `deleteCategoryByName`)
- Problem: no pagination or projection. Category deletion loads every product and updates
  them one by one.
- Fix: pagination, `.lean()`, `.select()`, `updateMany({tags}, {$pull})`.

**PERF-02: No indexes**

- Priority: medium
- Problem: lookups on `titleUrl`, `email`, `orderId`, `_user`, `lang`, `tags`,
  `<lang>.visibility` and `<lang>.salePrice` are all collection scans.
- Fix: add them in the Postgres schema (schemas are frozen until then).

**PERF-03: Four queries per product-list request**

- Priority: medium
- Location: [server/src/shared/utils/paginate.ts:16-25](../server/src/shared/utils/paginate.ts#L16-L25)
- Problem: page, count, max price and min price; the price range ignores filters and
  visibility.
- Fix: one aggregation with `$facet`, or cache the price range.

**PERF-04: Session bloat**

- Priority: medium
- Location: [server/src/cart/utils/cart.ts](../server/src/cart/utils/cart.ts), [server/src/eshop/eshop.service.ts](../server/src/eshop/eshop.service.ts)
- Problem: full product documents and the config document are stored in every session
  and written on every request that touches them.
- Fix: store ids only (see BUG-06).

**PERF-05: JWT strategy loads the full user on every request**

- Priority: medium
- Location: [server/src/auth/strategy/jwt.strategy.ts:18-27](../server/src/auth/strategy/jwt.strategy.ts#L18-L27)
- Problem: no projection or `.lean()`; the password hash and salt end up in `req.user`.
- Fix: `.select('-password -salt').lean()`.

**PERF-06: New `CommonEngine` per SSR request**

- Priority: low
- Location: [server/src/app-universal.module.ts:18](../server/src/app-universal.module.ts#L18)
- Fix: one instance, or migrate to `AngularNodeAppEngine`.

**PERF-07: Large initial bundle, loose budgets**

- Priority: low
- Location: [angular.json](../angular.json) (budgets 2 MB / 5 MB), [client/src/styles](../client/src/styles) (`mat.all-component-themes`)
- Problem: initial JS + CSS is 1.12 MB raw / 240 kB transfer.
- Fix: theme only the components used; `@defer` the carousel and dashboard pieces; tighten
  budgets.

**PERF-08: One Observable subscription per translated string**

- Priority: low
- Location: [client/src/app/pipes/translate.pipe.ts](../client/src/app/pipes/translate.pipe.ts)
- Problem: about 245 `translate | async` usages.
- Fix: a signal-based, pure translate pipe.

**PERF-09: `@for` tracks by object identity**

- Priority: low
- Location: e.g. [client/src/app/modules/cart/cart/cart.component.html](../client/src/app/modules/cart/cart/cart.component.html), order lists, category edit
- Problem: whole lists re-render after each refetch.
- Fix: `track item._id` / `titleUrl`.

## UI

**UI-01: Click handlers on non-interactive elements**

- Priority: medium
- Location: `cart-show.component.html`, `cart.component.html`, `products-edit.component.html`, `product.component.html`, `order-detail.component.html`, `home.component.html`, `products.component.html`, `images-dialog.component.html`
- Problem: `(click)` on `div`, `span` or `img`, which can't be reached by keyboard and have
  no role.
- Fix: `<button type="button">` with `aria-label`.

**UI-02: Images without `alt`; no `NgOptimizedImage`**

- Priority: medium
- Location: all 8 `<img>` elements (e.g. `product.component.html`, `cart.component.html`, `order-info.component.html`)
- Problem: inaccessible; layout shift (CLS).
- Fix: meaningful `alt`; `ngSrc` with dimensions.

**UI-03: Nested interactive elements in the header menu**

- Priority: medium
- Location: [client/src/app/shared/components/header/header.component.html](../client/src/app/shared/components/header/header.component.html)
- Problem: `<a>` inside `<button mat-menu-item>`. The Google login only works when the
  text itself is clicked.
- Fix: `<a mat-menu-item href=…>`.

**UI-04: Form inputs without labels**

- Priority: medium
- Location: dashboard `theme-edit`, `config-edit`, `pages-edit`, `translations-edit`, `products-edit`
- Fix: `mat-label` / `aria-label`.

**UI-05: `<html lang>` is always `en`**

- Priority: low
- Location: [client/src/index.html](../client/src/index.html)
- Fix: set it from the active language (also during SSR).

**UI-06: Logo link has no accessible name; icon-only controls lack labels**

- Priority: low
- Location: `header.component.html`, `cart-show.component.html`
- Fix: `aria-label`.

**UI-07: Autoplaying looping video without a pause control**

- Priority: low
- Location: [client/src/app/components/home/home.component.html](../client/src/app/components/home/home.component.html)
- Fix: a pause control or `prefers-reduced-motion` handling (WCAG 2.2.2).

**UI-08: Admin theme preview leaks into the whole app**

- Priority: low
- Location: [client/src/app/modules/dashboard/theme-edit/theme-edit.component.ts](../client/src/app/modules/dashboard/theme-edit/theme-edit.component.ts)
- Problem: CSS variables are written on every form change and never reverted, and the
  subscription is never torn down.
- Fix: scope the preview; revert and unsubscribe on destroy.

**UI-09: Payment choice only reacts to clicks on the radio and label**

- Priority: low
- Location: [client/src/app/modules/cart/cart/cart.component.html](../client/src/app/modules/cart/cart/cart.component.html) (`mat-radio-button.payment-choice`)
- Problem: each payment option is styled as a large card, but clicking the card's padding does
  nothing. Only the radio circle and its text select the option. Found while writing e2e tests.
- Fix: make the whole card the label (or a clickable `mat-card` wrapping the radio).

**UI-10: Checkout stepper gets a boolean as `stepControl`**

- Priority: low
- Location: [client/src/app/modules/cart/cart/cart.component.html](../client/src/app/modules/cart/cart/cart.component.html) (`<mat-step [stepControl]="toggleCard">`)
- Problem: `stepControl` expects a form control. A boolean disables the step's built-in validity
  handling. Found by `strictTemplates`; kept as `$any(toggleCard)` for now.
- Fix: use a `FormControl` for the payment choice.

**UI-11: Carousel drag uses `movementX` on touch events**

- Priority: low
- Location: [client/src/app/shared/components/carousel/carousel.component.ts](../client/src/app/shared/components/carousel/carousel.component.ts) (`onDrag`)
- Problem: the handler is bound to `touchstart` / `touchend` / `touch`, but `movementX` only exists
  on mouse events. On touch devices the scroll offset becomes `NaN`. Found by `strictTemplates`.
- Fix: track touch positions (`touches[0].clientX`) separately.

## Tech debt

**TD-01: Broken npm scripts**

- Priority: medium
- Location: [package.json](../package.json)
- Problem:
  - `lint`: ESLint 9 has no flat config, the `apps/` glob doesn't exist, and it runs with
    `--fix`;
  - `dev:ssr`: the target doesn't exist;
  - `start:debug`: no root nest config;
  - `start:client:https`: missing certs;
  - `lint:scss`: the unquoted glob is expanded by the shell.
- Fix: repair or remove each one (Steps 4 and 6).

**TD-02: ESLint config is legacy and split**

- Priority: medium
- Location: [server/.eslintrc.json](../server/.eslintrc.json), [client/.eslintrc.json](../client/.eslintrc.json)
- Problem: ESLint 9 needs a flat config. The client lint has 158 errors (137
  `prefer-inject`, 21 `prefer-standalone`); `lint:scss` has 185 errors.
- Fix: a unified `eslint.config.mjs` plus Prettier, husky and lint-staged (Step 6).

**TD-03: Partial standalone migration**

- Priority: medium
- Location: `client/src/app/modules/*`
- Problem: 5 NgModules and 21 non-standalone components. `NotFoundComponent` is
  `standalone: false` but declared in no module. 43 `@Input` / 17 `@Output` decorators,
  19 constructor `@Inject`s.
- Fix: `ng g @angular/core:standalone`, then the signal input/output and `inject()`
  migrations (Step 5).

**TD-04: Deprecated Angular APIs**

- Priority: medium
- Location: [client/src/app/app.config.ts](../client/src/app/app.config.ts), [server/src/app-universal.module.ts](../server/src/app-universal.module.ts), [client/src/styles/index.scss](../client/src/styles/index.scss)
- Problem: `APP_INITIALIZER` + `.toPromise()`, class interceptors, `provideAnimations()`,
  `CommonEngine`, Sass `@import`.
- Fix: `provideAppInitializer` + `firstValueFrom`, functional interceptors,
  `AngularNodeAppEngine`, `@use`.

**TD-05: `.gitignore` blocked all YAML**

- Priority: medium
- Location: `.gitignore`
- Problem: `*.yml` ignored every YAML file in the repo (e.g. a future `docker-compose.yml`).
- Fix: **fixed in this step** (rule removed).

**TD-06: No environment validation; scattered `process.env`**

- Priority: medium
- Location: server-wide
- Problem: `ConfigModule.forRoot()` is repeated in 4 modules despite `isGlobal`, and
  `ConfigService` is never used.
- Fix: one validated config module (see SEC-13, BUG-11).

**TD-07: Dead code**

- Priority: low
- Location:
  - server: [server-express.ts](../server-express.ts); `getGoogleUser` in `auth.service.ts`; commented `ServeStaticModule` in `app.module.ts`; `SessionSerializer`; `User.cart` / `User.images`;
  - client: `getStripeSession` (store + `api.service.ts`); `countryLang`; `StripeCheckout` typing; the tinycolor palette in `theme.service.ts` (its CSS variables are unused); `browser-http-interceptor.ts`; unsubscribed `router.events` pipe in `app.component.ts`; the `extract-i18n` target.
- Fix: remove (behavior-neutral).

**TD-08: Console logging instead of a logger**

- Priority: low
- Location: `mailer.ts`, `main-ssr.ts`, `signal.store.ts`, `translations-edit`, `products-edit`, `product.component.ts`, `not-found.component.ts`, `home.component.ts`
- Fix: Nest `Logger` on the server; remove the client logs.

**TD-09: Duplicated list logic**

- Priority: low
- Location: [client/src/app/components/home/home.component.ts](../client/src/app/components/home/home.component.ts), [client/src/app/modules/product/products/products.component.ts](../client/src/app/modules/product/products/products.component.ts)
- Problem: about 120 near-identical lines.
- Fix: extract a shared component or service.

**TD-10: Unsubscribed long-lived subscriptions**

- Priority: low
- Location: `client/src/app/components/eshop/page/page.component.ts`, `order-detail.component.ts`, `header.component.ts`
- Fix: `takeUntilDestroyed()`.

**TD-11: Timing hacks**

- Priority: low
- Location: `app.component.ts`, `header.component.ts`, `sidebar.component.ts`, `home.component.ts`
- Problem: `of(...).pipe(delay())` used as `setTimeout`.
- Fix: `afterNextRender`, `debounceTime`.

**TD-12: Hardcoded business values**

- Priority: low
- Location: [server/src/shared/constans.ts](../server/src/shared/constans.ts), [server/src/shared/utils/email/](../server/src/shared/utils/email/)
- Problem: the `https://smrtic.eu` domain, a "©2020 … rgihts" footer, default shipping
  costs, and the misspelled filename `constans.ts`.
- Fix: move them to config or env.

**TD-13: Error handling hides root causes**

- Priority: low
- Location: [server/src/orders/orders.controller.ts](../server/src/orders/orders.controller.ts), service `catch {}` blocks
- Problem: errors are mapped to generic 4xx responses without logging.
- Fix: a global exception filter plus structured logging.

**TD-14: README out of date**

- Priority: low
- Location: [README.md](../README.md)
- Problem: references `npm run build` (doesn't exist).
- Fix: update the commands section to match CLAUDE.md.

**TD-15: Stale untracked build output**

- Priority: low
- Location: `server/dist/` (gitignored)
- Problem: contains an old TypeORM-era build.
- Fix: `rm -rf server/dist`; document `dist` as disposable.

---

## Suggested order

| When                                                   | Findings                                                                                                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hotfix now** (separate branch, needs approval)       | SEC-01, SEC-02 (contact + order floating promises), SEC-07 (`.dockerignore` / `COPY .env`)                                                        |
| Step 3 (tests)                                         | TST-01. Write tests that pin current behavior, plus regression tests documenting SEC-01, SEC-02 and BUG-04, marked as known failures until fixed. |
| Scripts and README                                     | TD-01, TD-14                                                                                                                                      |
| Step 5 (upgrades)                                      | SEC-08, DEP-01…DEP-10, TD-03, TD-04                                                                                                               |
| Step 6 (strictness / lint)                             | TYP-01…TYP-03, TD-02                                                                                                                              |
| Behavior-changing fixes (each its own approved branch) | Remaining SEC / BUG / UI / PERF items                                                                                                             |
| With the PostgreSQL migration (done 2026-10-15)        | Fixed: BUG-22, PERF-02, SEC-10, SEC-24. Partly: TYP-04, DEP-09, PERF-01, PERF-03. Now cheap: BUG-06, BUG-07, PERF-04                              |
| Needs a product decision                               | DEP-02 (PaymentIntents), BUG-06 (live prices in cart), BUG-07 (stock), BUG-13 (PWA yes/no), SEC-23 (cart API verbs)                               |
