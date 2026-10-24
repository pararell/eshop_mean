# eshop_mean

**Full-stack e-commerce platform with an AI-assisted admin.** Angular SSR storefront, NestJS API,
PostgreSQL, Stripe payments, and product entry where a photo and a few words become a complete
product in every shop language.

**[Live demo → eshop.privatelibrary.eu](https://eshop.privatelibrary.eu)**

![GitHub package.json version](https://img.shields.io/github/package-json/v/pararell/eshop_mean)
![License](https://img.shields.io/github/license/pararell/eshop_mean)
![GitHub Repo stars](https://img.shields.io/github/stars/pararell/eshop_mean?style=social)

![Storefront](docs/images/storefront.png)

## Features

**Storefront**

- Server-side rendering for fast first load and SEO (meta tags, schema.org)
- Multi-language: English, Slovak, Czech
- Categories, product detail with gallery, sale prices, search
- Cart and checkout: card payment (Stripe) or cash on delivery
- Customer accounts with email or Google login, order history
- Themes driven by CSS variables, light and dark mode

**Admin**

- Products, categories, orders, pages, themes and shop configuration
- **AI product drafts**: upload a photo, write a few words, review, set price and stock, save
- Order and contact notifications by email

## AI in admin

![Fill with AI: photo, a few words, texts in every language](docs/images/ai-demo.gif)

The admin drops a product photo and writes a short note (for example *"men's winter jacket, black,
down, L–XXL"*). The AI fills title, descriptions, attributes and SEO texts **in every shop language**.
AI-filled fields stay marked until the admin reviews them. Price and stock are always entered by a
person, and nothing is saved automatically.

| Product table                                    | AI-filled fields, marked until reviewed              |
| ------------------------------------------------ | ---------------------------------------------------- |
| ![Product table](docs/images/admin-products.png) | ![AI-filled product form](docs/images/ai-filled.png) |

How it works:

- **Provider-agnostic**: an `LlmProvider` abstraction with interchangeable providers (DeepSeek,
  Gemini, Claude), selected by environment variables
- **Structured output**: the model returns JSON matching the product schema; categories come from
  the database as an allowed list, so the model cannot invent them
- **Validated** with the same DTO validation as a manual save
- **Cost tracking**: tokens, latency and cost of every request are logged in `ai_usage`
  (a typical product costs a fraction of a cent)
- **Optional**: without an API key the feature is hidden

Details in [docs/ai.md](docs/ai.md). Media in this README are recorded with a stubbed provider
(`npm run docs:media`).

## Tech stack

| Layer    | Technology                                                                   |
| -------- | ---------------------------------------------------------------------------- |
| Frontend | Angular 21, SSR, zoneless change detection, signals                          |
| Backend  | NestJS (Express), Passport JWT, Google OAuth                                 |
| Database | PostgreSQL 18, Drizzle ORM, SQL migrations                                   |
| Services | Stripe (payments, webhooks), Cloudinary (images), Resend (email), reCAPTCHA  |
| AI       | DeepSeek, Gemini or Claude through a common provider interface               |
| Ops      | Docker (multi-stage image, non-root), Docker Compose, nginx, automatic deploy |

## Architecture

```mermaid
flowchart LR
    B[Browser] --> N[nginx / HTTPS]
    N --> A["Node.js process<br/>Angular SSR + NestJS API"]
    A --> P[(PostgreSQL)]
    A --> C[Cloudinary<br/>images]
    A --> S[Stripe<br/>payments + webhooks]
    A --> R[Resend<br/>email]
    A --> L[AI provider<br/>DeepSeek / Gemini / Claude]
    A --> G[Google OAuth]
```

One Node.js process serves both the server-rendered Angular app and the NestJS API, so the whole
shop ships as a single Docker image.

## Quick start

Requirements: Node.js (LTS), Docker for the local database.

```bash
# 1. dependencies
npm install

# 2. local PostgreSQL
docker run -d --name eshop-db -p 5432:5432 \
  -e POSTGRES_USER=eshop -e POSTGRES_PASSWORD=eshop -e POSTGRES_DB=eshop \
  pgvector/pgvector:pg18

# 3. configuration
cp .env.example .env
# set DATABASE_URL=postgres://eshop:eshop@localhost:5432/eshop and the keys you need

# 4. database schema and admin account
npm run db:migrate
npm run db:seed

# 5. run (API on :4000, client on :3000)
npm run start:dev
npm run start:client
```

Production build:

```bash
npm run build
npm run start
```

## Configuration

All variables are documented in [`.env.example`](.env.example), which is the source of truth.
The main groups:

- **Server**: `PORT`, `SERVER_URL`, `ORIGIN`, `JWT_SECRET`, `COOKIE_KEY`
- **Database**: `DATABASE_URL`
- **Payments**: `STRIPE_SECRETKEY`, `STRIPE_WEBHOOK_SECRET`, `FE_STRIPE_PUBLISHABLE_KEY`
  (see [docs/payments.md](docs/payments.md))
- **Images and email**: `CLOUDINARY_*`, `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAILS`
- **Login and spam protection**: `GOOGLE_CLIENT_*`, `RECAPTCHA_SERVER_KEY`, `FE_RECAPTCHA_CLIENT_KEY`
- **AI (optional)**: `AI_PROVIDER` and the API key of the chosen provider (see [docs/ai.md](docs/ai.md))

Secrets stay on the server. Only variables prefixed `FE_` are sent to the browser.

## Docker

```bash
docker pull pararel/eshop-mean:latest
docker run --env-file .env --network=host pararel/eshop-mean:latest
```

Example with Docker Compose (database reachable only on localhost):

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg18
    env_file: .env.postgres
    volumes:
      - pgdata:/var/lib/postgresql
    ports:
      - "127.0.0.1:5432:5432"

  eshop:
    image: pararel/eshop-mean:latest
    network_mode: host
    env_file: .env
    depends_on:
      - postgres

volumes:
  pgdata:
```

## Project docs

- [AI product drafts](docs/ai.md)
- [Payments and Stripe webhooks](docs/payments.md)
- [Changelog](CHANGELOG.md)

## License

[MIT](LICENSE)
