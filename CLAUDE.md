# CLAUDE.md

Guidance for AI agents and contributors working in this repository.
Deeper references: [docs/architecture.md](docs/architecture.md) (modules, data flow, schemas),
[docs/audit.md](docs/audit.md) (known issues, prioritized), [docs/testing.md](docs/testing.md) (how to run and write tests), [docs/postgres-migration.md](docs/postgres-migration.md) (how the database was migrated; runbook for schema changes and deploys), [docs/ai.md](docs/ai.md) (AI product drafts), [docs/adr/](docs/adr/) (architecture decisions).

Before finishing any change: `npm run typecheck && npm run lint && npm test`, plus `npm run test:e2e` for anything
touching the client, SSR or checkout. Tests never call real external services (AI providers included: unit tests mock
`fetch`, API and e2e tests use local stubs); keep it that way.

## What this is

eshop_mean is a multi-language (en / sk / cs) e-commerce app with an admin area:

- products, categories, pages, themes, shop config and translations;
- Stripe card payments or cash on delivery;
- Cloudinary image uploads, SendGrid emails;
- Google login and email/password login (JWT).

| Layer    | Tech                                                                                                                                                                                                           |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend | Angular 22.2 (zoneless, SSR + hydration), Angular Material (M2 theme), custom signal store                                                                                                                     |
| Backend  | NestJS 12 on Express 5, Passport (JWT + Google OAuth 2.0)                                                                                                                                                      |
| Database | PostgreSQL 18 via Drizzle ORM (`server/src/db/`), sessions in PostgreSQL via `connect-pg-simple`                                                                                                               |
| Tooling  | One root `package.json`, TypeScript 6.0 **strict** (+ Angular `strictTemplates`), Angular CLI (`@angular/build`), Nest CLI, ESLint flat config (`eslint.config.mjs`), Prettier, stylelint, husky + lint-staged |
| Deploy   | Docker image (`Dockerfile`, ~175 MB, non-root, tini), single Node process                                                                                                                                      |

## Runtime topology (important)

**Production is ONE Node process** serving both the API and the SSR'd Angular app:

```
npm start → node dist/eshop/server/server.mjs
  server-ssr.ts                       (Angular SSR entry, see angular.json "ssr.entry")
    └─ server/src/main-ssr.ts         boots Nest AppSSRModule on $PORT
         ├─ setAppDB(app)             compression, body-parser, cookies, CORS, express-session, passport
         ├─ AppModule                 all /api/* controllers
         └─ AngularUniversalModule    express.static(browser) + catch-all GET → Angular CommonEngine
```

The Nest server code is **bundled by the Angular build** (esbuild). `angular.json`
`externalDependencies` lists what stays external. `pg` must stay external (it has an optional
`require('pg-native')`).
SSR only renders for allowed hosts (`CommonEngine` SSRF protection): the hostnames of `ORIGIN` and
`SERVER_URL` plus localhost (see `server/src/app-universal.module.ts`).

**Development is two processes:**

- API: Nest on `:4000` via `server/src/main.ts` (`npm run start:dev`).
- Client: `ng serve` on `:3000` (`npm run start:client`). It calls the API at
  `environment.apiUrl = http://localhost:4000`, and CORS allows `ORIGIN`.

Root files:

- `server-ssr.ts`: used.
- `server-express.ts`: **dead** (stock Angular SSR server, referenced nowhere).

## Folder structure

