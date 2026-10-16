# MongoDB → PostgreSQL migration (done)

|          |                                                                                                                                                       |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status   | **Done, in production since 2026-10-15.** MongoDB code, packages and `MONGO_URI` are removed (`master`, commits `6ad1aa3` … `7e24524`).               |
| Database | PostgreSQL **18.6** on the production server, listening on `127.0.0.1:5432` only. Database `eshop`, user `eshop`; the password is kept on the server. |
| Data     | **Fresh start.** MongoDB held only dummy data, so nothing was copied. The production database was created with `db:migrate` + `db:seed` (§5).         |
| Schema   | Source of truth: [server/src/db/schema.ts](../server/src/db/schema.ts) (Drizzle). Generated SQL: [server/db/migrations/](../server/db/migrations/).   |

This document records how the migration was done and the decisions behind the schema, and it is the
runbook for schema changes and for rebuilding a database (§8). For the current data model see
[architecture.md § Data model](architecture.md#5-data-model).

## 1. Goals and constraints (kept)

- **Same API.** API paths, request and response shapes (including `_id` fields), the `lang` header,
  the session-based cart, the `/jwtToken/:token` redirect and SSR stayed as they were. The API and
  e2e tests were the contract and passed against PostgreSQL with only the shim changes noted in §6.
- **No data migration.** The new database started empty apart from the seed (§5).
- **Known bugs were not fixed in passing.** Audit IDs below point to findings the new schema makes
  easy to fix _later_.
- **Database access:** only on the server's loopback interface.
  - The app container connects through `127.0.0.1` (host networking, as in the README's
    `docker run --network=host`).
  - People connect through an SSH tunnel, e.g. `ssh -L 5432:127.0.0.1:5432 root@<server>`.
  - Tests and local development never use the server database (§7).

## 2. What MongoDB had (historical)

| Collection                   | What mattered for the new schema                                                                                                                                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`                      | No unique index on `email`; `salt` stored next to the bcrypt hash (redundant); `cart` and `images` unused.                                                                          |
| `products`                   | `titleUrl` acted as the key but was not unique. Per-language sub-documents (`en`/`sk`/`cs`) held title, prices, stock, visibility and shipping. `tags[]` held category `titleUrl`s. |
| `categories`                 | Same per-language pattern; created automatically from product tags.                                                                                                                 |
| `orders`                     | `orderId` not unique. `cart` a full snapshot of the localized cart. `addresses[]` and `outcome` Mixed types. Amounts in float major units.                                          |
| `translations`               | One document per language: `{ lang, keys: { … } }`.                                                                                                                                 |
| `pages`, `themes`, `configs` | Keyed by `titleUrl`. Pages and configs had per-language sub-documents. Several themes or configs could be `active`; the code picked any one.                                        |
| `session`                    | connect-mongo: `{ _id: sid, expires, session: "<json>" }`.                                                                                                                          |

## 3. Schema design rules

- **Keys:** `uuid` primary keys default to PG 18's native `uuidv7()` (time-ordered, indexes well). The
  API exposes them as `_id`, as before.
- **Per-language content** lives in `*_translations` tables (`product_translations`,
  `category_translations`, `page_translations`, `config_shipping`) with a composite key
  `(parent_id, lang)`. `lang` is the `lang_code` enum, so adding a language is a migration plus data.
- **Constraints:** required fields are `NOT NULL`; slugs (`title_url`), `order_number` and
  `lower(email)` are unique; order status is the `order_status` enum; at most one active theme and one
  active config (partial unique indexes `themes_one_active`, `configs_one_active`, D8).
- **Money:** `numeric(12,2)` in **major units**, read as JS numbers (Drizzle `mode: 'number'`), so the
  API returns the same numbers (D4).
- **Snapshots and free-form data** (order cart, addresses, theme styles, translation keys) are
  `jsonb`: written once or read whole; normalizing them would change API shapes.
- **Timestamps:** `created_at` replaces `dateAdded`; `updated_at` is set by Drizzle's `$onUpdate`
  (writes outside the app must set it themselves).
- **Names:** `snake_case` in SQL; [server/src/db/mappers.ts](../server/src/db/mappers.ts) maps rows to
  the camelCase API documents.
- **Sessions:** connect-pg-simple's standard `session` table (`sid`, `sess`, `expire`), created by the
  migrations (the store never creates it).

## 4. Mapping (reference)

### 4.1 Mongoose field → column

| Mongoose                                                    | PostgreSQL                              | Notes                                                                                     |
| ----------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------- |
| `_id`                                                       | `id` (`uuidv7`)                         | exposed to the API as `_id`                                                               |
| `users.password` + `salt`                                   | `password_hash`                         | bcrypt hashes embed the salt; login uses `bcrypt.compare` (D9)                            |
| `users.email` / `googleId` / `name` / `roles`               | same (snake_case)                       | `roles` is `text[]`                                                                       |
| `users.cart`, `users.images`                                | —                                       | unused, not created                                                                       |
| `products.mainImage.{url,name}`                             | `main_image_url`, `main_image_name`     | `mainImage` rebuilt in responses                                                          |
| `products.<lang>.*`                                         | `product_translations` row per language | `en/sk/cs` sub-objects rebuilt; a missing language is `{ descriptionFull: [] }` as before |
| `products._user`, `categories._user`                        | `created_by`                            |                                                                                           |
| `categories.mainImage.type`                                 | `main_image_cover`                      |                                                                                           |
| `orders.orderId`                                            | `order_number`                          | API field name stays `orderId`                                                            |
| `orders._user`                                              | `user_id`                               | API field name stays `_user`                                                              |
| `orders.outcome.seller_message`                             | `seller_message`                        | `outcome` rebuilt in responses                                                            |
| `orders.cart`, `orders.addresses`                           | `jsonb`                                 | stored as sent                                                                            |
| `configs.<lang>.shippingCost.{basic,extended}.{cost,limit}` | `config_shipping` row per language      | `shippingCost` rebuilt                                                                    |
| `dateAdded`                                                 | `created_at`                            | API field name stays `dateAdded`                                                          |

### 4.2 Queries that needed care

| Mongo                                                               | PostgreSQL                                                                         | Parity notes                                                                  |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `paginate()`: find + count + max/min `<lang>.salePrice` (4 queries) | one query with `count(*) OVER ()` plus a min/max query over `product_translations` | The quirk is kept: min/max ignore visibility and filters (audit PERF-03).     |
| `titleUrl: new RegExp(search, 'i')`                                 | `title_url ILIKE '%' \|\| escape(search) \|\| '%'`                                 | A literal substring match instead of a regex; deliberate, fixes audit SEC-10. |
| `tags: new RegExp(category, 'i')`                                   | `EXISTS (SELECT 1 FROM unnest(tags) t WHERE t ILIKE …)`                            | Same literal-substring rule.                                                  |
| `sort('-<lang>.salePrice')` and similar                             | `JOIN product_translations … ORDER BY sale_price NULLS FIRST/LAST`                 | Explicit `NULLS` ordering matches Mongo's.                                    |
| `findOneAndUpdate(…, { upsert: true })` (product, category edit)    | select + update/insert + translation upserts in one transaction                    | BUG-08 (404 after an insert) is kept.                                         |
| `updateOne(body, { upsert })` on page, theme and config             | same pattern                                                                       | The response is still the former `updateOne()` result object.                 |
| `removeCategoryFromProducts` (load all, update one by one)          | `UPDATE products SET tags = array_remove(tags, $1) WHERE $1 = ANY(tags)`           | One statement (audit PERF-01).                                                |
| Duplicate-key check                                                 | Postgres `23505` (from `error.cause.code`)                                         | Signup's duplicate check works at the database level (audit BUG-22).          |
| `findOne({ email })` for login and JWT                              | `WHERE lower(email) = lower($1)`                                                   | D5.                                                                           |

## 5. Seed data

`npm run db:seed` is idempotent (`INSERT … ON CONFLICT DO NOTHING`), safe to rerun, and never
overwrites what was edited in the dashboard. It creates what is missing:

- **an admin user** from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (skipped when they are unset);
- **the UI languages** (`en`, `sk`, `cs`), empty unless `server/seed/translations.json` exists
  (`{ "en": { "Key": "Text" }, "sk": {…}, "cs": {…} }`);
- **a default shop config**, active, with the built-in shipping costs from
  `server/src/shared/constans.ts` (`shippingCost`), if there is no config at all;
- **a default theme**, active, with empty (built-in) styles, if there is no theme at all.

Translations are filled in the dashboard's translations editor.

## 6. How it was done

| Phase                  | What                                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1: Foundation**     | Drizzle schema and generated migration, `DatabaseModule`, migrate/seed scripts, `docker-compose.yml`, Testcontainers `postgres:18` for tests.                                               |
| **P2: Port modules**   | All services, the translations controller and the session store (`connect-pg-simple`) moved to PostgreSQL in one pass; API tests and e2e seeding moved too.                                 |
| **P3: Remove MongoDB** | Mongoose, connect-mongo, `@nestjs/mongoose`, mongodb-memory-server, the `schemas/` folders and `MONGO_URI` removed. `pg` is the only runtime dependency of the Docker image (186 → 175 MB). |
| **P4: Deploy**         | `db:migrate` + `db:seed` on the empty production database through an SSH tunnel, new image deployed with `DATABASE_URL`, smoke tested, MongoDB stopped.                                     |

What the port does to keep the API identical:

- `server/src/db/mappers.ts` rebuilds the MongoDB-era documents and casts input the way Mongoose did
  (numeric strings → numbers, `''` → null, a single string → array, objects rejected for string
  fields, which the order endpoints answer with 422).
- Known bugs are kept on purpose: BUG-08 (an upsert that inserts answers 404), BUG-02 (capture before
  save), the not-awaited category creation after adding a product.
- The API tests seed and read data through a small Mongoose-like shim
  ([server/test/utils/test-models.ts](../server/test/utils/test-models.ts)) built on the same mappers.
- Behavior changes from the decisions in §9: e-mails are unique case-insensitively (D5); activating
  a theme or config deactivates the others (D8); products created through the API get `dateAdded`
  (`created_at`) set to now, where MongoDB left it empty.

Audit items that are now cheap to fix: BUG-06 (cart prices from the database), BUG-07 (numeric
stock).

## 7. Tests and local development

- **Disposable PostgreSQL 18 only.** Tests and local development never use the server database.
  - Server/API tests: one `postgres:18` container per run (Testcontainers); migrations are applied
    once to a template database and each test file gets its own clone.
  - E2E: `e2e/support/start-server.mjs` starts its own `postgres:18`, runs the migrations and inserts
    its fixture data (`e2e/support/fixtures.mjs`) with plain SQL.
- **Local development:** `npm run db:up` starts `postgres:18` from `docker-compose.yml` on
  `localhost:15432` (5432 stays free for the SSH tunnel), then `db:migrate` and `db:seed` with
  `DATABASE_URL=postgres://eshop:eshop@localhost:15432/eshop`.

## 8. Runbook

The `db:*` scripts read `DATABASE_URL` from the environment only, never from `.env`. For the server
database, keep it in a local, gitignored `.env.server` (`.env.*` is ignored) and load it into the
shell without printing it:

```sh
ssh -L 5432:127.0.0.1:5432 root@<server>      # in another terminal
set -a; . ./.env.server; set +a
```

**Schema change** (one branch per change):

1. Edit `server/src/db/schema.ts`.
2. `npm run db:generate` → review the new SQL file in `server/db/migrations/` (never edit applied
   migrations; generate a new one instead).
3. Update the mappers / queries and tests; `npm test` applies all migrations to a fresh database.
4. Deploy: the new image applies pending migrations **itself at startup** (since 2026-10-16,
   because Watchtower deploys automatically): `server/src/db/startup.ts` runs them before the app
   is created, under a Postgres advisory lock, and the process exits if they fail. The log shows
   `Applied N migration(s) …` or `Database schema is up to date`.

**Migrations must be expand/contract (backward compatible).** Watchtower stops the old container
before it starts the new one, and a rollback means running the previous image against the migrated
schema. So a migration may only:

- add tables, add columns that are nullable or have a default, add indexes, add enum values;
- never drop, rename or change the type of something the previous image uses, never make a column
  `NOT NULL` without a default, never rewrite data the old code reads.

Removals happen in two releases: first stop using the column (release N), then drop it in a later
migration (release N+1). A failing migration means downtime until a fixed image is deployed, since
the old container is already stopped: keep migrations small, and `npm test` runs them all on a fresh
database. `DB_MIGRATE_ON_START=false` turns this off (pending migrations are then only logged) for
running them manually with `npm run db:migrate`.

**New database** (e.g. a new server): create the database and user, then `npm run db:migrate` and
`npm run db:seed` (with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`), then deploy the image with
`DATABASE_URL=postgres://eshop:<password>@127.0.0.1:5432/eshop`.

**Backups:** a nightly `pg_dump` of `eshop` to off-server storage is needed now that the data is real.

**Rollback of a deploy:** redeploy the previous image tag; thanks to expand/contract it works with
the newer schema. Migrations are not rolled back. Images from before 2026-10-15 still expect MongoDB
and can't be used any more.

## 9. Decisions

| #   | Decision                           | Taken                                                                                                                                  |
| --- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | ORM / query layer                  | **Drizzle ORM + drizzle-kit**: SQL-first, typed from the schema, plain SQL migrations, no engine binary, bundles cleanly with esbuild. |
| D2  | ID format                          | New `uuidv7()` ids (no legacy data).                                                                                                   |
| D3  | Sessions                           | Started empty in PostgreSQL (connect-pg-simple).                                                                                       |
| D4  | Money representation               | **`numeric(12,2)` in major units** (API parity). Integer minor units can come with the Stripe PaymentIntents work (DEP-02).            |
| D5  | Email uniqueness / case            | **Unique on `lower(email)`**, looked up case-insensitively.                                                                            |
| D6  | Product ↔ category link            | **`tags text[]` by value** (parity, GIN-indexed).                                                                                      |
| D7  | Stock                              | **Free text** for now; a numeric quantity can come with a stock-decrement feature (BUG-07).                                            |
| D8  | Exactly one active theme or config | **Partial unique index**; saving an active one deactivates the others in the same transaction.                                         |
| D9  | `salt` column                      | **Not created.** Login uses `bcrypt.compare` (audit SEC-24).                                                                           |
| D10 | Disposable Postgres for tests      | **`@testcontainers/postgresql`** with the real `postgres:18` image.                                                                    |
