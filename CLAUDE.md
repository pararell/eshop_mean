# CLAUDE.md

Guidance for AI agents and contributors working in this repository.
Deeper references: [docs/architecture.md](docs/architecture.md) (modules, data flow, schemas),
[docs/audit.md](docs/audit.md) (known issues, prioritized).

## What this is

eshop_mean is a multi-language (en / sk / cs) e-commerce app with an admin area:
- products, categories, pages, themes, shop config and translations;
- Stripe card payments or cash on delivery;
- Cloudinary image uploads, SendGrid emails;
- Google login and email/password login (JWT).

| Layer | Tech |
|---|---|
| Frontend | Angular 20.2 (zoneless, SSR + hydration), Angular Material (M2 theme), custom signal store |
| Backend | NestJS 11 on Express 5, Passport (JWT + Google OAuth 2.0) |
| Database | MongoDB via Mongoose 8.4 (plain `new Schema()`), sessions in MongoDB via `connect-mongo` |
| Tooling | One root `package.json`, Angular CLI (`@angular/build`), Nest CLI, Prettier, ESLint (partly broken), stylelint |
| Deploy | Docker image (`Dockerfile`), single Node process |

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
`externalDependencies` lists what stays external.

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
    modules/                    lazy NgModules: product, cart (checkout + Stripe), order, dashboard (admin)
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
  src/app.module.ts             feature modules + MongooseModule.forRoot
  src/app-ssr.module.ts, app-universal.module.ts   SSR integration
  src/<feature>/                auth, products, cart, orders, translations, admin, eshop
    <feature>.controller.ts / .service.ts / .module.ts
    schemas/                    Mongoose schemas (source of truth for data)
    models/                     TS interfaces (often out of sync with schemas)
    dto/                        class-validator DTOs (validation only where a pipe is applied)
  src/shared/                   constans.ts (languages, shipping defaults), utils (cart pricing, paginate, email)
docs/                           architecture.md, audit.md
Dockerfile                      2-stage build, runs `npm run start`
```

## Commands

Verified on Node 24.15 / npm 11.12 after `npm ci` (2026-10-14).

| Task | Command | Status |
|---|---|---|
| Install | `npm ci` | OK |
| Dev API (watch, :4000) | `npm run start:dev` | OK. Needs `MONGO_URI` etc. in `.env`. |
| Dev client (:3000) | `npm run start:client` | OK |
| Production build (client + SSR + bundled API) | `npm run build:ssr` (`build:client` is equivalent) | OK, about 10 s, many "not ESM" and Sass deprecation warnings |
| Run production build | `npm start` (= `node dist/eshop/server/server.mjs`) | OK. Needs `PORT` and the env vars. |
| Server-only compile check | `npx nest build -c server/nest-cli.json` | OK (output in `server/dist`, not used in prod) |
| Type-check | `npx tsc --noEmit -p client/tsconfig.app.json`, `npx tsc --noEmit -p server/tsconfig.json` | OK (non-strict) |
| Lint client | `npm run lint:client` (`ng lint`) | Runs; currently 158 errors (`prefer-inject`, `prefer-standalone`) |
| Lint server | `npm run lint` | **Broken.** ESLint 9 finds no flat config (`server/.eslintrc.json` is legacy), and the glob references a nonexistent `apps/`. **Note:** the script passes `--fix`. |
| Lint SCSS | `npm run lint:scss` | Runs; 185 errors. The unquoted glob is shell-expanded. |
| Format | `npm run format` | Server files only |
| Tests | none | **There are no tests and no test runner yet.** |
| Release | `npm run release` | standard-version (deprecated) |

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

| Variable | Used for | Read in |
|---|---|---|
| `PORT` | HTTP port (`.env.example`: 4000) | `server/src/main.ts`, `main-ssr.ts` |
| `MONGO_URI` | MongoDB connection (opened twice: Mongoose and the session store) | `app.module.ts`, `setAppDB.ts` |
| `ORIGIN` | CORS origin; OAuth redirect target | `setAppDB.ts`, `auth/auth.controller.ts` |
| `SERVER_URL` | Google OAuth callback base | `auth/strategy/google.strategy.ts` |
| `COOKIE_KEY` | express-session secret | `setAppDB.ts` |
| `JWT_SECRET`, `JWT_EXPIRATION` | JWT signing / expiry (e.g. `7d`) | `auth/auth.module.ts`, `auth/strategy/jwt.strategy.ts` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google login | `auth/strategy/google.strategy.ts` |
| `STRIPE_SECRETKEY` | Stripe charges (read at import time) | `orders/orders.service.ts` |
| `CLOUDINARY_NAME`, `CLOUDINARY_KEY`, `CLOUDINARY_SECRET` | Image upload (import time) | `admin/admin.service.ts` |
| `SENDGRID_KEY`, `EMAIL_FROM` | Transactional email (import time) | `shared/utils/email/mailer.ts` |
| `ADMIN_EMAILS` | Comma-separated list notified on orders/contact | `orders.service.ts`, `eshop.service.ts`, email templates |
| `RECAPTCHA_SERVER_KEY` | Contact-form captcha verification | `eshop/eshop.service.ts` |
| `GEO_LOCATION_API_KEY` | geolocation-db lookup for the default language | `translations/translations.controller.ts` |
| `FE_STRIPE_PUBLISHABLE_KEY`, `FE_TINYMCE_API_KEY`, `FE_RECAPTCHA_CLIENT_KEY`, `FE_ANALYTICS_TOKEN` | **Public.** Every env var whose name contains `FE_` is sent to the browser by `GET /api/eshop/config`. | `eshop/eshop.service.ts` |
| `STRIPE_PUBLISHABLE_KEY` | Listed in `.env.example` but unused | none |

## Code conventions

- **English only** for code, comments, commits and docs.
- **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, `test:` …). CHANGELOG.md is
  generated by standard-version.
- **One branch per step**, based on `master`. Never commit to `master` directly.
- Prettier: single quotes, trailing commas (`.prettierrc`); `.editorconfig` uses 2 spaces.
- Server:
  - controllers hardcode the `api/...` prefix (there is no global prefix);
  - the language comes from the `lang` **request header**;
  - DTOs use class-validator, but validation runs **only** where `ValidationPipe` is passed
    explicitly (there is no global pipe);
  - admin routes use `@UseGuards(AuthGuard('jwt'), RolesGuard)`.
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
  - templates use the new control flow (`@if` / `@for`);
  - translations use `{{ 'Key' | translate | async }}`;
  - guard browser-only APIs with `isPlatformBrowser` (SSR).

## Do not change without explicit approval

- **The database layer and Mongoose schemas** (`server/src/**/schemas/*`,
  `MongooseModule` wiring, `connect-mongo` session store). A PostgreSQL migration is
  planned. Until then, document; don't modify.
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