```
client/                         Angular app (angular.json sourceRoot: client/src)
  src/app/
    app.config.ts               root providers (zoneless, router, http, hydration, initializers)
    app.config.server.ts        SSR providers
    app.routes.ts               routes generated per language prefix: /en|sk|cs/...
    components/                 standalone routed components (home, auth, eshop pages, not-found)
    modules/                    lazy feature areas (each has routes.ts): product, cart (checkout + Stripe), order, dashboard (admin)
    modules/dashboard/product-editor/   admin product editor (+ AI assistant, image gallery); admin-products/ is the product table
    shared/components/          standalone presentational components (header, footer, product list, ...)
    shared/models.ts            client-side interfaces
    shared/constants.ts         languages, currency per language, sort options
    services/                   ApiService (all HTTP), guards, translate, theme, env config, recaptcha, ...
    store/                      signal.store.ts (actions) + signal.store.selectors.ts (signals + computed)
    pipes/                      translate (async), price
  src/styles/                   global SCSS + Material theme
  src/environments/             apiUrl per environment
  ngsw-config.json              service worker config (currently not built or registered)
server/                         NestJS app (server/nest-cli.json, server/tsconfig.json)
  src/main.ts                   dev / API-only bootstrap
  src/main-ssr.ts               production bootstrap (API + SSR)
  src/setAppDB.ts               shared Express middleware + session store
  src/app.module.ts             feature modules + DatabaseModule (global Drizzle `DRIZZLE` / `PG_POOL`)
  src/app-ssr.module.ts, app-universal.module.ts   SSR integration
  src/<feature>/                auth, products, cart, orders, translations, admin, eshop, ai (product drafts, docs/ai.md)
    <feature>.controller.ts / .service.ts / .module.ts
    models/                     API document types (aliases of the mappers in src/db/mappers.ts)
    dto/                        class-validator DTOs (validation only where a pipe is applied)
  src/shared/                   constans.ts (languages, shipping defaults), utils (cart pricing, email)
shared/types/index.d.ts         API/data types shared by client and server (`import type ... from '@eshop/shared'`)
docs/                           architecture.md, audit.md, testing.md, ai.md, postgres-migration.md, adr/ (decision records)
e2e/                            Playwright specs + seeded test server (support/start-server.mjs) + AI/Cloudinary stub (support/ai-stub.mjs)
server/test/                    API specs, DB specs, Jest setup, mocks (unit specs live next to code: src/**/*.spec.ts)
server/src/db/                  PostgreSQL: Drizzle schema (source of truth for data), DatabaseModule, mappers
                                (row ↔ API document shape), catalog queries, migrate, seed
server/db/migrations/           generated SQL migrations (npm run db:generate; never edit by hand)
server/scripts/                 db:migrate, db:seed
Dockerfile                      build stage + runtime with only dist/ and pg; `node dist/eshop/server/server.mjs`
```

## Commands

Verified on Node 24.15 / npm 11.12 (2026-10-14). Angular 22 requires Node `^24.15.0`; Docker uses `node:24.21-alpine3.24`.

| Task                                          | Command                                                                                                                            | Status                                                                                                                                                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Install                                       | `npm ci`                                                                                                                           | OK                                                                                                                                                                                                |
| Dev API (watch, :4000)                        | `npm run start:dev`                                                                                                                | OK. Needs `DATABASE_URL` etc. in `.env` (`npm run db:up` + `db:migrate` + `db:seed` for a local database).                                                                                        |
| Dev client (:3000)                            | `npm run start:client`                                                                                                             | OK                                                                                                                                                                                                |
| Production build (client + SSR + bundled API) | `npm run build:ssr` (`build:client` is equivalent)                                                                                 | OK, about 10 s, many "not ESM" and Sass deprecation warnings                                                                                                                                      |
| Run production build                          | `npm start` (= `node dist/eshop/server/server.mjs`)                                                                                | OK. Needs `PORT` and the env vars.                                                                                                                                                                |
| Server-only compile check                     | `npx nest build -c server/nest-cli.json`                                                                                           | OK (output in `server/dist`, not used in prod)                                                                                                                                                    |
| Type-check                                    | `npm run typecheck` (client, server, server tests, e2e)                                                                            | OK, `strict: true` everywhere, 0 errors                                                                                                                                                           |
| Lint                                          | `npm run lint` (whole repo; `lint:fix` to autofix; `lint:client` = `ng lint`, same config)                                         | 0 errors; 23 warnings = components still on `Eager` change detection (OnPush suggestion), see audit TD-03                                                                                         |
| Lint SCSS                                     | `npm run lint:scss`                                                                                                                | Runs (stylelint 17, SCSS syntax); 306 errors in older files (new files are clean). The unquoted glob is shell-expanded.                                                                           |
| Format                                        | `npm run format` / `npm run format:check` (Prettier, whole repo)                                                                   | Existing code is not yet reformatted (~140 files); new commits are formatted by the hook                                                                                                          |
| Pre-commit hook                               | husky → `lint-staged` (`.husky/pre-commit`)                                                                                        | Runs `eslint --fix` + `prettier --write` on staged files; lint errors block the commit ; with nvm + a GUI git client (GitHub Desktop), add `~/.config/husky/init.sh` that sources `~/.nvm/nvm.sh` |
| Server tests (unit + API, DB)                 | `npm test` / `npm run test:server` (`:watch`, `:cov`)                                                                              | 219 passing; **needs Docker** (disposable `postgres:18` via Testcontainers, one database per test file), ~10 s                                                                                    |
| E2E tests                                     | `npm run test:e2e` (builds first; `npx playwright install chromium` once)                                                          | 21 passing against the production build (AI provider and Cloudinary stubbed)                                                                                                                      |
| PostgreSQL (dev)                              | `npm run db:up` (docker-compose `postgres:18` on `localhost:15432`), `db:migrate`, `db:seed`, `db:generate` (after schema changes) | Scripts read `DATABASE_URL` from the environment only, never from `.env`                                                                                                                          |
| Release                                       | `npm run release`                                                                                                                  | standard-version (deprecated)                                                                                                                                                                     |

Broken or unused scripts (do not rely on them):

