<div align="center">

# eshop_mean

**Full-stack e-commerce with an AI-assisted admin.**<br>
Angular SSR storefront, NestJS API, PostgreSQL and Stripe. A product photo and a few words become a
complete product in every shop language.

<a href="https://eshop.privatelibrary.eu"><img alt="Live demo" src="https://img.shields.io/badge/Live_demo-eshop.privatelibrary.eu-111111?style=for-the-badge"></a>

![Version](https://img.shields.io/github/package-json/v/pararell/eshop_mean)
![License](https://img.shields.io/github/license/pararell/eshop_mean)
![Angular](https://img.shields.io/badge/Angular-22-dd0031?logo=angular&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-12-e0234e?logo=nestjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169e1?logo=postgresql&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-24-5fa04e?logo=nodedotjs&logoColor=white)

</div>

<p align="center">
  <a href="https://eshop.privatelibrary.eu">
    <img src="docs/images/storefront.webp" alt="Storefront home page: a full-width photo of hikers on a mountain ridge with the headline “Gear for every trail” and the category menu above it" width="100%">
  </a>
</p>

## Contents

[Features](#features) · [AI in the admin](#ai-in-the-admin) · [Screenshots](#screenshots) ·
[Tech stack](#tech-stack) · [Architecture](#architecture) · [Quick start](#quick-start) ·
[Configuration](#configuration) · [Docker](#docker) · [Documentation](#documentation)

## Features

| Storefront                                                 | Admin                                                            |
| ---------------------------------------------------------- | ---------------------------------------------------------------- |
| Server-side rendering for a fast first load and SEO        | Products, categories, pages, themes, shop settings, translations |
| Meta tags and schema.org product data                      | **AI product drafts** from a photo and a few words               |
| English, Slovak and Czech, with the language in the URL    | Orders: status, full or partial card refunds                     |
| Categories, product gallery with zoom, sale prices, search | Image upload to Cloudinary                                       |
| Cart and checkout: card (Stripe) or cash on delivery       | Order and contact-form notifications by email (Resend)           |
| Email or Google login, order history                       | Shipping costs and price limits per language                     |
| Light and dark mode, themes from CSS variables             | Theme editor: colors, logo, home photo or video                  |
| Contact form protected by reCAPTCHA                        | Admin-only routes (JWT + roles)                                  |

## AI in the admin

<p align="center">
  <img src="docs/images/ai-demo.gif" alt="Admin product editor: a jacket photo is uploaded, “men's winter jacket, black, down, L-XXL” is typed, Fill with AI fills the title, descriptions and SEO texts in English, Slovak and Czech" width="760">
</p>

The admin drops a product photo and writes a short note. The AI fills the title, descriptions,
attributes and SEO texts **in every shop language**. Filled fields stay marked until the admin has
reviewed them. Price and stock are always entered by a person, and nothing is saved automatically.

- **Provider-agnostic:** one `LlmProvider` interface; DeepSeek (default), Gemini and Claude are
  implemented and chosen with `AI_PROVIDER`.
- **Structured output:** the model must return JSON matching the product schema. It can only pick
  existing categories; new ones come back as suggestions.
- **Untrusted output:** validated with class-validator DTOs, HTML sanitized, never able to set
  prices or stock.
- **Cost tracking:** tokens, duration and estimated cost of every call are logged in `ai_usage`.
  A typical draft costs a fraction of a cent.
- **Optional:** without an API key the feature is hidden.

Details in [docs/ai.md](docs/ai.md).

## Screenshots

Shown in your GitHub theme (light or dark).

| Category                                                                                                                                                                                                                                                       | Product                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/category-dark.webp"><img src="docs/images/category.webp" alt="Category page “Tents”: category list, sorting and price filter on the left, two tent products on the right"></picture> | <picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/product-dark.webp"><img src="docs/images/product.webp" alt="Product detail of an MSR tent: large photo, title, description, sale price and Add to cart button"></picture> |

<details>
<summary><b>More screenshots</b>: cart, phone, admin</summary>
<br>

**Cart and one-page checkout**

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/cart-dark.webp">
  <img src="docs/images/cart.webp" alt="Shopping cart: address form and payment method on the left, order summary with one tent and the total on the right">
</picture>

**Phone**

<img src="docs/images/mobile-home.webp" alt="Home page on a phone: compact header with menu, search, language, account and cart icons over the hero photo" width="300">

**Admin: product table**

<img src="docs/images/admin-products.webp" alt="Admin dashboard with tabs for products, categories, pages, theme, config and translations; a searchable product table">

**Admin: AI-filled fields, marked until reviewed**

<img src="docs/images/ai-filled.webp" alt="Product editor after Fill with AI: title and short description filled and marked with an AI badge, language tabs EN, SK and CS each showing 5 AI fields">

</details>

## Tech stack

| Layer    | Technology                                                                        |
| -------- | --------------------------------------------------------------------------------- |
| Frontend | Angular 22: SSR with hydration, zoneless, signals, Angular Material               |
| Backend  | NestJS 12 on Express 5, Passport (JWT, Google OAuth 2.0)                          |
| Database | PostgreSQL 18, Drizzle ORM, SQL migrations applied at startup                     |
| Services | Stripe (Payment Element, webhooks, refunds), Cloudinary, Resend, Google reCAPTCHA |
| AI       | DeepSeek, Gemini or Claude through a common provider interface                    |
| Testing  | Jest + Supertest against a disposable PostgreSQL (Testcontainers), Playwright e2e |
| Ops      | One Docker image (multi-stage, non-root), automatic deploys                       |

## Architecture

```mermaid
flowchart TB
    B[Browser] -->|HTTPS| X[Reverse proxy, TLS]
    X --> E

    subgraph N[One Node.js process]
        direction LR
        E[Express] --> SSR[Angular SSR pages]
        E --> API[NestJS API /api/*]
    end

    API --> P[(PostgreSQL 18<br/>data + sessions)]
    API <-->|payments, webhooks| S[Stripe]
    API --> C[Cloudinary<br/>images]
    API --> R[Resend<br/>email]
    API --> L[AI provider<br/>DeepSeek, Gemini, Claude]
    API --> G[Google<br/>OAuth, reCAPTCHA]
```

One Node.js process serves both the server-rendered Angular app and the NestJS API, so the whole
shop ships as a single Docker image. Database migrations run when the container starts. More in
[docs/architecture.md](docs/architecture.md).

## Quick start

Requirements: Node.js 24.15 or newer, Docker (local database and tests).

```bash
npm ci

# Local PostgreSQL 18 on localhost:15432 (docker-compose.yml)
npm run db:up

# Configuration: set DATABASE_URL=postgres://eshop:eshop@localhost:15432/eshop
# and the keys you need
cp .env.example .env

# Schema and first admin (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
export DATABASE_URL=postgres://eshop:eshop@localhost:15432/eshop
npm run db:migrate
npm run db:seed

# Development: API on :4000 and client on :3000, in two terminals
npm run start:dev
npm run start:client
```

Production build (one process, needs `PORT` and the variables from `.env`):

```bash
npm run build:ssr
npm start
```

Checks:

| Command                              | What it runs                                                  |
| ------------------------------------ | ------------------------------------------------------------- |
| `npm run typecheck` / `npm run lint` | TypeScript (strict) and ESLint for client, server and tests   |
| `npm test`                           | Server unit and API tests; needs Docker for the test database |
| `npm run test:e2e`                   | Builds, then Playwright against the production build          |
| `npm run docs:media`                 | Regenerates the screenshots and the GIF in this README        |

External services are never called in tests: AI, Cloudinary, Stripe and email go to local stubs.

## Configuration

Every variable is listed in [`.env.example`](.env.example). The main groups:

| Group                     | Variables                                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Server                    | `PORT`, `SERVER_URL`, `ORIGIN`, `JWT_SECRET`, `JWT_EXPIRATION`, `COOKIE_KEY`                                               |
| Database                  | `DATABASE_URL`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`                                                                  |
| Payments                  | `STRIPE_SECRETKEY`, `STRIPE_WEBHOOK_SECRET`, `FE_STRIPE_PUBLISHABLE_KEY`                                                   |
| Images and email          | `CLOUDINARY_NAME`, `CLOUDINARY_KEY`, `CLOUDINARY_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAILS`                   |
| Login and spam protection | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RECAPTCHA_SERVER_KEY`, `FE_RECAPTCHA_CLIENT_KEY`                              |
| AI (optional)             | `AI_PROVIDER` (`deepseek`, `gemini` or `anthropic`), `AI_MODEL`, `DEEPSEEK_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY` |

Secrets stay on the server. Only variables whose name contains `FE_` are sent to the browser.

## Docker

```bash
docker pull pararel/eshop-mean:latest
docker run --env-file .env --network=host pararel/eshop-mean:latest
```

Build the image yourself (the version comes from `package.json`, the commit and date from build
arguments, since the image has no `.git`):

```bash
docker buildx build --platform linux/amd64 \
  --build-arg GIT_SHA=$(git rev-parse --short HEAD) \
  --build-arg BUILD_DATE=$(date -u +%F) \
  -t pararel/eshop-mean:1.0.0 -t pararel/eshop-mean:latest --push .
```

**Which version is running?** The browser console prints it on every page load
(`Eshop v1.0.0 · a1b2c3d · 2026-10-24`), the admin dashboard shows it at the bottom, and the API
answers it:

```bash
curl https://eshop.privatelibrary.eu/api/version
# {"version":"1.0.0","sha":"a1b2c3d","buildDate":"2026-10-24"}
```

Example with Docker Compose, the database reachable only on localhost:

```yaml
services:
  postgres:
    image: postgres:18
    env_file: .env.postgres
    volumes:
      - pgdata:/var/lib/postgresql
    ports:
      - '127.0.0.1:5432:5432'

  eshop:
    image: pararel/eshop-mean:latest
    network_mode: host
    env_file: .env
    depends_on:
      - postgres

volumes:
  pgdata:
```

The container applies pending database migrations at startup. They are always backward compatible,
so automatic deploys (for example with Watchtower) and rollbacks to the previous image are safe.

## Documentation

| Document                             | About                                                         |
| ------------------------------------ | ------------------------------------------------------------- |
| [Architecture](docs/architecture.md) | Modules, data flow, data model                                |
| [Database](docs/database.md)         | Schema rules, seeding, runbook for schema changes and deploys |
| [AI product drafts](docs/ai.md)      | Providers, prompts, validation, costs                         |
| [Payments](docs/payments.md)         | Stripe Payment Element, webhooks, refunds                     |
| [Testing](docs/testing.md)           | How to run and write tests                                    |
| [Audit](docs/audit.md)               | Known issues, prioritized                                     |
| [Decision records](docs/adr/)        | Architecture decisions                                        |
| [Changelog](CHANGELOG.md)            | Release history                                               |

## License

[MIT](LICENSE)
