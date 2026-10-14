# MongoDB → PostgreSQL migration plan

|          |                                                                                                                                                                                                    |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status   | **Proposal, for review.** No database code has been changed yet.                                                                                                                                   |
| Target   | PostgreSQL **18.6** on the production server (`172.105.94.117`), listening on `127.0.0.1:5432` only. Database `eshop`, user `eshop`; the password is in `/home/eshop/.env.postgres` on the server. |
| Source   | MongoDB via Mongoose 8.24; schemas are described in [architecture.md § Data model](architecture.md#5-data-model).                                                                                  |
| Data     | **Fresh start.** The current MongoDB holds only dummy data. Products, categories, orders, users and sessions are **not** copied. Only the UI translations are exported once as a seed file (§5).   |
| Baseline | `master` with strict TypeScript, 107 server/API tests and 18 e2e tests (see [testing.md](testing.md)).                                                                                             |

This document covers:

- the target schema (§3);
- how the current Mongoose models map to it (§4);
- the seed data (§5);
- the implementation phases (§6);
- local and test setup (§7);
- deployment (§8);
- the decisions that still need an owner (§9).

## 1. Goals and constraints

- **Same API.** API paths, request and response shapes (including `_id` fields), the `lang` header,
  the session-based cart, the `/jwtToken/:token` redirect and SSR all stay as they are. The existing
  API and e2e tests are the contract: they must pass unchanged against PostgreSQL.
- **No data migration.** The new database starts empty apart from the seed (§5). MongoDB is retired
  at the switch.
- **Known bugs are not fixed in passing.** Behavior stays identical unless a decision in §9 says
  otherwise. Audit IDs point to findings the new schema makes easy to fix _later_.
- **Database access:** the database is only reachable on the server's loopback interface.
  - The app container connects through `127.0.0.1` (host networking, as in the README's
    `docker run --network=host`).
  - People connect through an SSH tunnel: `ssh -L 15432:127.0.0.1:5432 root@172.105.94.117`.
  - Tests and local development never use the server database (§7).

## 2. What exists today (summary)

| Collection                   | Notes that matter for the new schema                                                                                                                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`                      | No unique index on `email`; `salt` is stored next to the bcrypt hash (redundant); `cart` and `images` are unused; `roles` is an untyped array.                                                                    |
| `products`                   | `titleUrl` acts as the key but is not unique. Per-language sub-documents (`en`/`sk`/`cs`) hold title, prices, stock, visibility and shipping. `tags[]` holds category `titleUrl`s by value; `stock` is free text. |
| `categories`                 | Same per-language pattern; created automatically from product tags.                                                                                                                                               |
| `orders`                     | `orderId` is not unique. `cart` is a full snapshot of the localized cart. `addresses[]` and `outcome` are Mixed types. Amounts are float major units. `_user` is optional.                                        |
| `translations`               | One document per language: `{ lang, keys: { … } }`. **The only data exported (§5).**                                                                                                                              |
| `pages`, `themes`, `configs` | Keyed by `titleUrl`. Pages and configs have per-language sub-documents. Several themes or configs may be `active`; the code picks any one of them.                                                                |
| `session`                    | connect-mongo: `{ _id: sid, expires, session: "<json>" }`. The JSON holds `cart` (product snapshots), `config` and `images`.                                                                                      |

**IDs in the API.** Every response exposes `_id`.

- The client treats IDs as opaque strings: product `_id`s are cart keys (`/api/cart/add?id=`), and
  `user.id` is sent as `userId` with orders.
- The JWT payload only holds `{ email }`.
- With no legacy data, new rows simply get UUIDs.

## 3. Target schema (PostgreSQL 18)

Design rules:

- **Keys:** `uuid` primary keys default to PG 18's native `uuidv7()`, which is time-ordered and so
  indexes well. The API exposes them as `_id` and `id`, as today.
- **Per-language content** goes into `*_translations` tables with a composite key `(parent_id, lang)`.
  `lang` is an enum, so adding a language becomes a migration plus data, not a schema redesign.
- **Constraints:** there's no legacy data to accommodate, so required fields are `NOT NULL`, slugs and
  emails are unique, and order status is an enum from the start.
- **Money:** `numeric(12,2)` in **major units**, so the API keeps returning the same numbers (D4).
- **Snapshots and free-form data** (order cart, addresses, theme styles, translation keys) stay
  `jsonb`. They are written once or read whole, and normalizing them would change API shapes.
- **Timestamps:** `created_at` replaces `dateAdded`, and `updated_at` is maintained by a trigger.
- **Names:** `snake_case` in SQL; the data-access code maps to the existing camelCase API fields.

```sql
CREATE TYPE lang_code    AS ENUM ('en', 'sk', 'cs');
CREATE TYPE order_status AS ENUM ('NEW', 'PAID', 'SHIPPING', 'COMPLETED', 'CANCELED');

-- Users ------------------------------------------------------------------------------------
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT uuidv7(),
  email         text NOT NULL,
  password_hash text,                      -- null for Google-only accounts
  name          text,
  google_id     text UNIQUE,
  roles         text[] NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_lower_uq ON users (lower(email));   -- see D5

-- Catalog ----------------------------------------------------------------------------------
CREATE TABLE categories (
  id               uuid PRIMARY KEY DEFAULT uuidv7(),
  title_url        text NOT NULL UNIQUE,
  main_image_url   text,
  main_image_name  text,
  main_image_cover boolean NOT NULL DEFAULT false,   -- Mongoose: mainImage.type
  sub_categories   text[] NOT NULL DEFAULT '{}',
  created_by       uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE category_translations (
  category_id uuid NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  lang        lang_code NOT NULL,
  title       text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  position    integer,
  visibility  boolean NOT NULL DEFAULT false,
  menu_hidden boolean NOT NULL DEFAULT false,
  PRIMARY KEY (category_id, lang)
);

CREATE TABLE products (
  id              uuid PRIMARY KEY DEFAULT uuidv7(),
  title_url       text NOT NULL UNIQUE,
  main_image_url  text,
  main_image_name text,
  images          text[] NOT NULL DEFAULT '{}',
  tags            text[] NOT NULL DEFAULT '{}',      -- category title_urls, by value (see D6)
  created_by      uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_tags_gin ON products USING gin (tags);
CREATE INDEX products_created_at ON products (created_at DESC);

CREATE TABLE product_translations (
  product_id       uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  lang             lang_code NOT NULL,
  title            text NOT NULL DEFAULT '',
  description      text NOT NULL DEFAULT '',
  description_full text[] NOT NULL DEFAULT '{}',    -- HTML fragments
  regular_price    numeric(12,2),
  sale_price       numeric(12,2),
  on_sale          boolean NOT NULL DEFAULT false,
  stock            text,                             -- free text today (see D7)
  visibility       boolean NOT NULL DEFAULT false,
  shipping         text NOT NULL DEFAULT 'basic',
  PRIMARY KEY (product_id, lang)
);
-- listing: visible products of a language, sorted by price
CREATE INDEX product_translations_listing ON product_translations (lang, visibility, sale_price);

-- Orders -----------------------------------------------------------------------------------
CREATE TABLE orders (
  id              uuid PRIMARY KEY DEFAULT uuidv7(),
  order_number    text NOT NULL UNIQUE,              -- API: orderId ('order<ms>t<rand>')
  user_id         uuid REFERENCES users (id) ON DELETE SET NULL,
  customer_email  text NOT NULL,
  status          order_status NOT NULL DEFAULT 'NEW',
  type            text,                              -- PAYMENT_ON_DELIVERY | WITH_PAYMENT
  currency        char(3) NOT NULL,
  amount          numeric(12,2) NOT NULL,
  amount_refunded numeric(12,2),
  notes           text,
  card_id         text,                              -- Stripe charge id
  seller_message  text,                              -- API: outcome.seller_message
  description     text,
  cart            jsonb NOT NULL,                    -- localized cart snapshot, as today
  addresses       jsonb NOT NULL DEFAULT '[]',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_user_created ON orders (user_id, created_at DESC);
CREATE INDEX orders_created ON orders (created_at DESC);

-- Shop content -----------------------------------------------------------------------------
CREATE TABLE translations (
  lang       lang_code PRIMARY KEY,
  keys       jsonb NOT NULL DEFAULT '{}',            -- { "Key": "Text" }
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pages (
  id         uuid PRIMARY KEY DEFAULT uuidv7(),
  title_url  text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE page_translations (
  page_id      uuid NOT NULL REFERENCES pages (id) ON DELETE CASCADE,
  lang         lang_code NOT NULL,
  title        text NOT NULL DEFAULT '',
  content_html text NOT NULL DEFAULT '',
  PRIMARY KEY (page_id, lang)
);

CREATE TABLE themes (
  id         uuid PRIMARY KEY DEFAULT uuidv7(),
  title_url  text NOT NULL UNIQUE,
  active     boolean NOT NULL DEFAULT false,
  styles     jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- CREATE UNIQUE INDEX themes_one_active ON themes (active) WHERE active;   -- see D8

CREATE TABLE configs (
  id         uuid PRIMARY KEY DEFAULT uuidv7(),
  title_url  text NOT NULL UNIQUE,
  active     boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE config_shipping (
  config_id      uuid NOT NULL REFERENCES configs (id) ON DELETE CASCADE,
  lang           lang_code NOT NULL,
  basic_cost     numeric(12,2),
  basic_limit    numeric(12,2),
  extended_cost  numeric(12,2),
  extended_limit numeric(12,2),
  PRIMARY KEY (config_id, lang)
);

-- Sessions (connect-pg-simple's standard table) --------------------------------------------
CREATE TABLE session (
  sid    varchar PRIMARY KEY,
  sess   json NOT NULL,
  expire timestamptz NOT NULL
);
CREATE INDEX session_expire ON session (expire);
```

Extras:

- `pg_trgm` is optional, only if search should stay fast with a substring match (see §4.2).
- A shared `set_updated_at()` trigger is attached to every table that has `updated_at`.

The DDL lives in versioned migration files generated by the chosen toolkit (D1), not in this
document. The block above is the review copy.

## 4. Mapping (reference for porting the services)

### 4.1 Mongoose field → column

| Mongoose                                                    | PostgreSQL                              | Notes for the data-access code                                                                        |
| ----------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `_id`                                                       | `id` (`uuidv7`)                         | exposed to the API as `_id` (and `id` where the API returns `id`)                                     |
| `users.password` + `salt`                                   | `password_hash`                         | bcrypt hashes embed the salt; login switches to `bcrypt.compare` (D9)                                 |
| `users.email` / `googleId` / `name` / `roles`               | same (snake_case)                       | `roles` is `text[]`                                                                                   |
| `users.cart`, `users.images`                                | —                                       | unused, not created                                                                                   |
| `products.mainImage.{url,name}`                             | `main_image_url`, `main_image_name`     | rebuild `mainImage` in responses                                                                      |
| `products.<lang>.*`                                         | `product_translations` row per language | rebuild the `en/sk/cs` sub-objects for the raw (admin) shape; flatten one row for localized responses |
| `products._user`, `categories._user`                        | `created_by`                            |                                                                                                       |
| `categories.mainImage.type`                                 | `main_image_cover`                      |                                                                                                       |
| `orders.orderId`                                            | `order_number`                          | API field name stays `orderId`                                                                        |
| `orders._user`                                              | `user_id`                               | API field name stays `_user`                                                                          |
| `orders.outcome.seller_message`                             | `seller_message`                        | rebuild `outcome` in responses                                                                        |
| `orders.cart`, `orders.addresses`                           | `jsonb`                                 | stored as sent                                                                                        |
| `configs.<lang>.shippingCost.{basic,extended}.{cost,limit}` | `config_shipping` row per language      | rebuild `shippingCost`                                                                                |
| `dateAdded`                                                 | `created_at`                            | API field name stays `dateAdded`                                                                      |
| `session`                                                   | `session` (connect-pg-simple)           | starts empty                                                                                          |

### 4.2 Queries that need care

| Today (Mongo)                                                       | PostgreSQL equivalent                                                                                | Parity notes                                                                                                                          |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `paginate()`: find + count + max/min `<lang>.salePrice` (4 queries) | one query with `count(*) OVER ()` plus a min/max query over `product_translations` for that language | Keep today's quirk: min/max ignore visibility and filters (audit PERF-03).                                                            |
| `titleUrl: new RegExp(search, 'i')`                                 | `title_url ILIKE '%' \|\| escape(search) \|\| '%'`                                                   | The user's string becomes a literal substring match instead of a regex. That's a deliberate difference which also fixes audit SEC-10. |
| `tags: new RegExp(category, 'i')`                                   | `EXISTS (SELECT 1 FROM unnest(tags) t WHERE t ILIKE …)`                                              | Same literal-substring rule.                                                                                                          |
| `sort('-<lang>.salePrice')` and similar                             | `JOIN product_translations pt ON pt.lang = $lang … ORDER BY pt.sale_price`                           | Mongo puts missing values last when sorting descending; Postgres needs explicit `NULLS LAST` / `NULLS FIRST` to match.                |
| `findOneAndUpdate(…, { upsert: true })` (product, category edit)    | `INSERT … ON CONFLICT (title_url) DO UPDATE` inside a transaction with the translation rows          | Today's bug that returns 404 after an insert (BUG-08) is kept unless fixed separately.                                                |
| `updateOne(body, { upsert })` on page, theme and config             | same pattern                                                                                         | Keep the API response shape; the admin client ignores it since BUG-28 was fixed.                                                      |
| `removeCategoryFromProducts` (load all, update one by one)          | `UPDATE products SET tags = array_remove(tags, $1) WHERE $1 = ANY(tags)`                             | Same result in a single statement (audit PERF-01).                                                                                    |
| Duplicate-key check `error.code === '23505'`                        | It's the right Postgres code now                                                                     | Signup's duplicate check works at the database level (audit BUG-22).                                                                  |
| `findOne({ email })` for login and JWT                              | `WHERE lower(email) = lower($1)`                                                                     | See D5.                                                                                                                               |

## 5. Seed data

`npm run db:seed` is idempotent: it uses `INSERT … ON CONFLICT DO NOTHING`, so it's safe to rerun.
It creates:

- **an admin user** from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, with roles `['admin']`;
- **the UI translations** (`en`, `sk`, `cs`) from `server/seed/translations.json`;
- **a default shop config**, active, using the built-in shipping costs from
  `server/src/shared/constans.ts` (`shippingCost`);
- **a default theme**, active, with neutral styles. You adjust it in the dashboard.

**Translations export:**

- a one-off, read-only script `npm run db:export-translations -- --mongo $MONGO_URI` writes the
  current MongoDB `translations` collection to `server/seed/translations.json`, sorted by key so
  diffs stay readable;
- the file is committed and from then on is the source of the seed;
- nothing else is taken from MongoDB.

**Demo data (development and e2e only):** `npm run db:seed:demo` adds a few products and
categories from the fixtures in `e2e/support/fixtures.mjs`. It never runs in production.

## 6. Implementation phases

Everything happens on one feature branch, ported module by module. Each commit keeps the full API
and e2e suites green. There's no dual-backend phase, because nothing runs on both databases at
once in production.

| Phase                  | What                                                                                                                                                                                                                                                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1: Foundation**     | Add the ORM and migration tooling (D1); `DATABASE_URL` config validated at startup; the initial migration (§3); the disposable PostgreSQL 18 for tests (§7), replacing mongodb-memory-server in `server/test/setup/*` and `e2e/support/start-server.mjs`; a `docker-compose.yml` for development; and the seed (§5). |
| **P2: Port modules**   | Replace the Mongoose models in the existing services (`server/src/**/*.service.ts`) with SQL queries, in this order: users/auth → catalog (products, categories) → cart and `connect-pg-simple` sessions → orders → content (translations, pages, themes, configs). No repository abstraction layer is needed.       |
| **P3: Remove MongoDB** | Remove Mongoose, connect-mongo, the `schemas/` folders and `MONGO_URI`. In `angular.json` `externalDependencies`, replace `mongoose` with `pg` (§6.1). In the Dockerfile `runtime-deps` stage, install `pg` instead of mongoose. Update the docs and end CLAUDE.md's frozen-schema rule.                             |
| **P4: Deploy**         | §8.                                                                                                                                                                                                                                                                                                                  |

After P3, the deferred audit items become cheap to fix:

- BUG-06: cart prices from the database;
- BUG-07: numeric stock;
- PERF-02: indexes, mostly covered by §3 already.

### 6.1 Build and runtime

- **Driver:** `pg` (node-postgres) with a pool of about 10 connections.
  - `numeric` comes back as a string by default; register a type parser (`1700 → parseFloat`) so
    the API keeps returning numbers.
  - `pg` has an optional `require('pg-native')`. Mark `pg` as an external dependency, exactly like
    `mongoose` today, and install it in the Docker `runtime-deps` stage.
- **Configuration:** `DATABASE_URL=postgres://eshop:<password>@127.0.0.1:5432/eshop`. No TLS is
  needed on loopback.
- **Migrations:** applied by a one-off command (`npm run db:migrate`) before the new container starts,
  never automatically on app boot.

## 7. Tests and local development

- **Disposable PostgreSQL 18 only.** Tests and local development never use the server database.
  - Server/API tests replace mongodb-memory-server with a disposable PostgreSQL 18 (D10).
  - Migrations run once per test run, and each test file gets its own database (as today).
- **E2E:** `e2e/support/start-server.mjs` starts the same disposable PostgreSQL 18, runs migrations,
  `db:seed` and `db:seed:demo`.
- **Local development:** a `docker-compose.yml` with `postgres:18` on a non-default port (15432,
  which also leaves 5432 free for the SSH tunnel).

## 8. Deployment

On the server:

1. Apply migrations to the empty `eshop` database: `npm run db:migrate` (through the SSH tunnel or
   from the new image with `DATABASE_URL` set).
2. Seed: `npm run db:seed` with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
3. Deploy the new image with `DATABASE_URL` (instead of `MONGO_URI`). Keep the previous image tag
   around.
4. Smoke test:
   - browse `/en` and `/sk`;
   - log in as admin and create a product;
   - add it to the cart;
   - place a cash-on-delivery order, then cancel it in the dashboard.
5. Stop and remove the MongoDB container. A final `mongodump` is optional, since the data is dummy.

**Ongoing:** a nightly `pg_dump` of `eshop` to off-server storage, starting the day real products are
entered.

**Rollback:** redeploy the previous image tag. It still points at MongoDB with its dummy data. Data
entered in PostgreSQL stays there for the next attempt.

## 9. Open decisions

| #   | Decision                           | Recommendation                                                                                                                                                                                  | Alternatives                                                                                                                                                                                                                                                                                                                |
| --- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | ORM / query layer                  | **Drizzle ORM + drizzle-kit.** It's SQL-first, fully typed from the schema, generates plain SQL migrations, has no engine binary, and bundles cleanly with esbuild into the single SSR process. | **Prisma 7** is mature with a great migrations workflow, but its schema DSL is a second source of truth and its client is heavier to bundle. **TypeORM** fits Nest's decorator style (the earlier SQLite experiment used it), but it has weaker typing and a known maintenance history. **Kysely** is a query builder only. |
| D4  | Money representation               | **`numeric(12,2)` in major units** (API parity). Move to integer minor units together with the Stripe PaymentIntents work (DEP-02). With no data to convert, switching earlier is cheap too.    | Integer cents now; the pricing code and tests change in the same PR.                                                                                                                                                                                                                                                        |
| D5  | Email uniqueness / case            | **Unique on `lower(email)`, and look up case-insensitively.** Today `A@x.com` and `a@x.com` can be two accounts.                                                                                | Exact-case unique, which keeps today's behavior.                                                                                                                                                                                                                                                                            |
| D6  | Product ↔ category link            | **Keep `tags text[]` by value** (parity, GIN-indexed).                                                                                                                                          | A `product_categories` join table with foreign keys. Cleaner, but deleting or renaming categories then needs a rule.                                                                                                                                                                                                        |
| D7  | Stock                              | **Keep free text** during the migration. With no data to convert, a numeric quantity is cheap to add together with a stock-decrement feature (BUG-07).                                          | Integer quantity plus status now.                                                                                                                                                                                                                                                                                           |
| D8  | Exactly one active theme or config | **Enforce with a partial unique index.** Saving one would then deactivate the others in the same transaction, which is a small behavior change.                                                 | Keep today's "any active one".                                                                                                                                                                                                                                                                                              |
| D9  | `salt` column                      | **Not created.** Login uses `bcrypt.compare` (audit SEC-24); there are no old hashes to stay compatible with.                                                                                   | —                                                                                                                                                                                                                                                                                                                           |
| D10 | Disposable Postgres for tests      | **`@testcontainers/postgresql`**, the real `postgres:18` image in Docker, which is already required for the image build.                                                                        | `embedded-postgres` (no Docker, downloads binaries); `pg-mem` (in-memory emulation, not faithful enough for this).                                                                                                                                                                                                          |

D2 (ID format), D3 (sessions) and D11 (rollback window) from the earlier draft are resolved by the
fresh start: new UUIDs, empty sessions, and a plain image rollback.

## 10. Effort (rough)

| Phase                                                                           | Estimate          |
| ------------------------------------------------------------------------------- | ----------------- |
| P1 Foundation (ORM, migrations, test infrastructure, seed, translations export) | 1–2 days          |
| P2 Port modules                                                                 | 3–4 days          |
| P3 Remove MongoDB                                                               | half a day        |
| P4 Deploy and smoke test                                                        | a couple of hours |