- `dev:ssr`: the `serve-ssr` target doesn't exist.
- `start:debug`: no root nest config.
- `start:client:https`: needs `localhost.key` / `localhost.crt`, which are not in the repo; `certificate.config` can generate them.
- `start:server` / `build:server` + `start:prod` (API only, without SSR) are not used by
  Docker or production.

## Environment variables

Copy `.env.example` → `.env` (gitignored, never commit it). It is read with
`ConfigModule.forRoot()` / dotenv, from the working directory. All server code reads raw
`process.env`; there is no validation.

| Variable                                                                                           | Used for                                                                                                                                                   | Read in                                                               |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `PORT`                                                                                             | HTTP port (`.env.example`: 4000)                                                                                                                           | `server/src/main.ts`, `main-ssr.ts`                                   |
| `DATABASE_URL`                                                                                     | PostgreSQL connection: app data and the session store (one pool)                                                                                           | `server/src/db/database.module.ts`, `setAppDB.ts`, `server/scripts/*` |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`                                                          | Admin created by `npm run db:seed` if missing                                                                                                              | `server/scripts/db-seed.ts`                                           |
| `ORIGIN`                                                                                           | CORS origin; OAuth redirect target; SSR allowed host                                                                                                       | `setAppDB.ts`, `auth/auth.controller.ts`, `app-universal.module.ts`   |
| `SERVER_URL`                                                                                       | Google OAuth callback base; SSR allowed host                                                                                                               | `auth/strategy/google.strategy.ts`, `app-universal.module.ts`         |
| `NG_ALLOWED_HOSTS`                                                                                 | Optional comma-separated SSR host allow-list; overrides the derived list                                                                                   | Angular `CommonEngine`                                                |
| `COOKIE_KEY`                                                                                       | express-session secret                                                                                                                                     | `setAppDB.ts`                                                         |
| `JWT_SECRET`, `JWT_EXPIRATION`                                                                     | JWT signing / expiry (e.g. `7d`)                                                                                                                           | `auth/auth.module.ts`, `auth/strategy/jwt.strategy.ts`                |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                                                         | Google login                                                                                                                                               | `auth/strategy/google.strategy.ts`                                    |
| `STRIPE_SECRETKEY`                                                                                 | Stripe charges (read at import time)                                                                                                                       | `orders/orders.service.ts`                                            |
| `CLOUDINARY_NAME`, `CLOUDINARY_KEY`, `CLOUDINARY_SECRET`                                           | Image upload (import time)                                                                                                                                 | `admin/admin.service.ts`                                              |
| `SENDGRID_KEY`, `EMAIL_FROM`                                                                       | Transactional email (import time)                                                                                                                          | `shared/utils/email/mailer.ts`                                        |
| `ADMIN_EMAILS`                                                                                     | Comma-separated list notified on orders/contact                                                                                                            | `orders.service.ts`, `eshop.service.ts`, email templates              |
| `RECAPTCHA_SERVER_KEY`                                                                             | Contact-form captcha verification                                                                                                                          | `eshop/eshop.service.ts`                                              |
| `GEO_LOCATION_API_KEY`                                                                             | geolocation-db lookup for the default language                                                                                                             | `translations/translations.controller.ts`                             |
| `DB_MIGRATE_ON_START`                                                                              | `false` turns off migrations at startup (pending ones are then only logged)                                                                                | `db/startup.ts`                                                       |
| `TRUST_PROXY`                                                                                      | Express "trust proxy" for a reverse proxy in front of the app (e.g. `1`): real client IP for rate limits, HTTPS detection for the `Secure` session cookie  | `setAppDB.ts`                                                         |
| `RATE_LIMIT_PER_MINUTE`                                                                            | Per-IP limit on sign-in, sign-up, contact and order endpoints (default 10 per endpoint)                                                                    | `shared/rate-limit/rate-limit.ts`                                     |
| `AI_PROVIDER`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`                                               | AI product drafts; **off without the key**. Server-side only (never `FE_`). Limits, model and prices: `AI_*`, see [docs/ai.md](docs/ai.md) § Configuration | `ai/ai.config.ts`                                                     |
| `FE_STRIPE_PUBLISHABLE_KEY`, `FE_TINYMCE_API_KEY`, `FE_RECAPTCHA_CLIENT_KEY`, `FE_ANALYTICS_TOKEN` | **Public.** Every env var whose name contains `FE_` is sent to the browser by `GET /api/eshop/config`.                                                     | `eshop/eshop.service.ts`                                              |

## Database

- PostgreSQL 18 through Drizzle ORM. `server/src/db/schema.ts` is the source of truth;
  `DatabaseModule` provides `@Inject(DRIZZLE) db: Database` (global) and `PG_POOL` (shared with the
  session store).
- Services query with Drizzle directly (no repository layer). Rows become API documents through
  `server/src/db/mappers.ts`; shared catalog queries are in `server/src/db/catalog.ts`.
