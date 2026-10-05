# shimanto.xyz

Personal Brand HQ of **Shimanto: Founder. Builder. Systems Thinker.**
It's the owned source of truth for everything Shimanto builds, writes, sells and experiments with.

- Brief: [docs/PROJECT_BRIEF.md](docs/PROJECT_BRIEF.md) (see its amendment note: no CMS)
- Phases and status: [docs/PHASES.md](docs/PHASES.md)
- Decisions log: [docs/DECISIONS.md](docs/DECISIONS.md)
- Design system: [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)

## How it fits together

- **Pages and copy live in code** (`apps/web`, TSX/MDX). There is no CMS.
- **The API** (`apps/api`) handles only what changes at runtime:
  - **Storage**: public images, and private product files served through 5-minute signed links
  - **Store**: products (software, digital products, source code), cart checkout with coupons, Stripe for paid orders; $0 orders use the same pipeline
  - **Delivery**: private files in R2 (signed links) and GitHub repository access through a GitHub App
  - **Customer accounts** and the customer portal: orders, downloads, GitHub access, support tickets
  - **Transactional email** through Resend, with an idempotent email log
  - **Leads** from the collaborate form, with a kanban, notes and CSV export
  - **Admin auth**, users and an audit log
- **Admin panel** (`apps/admin`): dashboard, orders, products, customers, files, coupons, support, settings, audit log.
- **Customer portal** (`apps/portal`): orders, products, downloads, GitHub connection, support, account.

Store setup (Resend, R2, Stripe, GitHub App) is in [`docs/COMMERCE.md`](docs/COMMERCE.md); analytics, attribution and tracking (GA4, GTM, Meta Pixel + Conversions API) in [`docs/ANALYTICS.md`](docs/ANALYTICS.md).

## Stack

| Path              | What                                                   | Dev URL                               |
| ----------------- | ------------------------------------------------------ | ------------------------------------- |
| `apps/web`        | Public site: Next.js 16 (App Router, RSC), Tailwind v4 | http://localhost:3100                 |
| `apps/api`        | REST API: NestJS 12 (ESM), Prisma 7, OpenAPI           | http://localhost:4000 (docs: `/docs`) |
| `apps/admin`      | Store admin panel (Next.js, client-rendered)           | http://localhost:3101                 |
| `apps/portal`     | Customer portal (Next.js, client-rendered)             | http://localhost:3102                 |
| `packages/ui`     | Design tokens, Tailwind theme, shared components       |                                       |
| `packages/types`  | Shared zod schemas and enums                           |                                       |
| `packages/sdk`    | Typed API client, generated from the OpenAPI spec      |                                       |
| `packages/config` | ESLint, TypeScript and Prettier presets                |                                       |
| `infra/`          | Docker Compose dev services, Dockerfiles               |                                       |

Local services (`docker compose up -d`):

| Service     | Port(s)                                      | Used for                         |
| ----------- | -------------------------------------------- | -------------------------------- |
| Postgres 18 | 5432                                         | Everything the API stores        |
| Redis 8     | 6379                                         | Job queue (emails, revalidation) |
| RustFS (S3) | 9000 (API), 9001 (console)                   | File storage                     |
| Mailpit     | 1025 (SMTP), **http://localhost:8025** inbox | Every email sent in dev          |

If native services already use these ports, set `POSTGRES_HOST_PORT` / `REDIS_HOST_PORT` in a root `.env` (see `.env.example`) and match the URLs in `apps/api/.env`.

## Requirements

- Node **24** (see `.nvmrc`; ≥ 22.12 works)
- pnpm **11** (`corepack enable` picks up the pinned version)
- Docker with Compose v2

## Setup

```bash
pnpm i
cp apps/api/.env.example apps/api/.env          # set ADMIN_EMAIL / ADMIN_PASSWORD (≥ 12 chars)
cp apps/web/.env.example apps/web/.env.local
docker compose up -d
pnpm db:migrate                                  # create tables
pnpm db:seed                                     # create the first super admin
pnpm dev                                         # web :3100, admin :3101, portal :3102, api :4000
```

Dev ports are pinned to 3100 (web), 3101 (admin) and 3102 (portal), since 3000–3002 are often taken by other local projects; change them in each app's `package.json`. The API uses `API_PORT` (default 4000).

### Payments (optional in dev)

Free products work without any setup. To enable paid checkout, add Stripe test keys to `apps/api/.env`:

```bash
STRIPE_SECRET_KEY=sk_test_...
stripe listen --forward-to localhost:4000/v1/webhooks/stripe   # prints STRIPE_WEBHOOK_SECRET=whsec_...
```

## Scripts

| Command                             | Does                                                              |
| ----------------------------------- | ----------------------------------------------------------------- |
| `pnpm dev`                          | Web + API in watch mode                                           |
| `pnpm dev:all`                      | Every app (web, api, admin, portal)                               |
| `pnpm build`                        | Build everything (Turborepo, cached)                              |
| `pnpm lint` / `pnpm typecheck`      | ESLint / `tsc --noEmit` across the workspace                      |
| `pnpm test`                         | Unit tests (Vitest)                                               |
| `pnpm test:e2e`                     | API e2e tests against a real Postgres (`<db>_test`, auto-created) |
| `pnpm check`                        | Format check, lint, typecheck, test and build (what CI runs)      |
| `pnpm db:migrate` / `db:seed`       | Prisma migrations / create the first admin                        |
| `pnpm openapi`                      | Regenerate `packages/sdk/openapi.json` and the SDK types          |
| `pnpm format`                       | Prettier write                                                    |
| `pnpm infra:up` / `pnpm infra:down` | Start or stop the Docker services                                 |

## Conventions

- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org). Husky runs lint-staged on commit and commitlint on the message.
- **TypeScript** is strict everywhere, with `noUncheckedIndexedAccess`.
- **Secrets** live only in `.env` files, which are git-ignored. Each app ships a `.env.example`.
- **Server-first**: React Server Components by default. Client components are used only for interaction or motion.
- **API changes**: run `pnpm openapi` afterwards. A test fails if the committed spec is out of date.

## Docker images

```bash
docker build -f infra/docker/api.Dockerfile -t shimanto-api .
docker build -f infra/docker/next.Dockerfile --build-arg APP=web -t shimanto-web .   # or APP=admin / APP=portal
```

All images use `turbo prune` for lean builds, run as a non-root user and have healthchecks. The API container applies pending migrations and creates the first super admin (when `ADMIN_EMAIL` / `ADMIN_PASSWORD` are set) on start.

## Deploy

Production runs on a Dokploy VPS from [`docker-compose.prod.yml`](docker-compose.prod.yml), with Postgres and Redis as Dokploy database services. Steps, domains and every environment variable: [`docs/DEPLOY.md`](docs/DEPLOY.md).
