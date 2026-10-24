# Database

|          |                                                                                                                                                       |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine   | PostgreSQL **18** through [Drizzle ORM](https://orm.drizzle.team). Production listens on the server's `127.0.0.1:5432` only (SSH tunnel to reach it). |
| Schema   | Source of truth: [server/src/db/schema.ts](../server/src/db/schema.ts). Generated SQL: [server/db/migrations/](../server/db/migrations/).             |
| Sessions | The `session` table of connect-pg-simple, in the same database.                                                                                       |

How the schema is designed, how to seed and run a database, and the runbook for schema changes
and deploys (§4). For the data model itself see [architecture.md § Data model](architecture.md#5-data-model).

## 1. Schema design rules

- **Keys:** `uuid` primary keys default to PG 18's native `uuidv7()` (time-ordered, indexes well). The
  API exposes them as `_id`.
- **Per-language content** lives in `*_translations` tables (`product_translations`,
  `category_translations`, `page_translations`, `config_shipping`) with a composite key
  `(parent_id, lang)`. `lang` is the `lang_code` enum, so adding a language is a migration plus data.
- **Constraints:** required fields are `NOT NULL`; slugs (`title_url`), `order_number` and
  `lower(email)` are unique; order status is the `order_status` enum; at most one active theme and one
  active config (partial unique indexes `themes_one_active`, `configs_one_active`, D8).
- **Money:** `numeric(12,2)` in **major units**, read as JS numbers (Drizzle `mode: 'number'`), so the
  API returns plain numbers (D4).
- **Snapshots and free-form data** (order cart, addresses, theme styles, translation keys) are
  `jsonb`: written once or read whole; normalizing them would change API shapes.
- **Timestamps:** `created_at` replaces `dateAdded`; `updated_at` is set by Drizzle's `$onUpdate`
  (writes outside the app must set it themselves).
- **Names:** `snake_case` in SQL; [server/src/db/mappers.ts](../server/src/db/mappers.ts) maps rows to
  the camelCase API documents.
- **Sessions:** connect-pg-simple's standard `session` table (`sid`, `sess`, `expire`), created by the
  migrations (the store never creates it).

## 2. Seed data

`npm run db:seed` is idempotent (`INSERT … ON CONFLICT DO NOTHING`), safe to rerun, and never
overwrites what was edited in the dashboard. It creates what is missing:

- **an admin user** from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (skipped when they are unset);
- **the UI languages** (`en`, `sk`, `cs`), empty unless `server/seed/translations.json` exists
  (`{ "en": { "Key": "Text" }, "sk": {…}, "cs": {…} }`);
- **a default shop config**, active, with the built-in shipping costs from
  `server/src/shared/constans.ts` (`shippingCost`), if there is no config at all;
- **a default theme**, active, with empty (built-in) styles, if there is no theme at all.

Translations are filled in the dashboard's translations editor.

## 3. Tests and local development

- **Disposable PostgreSQL 18 only.** Tests and local development never use the server database.
  - Server/API tests: one `postgres:18` container per run (Testcontainers); migrations are applied
    once to a template database and each test file gets its own clone.
  - E2E: `e2e/support/start-server.mjs` starts its own `postgres:18`, runs the migrations and inserts
    its fixture data (`e2e/support/fixtures.mjs`) with plain SQL.
- **Local development:** `npm run db:up` starts `postgres:18` from `docker-compose.yml` on
  `localhost:15432` (5432 stays free for the SSH tunnel), then `db:migrate` and `db:seed` with
  `DATABASE_URL=postgres://eshop:eshop@localhost:15432/eshop`.

## 4. Runbook

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
the newer schema. Migrations are not rolled back. Images from before 2026-10-15 (the switch to PostgreSQL) can't be
used any more.

## 5. Decisions

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