- **Schema change:** edit `schema.ts` → `npm run db:generate` → review the new SQL in
  `server/db/migrations/` (never edit an applied migration) → update mappers and tests.
- **Migrations run at container startup** (`server/src/db/startup.ts`, advisory lock; Watchtower deploys
  automatically). Therefore every migration must be **expand/contract**: only add tables, nullable or
  defaulted columns, indexes, enum values; never drop, rename or retype what the previous image uses.
  Removals take two releases. Full runbook: [docs/postgres-migration.md § Runbook](docs/postgres-migration.md#8-runbook).
- The production database listens on the server's loopback only; reach it through an SSH tunnel.
  Its `DATABASE_URL` lives in a local, gitignored `.env.server`: load it with
  `set -a; . ./.env.server; set +a`, never print it, never commit it. Tests and local development
  never touch it.

## Code conventions

- **English only** for code, comments, commits and docs.
- **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, `test:` …). CHANGELOG.md is
  generated by standard-version.
- **One branch per step**, based on `master`. Never commit to `master` directly.
- Prettier: single quotes, 150 columns (`.prettierrc`); `.editorconfig` uses 2 spaces.
- **Types:** strict mode is on. Use the shared API types from `@eshop/shared` (`import type` only; the
  file is `.d.ts`). No `any` (lint error outside tests). Use `!` only where the code already relies on
  a value being present; otherwise handle `null`/`undefined`. Known shape mismatches in the client
  store are marked with `keepAsIs()` (audit BUG-28). Currency is always derived on the server
  (`currencyForLang`), never taken from the request.
- Server:
  - controllers hardcode the `api/...` prefix (there is no global prefix);
  - the language comes from the `lang` **request header**;
  - DTOs use class-validator, but validation runs **only** where `ValidationPipe` is passed
    explicitly (there is no global pipe);
  - admin routes use `@UseGuards(AuthGuard('jwt'), RolesGuard)`;
  - endpoints that send email, charge cards or check passwords get `@RateLimited()`;
  - security headers come from helmet in `setAppDB.ts`; the CSP is report-only until verified, so a new
    third-party script, frame or API needs adding there;
  - AI output is untrusted: validate it with DTOs, sanitize HTML, never persist it without the admin
    and never let it set prices or stock (see `server/src/ai/draft-mapper.ts`).
- Data:
  - translatable content is stored as per-language sub-documents keyed `en` / `sk` / `cs`
    (generated from `languages` in `server/src/shared/constans.ts`, a misspelled filename
    kept on purpose);
  - entities are addressed by `titleUrl` (slug), orders by `orderId`.
- **The cart lives in the server session** (`session.cart`), not in the DB or the client.
  Totals and shipping are computed server-side in `server/src/shared/utils/prepareUtils.ts`.
- Client:
  - all HTTP goes through `services/api.service.ts`;
  - state lives in the signal store (`store/`);
  - everything is standalone (no NgModules); lazy areas export `Routes` from `routes.ts`;
  - DI uses `inject()`; components use signal `input()` / `output()` / `viewChild()`. Change
    detection is still explicitly `Eager` in 23 components (OnPush needs a per-component review);
    new components use OnPush + signals (see `modules/dashboard/product-editor/`);
  - templates use the new control flow (`@if` / `@for`);
  - the language comes from the URL prefix (`/en|/sk|/cs`, see `languageGuard` and
    `utils/language-url.ts`); only `/` falls back to the `eshop_lang` cookie. Link with the prefix;
  - translations use `{{ 'Key' | translate | async }}`;
  - guard browser-only APIs with `isPlatformBrowser` (SSR).

## Do not change without explicit approval

- **The database schema and migrations** (`server/src/db/schema.ts`, `server/db/migrations/`),
  the `DatabaseModule` wiring and the `connect-pg-simple` session store. Schema changes go through
  `npm run db:generate` and need approval. The mappers in `server/src/db/mappers.ts` define the API
  document shapes; keep them identical.
- **The production database:** read-only checks only; migrations, seeds and any writes need
  explicit approval each time.
- **The public API contract**: paths, methods, request/response shapes, the `lang` header,
  the session-based cart, and the `/jwtToken/:token` OAuth redirect. The client and
  existing deployments depend on them.
- **The single-process SSR wiring** (`server-ssr.ts` → `main-ssr.ts` →
  `AngularUniversalModule`) and `angular.json` `ssr` / `externalDependencies`.
- **Application behavior in general.** Refactors, upgrades and tooling changes must keep
  behavior identical unless the current step explicitly says otherwise. Behavior-changing
  fixes from `docs/audit.md` go in their own approved branches.
- **Secrets:** never commit `.env*` (except `.env.example`), keys or certificates. Never
  print secret values in logs, docs or commit messages.
