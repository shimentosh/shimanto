# Decisions log

Newest first. Each entry: what we chose, why, and what would change it.

## 2026-09-26 — Analytics, tracking and attribution

Setup and event reference: `docs/ANALYTICS.md`.

### D-032 · Sales come from orders; analytics platforms only measure

Admin revenue, orders, AOV, refunds and free orders are computed from Order and Payment rows.
GA4, GTM and Meta receive events for measurement and ad optimisation but are never a financial
source. Internal traffic/funnel numbers come from a first-party `AnalyticsEvent` table.

### D-033 · Conversions are server events with deterministic ids

Purchases fire from `OrdersService.confirm` (a $0 order or a verified webhook), refunds from
`markRefunded`, sign-ups from account creation, never from a success page. Event ids are
deterministic (`purchase_<orderId>`, `refund_<orderId>`, `signup_<customerId>`), unique in the
database, and shared with the browser Pixel so Meta deduplicates. GA4 gets conversions only from
the Measurement Protocol (the browser doesn't send them to gtag).

### D-034 · Provider deliveries are queued and isolated

Each event gets one `AnalyticsDelivery` per enabled provider, sent by the existing job queue with
retries. Every tracking call catches its own errors, so a GA4 or Meta outage can't fail checkout,
payment, fulfillment or email. Providers implement one small interface.

### D-035 · First-party attribution, consent-gated tags

UTM / click-id / referrer attribution is kept in first-party cookies (first touch never
overwritten, last touch = latest campaign or referral) and copied onto customers and orders.
Third-party tags and server-side marketing deliveries follow a three-level consent (essential,
analytics, marketing) that is on by default. The IP address and user agent are kept only with
marketing consent and removed from the event once it has been delivered.

### D-036 · One browser client in the SDK

`AnalyticsClient` (`packages/sdk/src/analytics`) is used by the site and the portal. Components
call `trackViewItem`, `trackPurchase`… and never touch dataLayer, gtag or fbq directly.

## 2026-09-26 — Store, customer portal and admin

Setup and architecture: `docs/COMMERCE.md`.

### D-025 · Order is the purchase; items are snapshots (amends D-016, D-017)

One `Order` per checkout with `OrderItem` rows (name, slug, type, prices, discount), so a cart can
hold several products and receipts never change when a product does. No separate purchase,
licence or entitlement tables: ownership = an order in `PAID`, `PROCESSING` or `COMPLETED`.
$0 orders (free products, 100% coupons, admin gifts) go through the same create → confirm →
fulfil path with `paymentStatus: NOT_REQUIRED`. Buying a product you already own is refused;
claiming a free one twice returns the existing order.

### D-026 · Customer accounts with passwords, plus email links (supersedes D-019)

Customers register with a password (argon2id), verify their email, reset and change passwords.
Checkout can create the account (optionally with a password); accounts created for a guest or by
an admin get a welcome email with a 7-day sign-in link, and "email me a sign-in link" stays
available. Sessions are a JWT cookie checked against `sessionVersion` and status on every
request. A checkout email that belongs to a password account must sign in first, so nobody can
attach orders to someone else's account.

### D-027 · Deliveries: private R2 files and GitHub repositories

A product delivers files, a repository, or both. Each order item gets one `Delivery` per method.
R2 files are `READY` at once and downloaded through 5-minute signed URLs after an entitlement
check. GitHub delivery uses a GitHub App (installation tokens, server-side only; PAT fallback):
customers connect their GitHub identity with OAuth (the user token is used once and dropped), and
the App invites them with read access. The repository is set by an admin only.

### D-028 · Transactional email through one service, on Resend

Owner request: Resend's HTTP API. Every email is an `EmailEvent` keyed by its business event, so
retries and replays never send twice, and the admin can see what was sent or failed. SMTP
(Mailpit) remains for local development.

### D-029 · Portals are client-rendered on shared app components

Admin and portal pages render in the browser and call the API with cookies (the admin client
refreshes its access token once on 401). The shared frame and components live in
`packages/ui/src/app` (AppShell, PageHeader, Section, DataTable, StatusBadge, states, Dialog,
fields, OrderSummary, SupportConversation) and follow the simplified site style: cream canvas,
one paper sheet per page, hairlines instead of boxes, pill buttons, the site's spot illustrations
for empty states. `Icon` and `Spot` moved from the web app into `packages/ui`.

### D-030 · Checkout moved to its own page

Product pages now link to `/checkout?items=<slug>`. The checkout runs in the browser so the
customer's session reaches the API, prices come from `POST /v1/checkout/quote`, and coupons are
validated server-side. The `startCheckout` server action was removed.

### D-031 · Tests stay on Vitest

The specification asked for Jest. The repo already standardised on Vitest (D-006), so the new
unit and e2e tests use it; API e2e runs against a real Postgres test database with fakes only for
Stripe, GitHub, storage and Turnstile.

## 2026-09-25 — Phase 3 (Backend: storage, commerce, leads)

### D-015 · No CMS: page content lives in code (owner decision)

Shimanto wants to build pages directly, with nothing in a CMS. This **amends brief §6 and §9**:

- Pages and copy (home, about, work, writing, playbooks, and so on) are TSX/MDX in `apps/web`, versioned in git.
- The database holds only what changes at runtime: **files, products and orders, customers, leads, admin accounts and the audit log.**
- The admin panel (Phase 8) covers only **storage, products and orders, customers and leads** (plus users and the audit log).
- Dropped: the content, translation, taxonomy, settings, redirects and newsletter tables and endpoints, and the Content OS API-key hook. Redirects move to `next.config` and search to a build-time index.
- A CMS-shaped API was built first and then removed in the same phase. No trace of it remains in the code or migrations.

### D-016 · Gumroad-style products, managed in admin

A product is a name, a slug, a price, a cover and the files to deliver. Its **sales page is designed in code** at `/products/<slug>` and reads price and availability from `GET /v1/products/:slug`, so price changes need no deploy. When a product changes, the API sends a signed revalidation webhook, and the web app expires `products` and `products:<slug>` immediately.

Rules: a product can't be published without at least one file, and a product with orders is archived rather than deleted. One product per order, with the price snapshotted on the order.

### D-017 · Free items are $0 orders

Claiming a free resource goes through the same checkout: email plus Turnstile, then a PAID order with provider `FREE`, then the access email. Claiming the same free item twice re-sends access and doesn't create a new order. Every claimer is a customer, which builds the email list.

### D-018 · Stripe Checkout (hosted) for paid products

The owner chose Stripe (it needs an entity in a Stripe-supported country, since Stripe doesn't onboard Bangladesh-based businesses). The implementation:

- Checkout Sessions with inline `price_data`, so no products need to be mirrored in the Stripe dashboard.
- Idempotency keys on session creation and refunds. Sessions expire after 1 hour, and the order is then marked FAILED.
- Webhooks are verified against the raw body. Each event id is stored (`ProcessedWebhookEvent`), so Stripe's retries never double-fulfil.
- Only a `payment_status: paid` session fulfils. Async methods complete through `async_payment_succeeded`, and refunds made in the Stripe dashboard sync back.
- Admins refund from the admin panel through the Stripe API.

The gateway is a port (`PaymentsGateway`), so another provider can be added later without touching orders. Without `STRIPE_SECRET_KEY`, paid checkout returns a friendly 422 while free products keep working.

### D-019 · Buyers use magic links, not passwords

Every order email carries a single-use sign-in link (valid 7 days). Using it sets a 30-day httpOnly buyer session (`sx_cs`), which is a JWT typed `customer` and can never pass as an admin token. Buyers can request a fresh link with their email, and the response is always 202, so the endpoint doesn't reveal who has bought anything. Downloads redirect to **5-minute signed S3 URLs**. Deliverables live under `private/`, which the bucket policy doesn't expose (verified: an unsigned URL returns 403).

### D-020 · Admins and customers are separate tables

`User` is admin-only (SUPER_ADMIN and EDITOR, argon2id passwords, rotating refresh tokens with reuse detection). `Customer` is a buyer identified by email. They never share a table or a token type.

### D-021 · Background jobs: BullMQ, or inline for tests

Email and revalidation go through `JobsService`. In dev and prod that's BullMQ on Redis (5 attempts with exponential backoff), with the worker in-process for now. Tests and the OpenAPI export use the inline driver, which records jobs so tests can assert on emails, and needs no Redis.

### D-022 · Validation is shared Zod, documented in OpenAPI, and the SDK is generated

`nestjs-zod` doesn't support Nest 12, so a small `ZodPipe` / `@ZodBody` / `@ZodQuery` / `@ApiZodResponse` layer does the job. It turns the same `packages/types` schemas into Swagger through Zod 4's JSON Schema export. `pnpm openapi` writes `packages/sdk/openapi.json` and generates `schema.ts` (openapi-typescript), and the SDK wraps openapi-fetch. A unit test fails if the committed spec drifts from the code.

### D-023 · Local services and ports

- Meilisearch was removed, since search no longer needs a server.
- Mailpit was added (SMTP :1025, inbox http://localhost:8025) so every email is visible in dev.
- Compose host ports are overridable through the root `.env`. This machine runs native Windows PostgreSQL (5432 and 5433) and Redis (6379), so it uses 55432 and 56379.
- e2e tests create and migrate a separate `<db>_test` database and never touch dev data.

### D-024 · Security details worth knowing

- **File types** are identified by magic bytes, not by name or MIME type. SVG is refused because it can carry scripts. EXIF and GPS data are stripped from images.
- **Honeypots** accept any value and fake a success, so bots learn nothing.
- **CSV exports** neutralise spreadsheet formulas.
- **Login** takes the same time for unknown emails and wrong passwords, because both are checked against a real argon2 dummy hash.
- **Production** refuses weak secrets, the Turnstile test key, and Stripe without a webhook secret.
- **Container start** runs `prisma migrate deploy`, which is advisory-locked and safe with several replicas.

## 2026-09-25 — Phase 2 (Design System)

### D-014 · Menu sheet and command palette load on demand

cmdk and Radix Dialog (~18 KB gzipped) load on first open, and hovering or focusing the buttons preloads them. The ⌘K shortcut listener is always there. **Why:** home JS went from 166 to 148 KB, which leaves room for Phase 4 motion inside the 180 KB budget.

### D-013 · The Bangla webfont loads only where Bangla text appears

The EN/বাংলা switch draws its five-character label in the OS Bangla font. Before, every English page downloaded Noto Sans Bengali (~105 KB) just for that label. `/bn` pages and `lang="bn"` content still use Noto.

### D-012 · World surfaces are light islands

Accent sheets keep their colour in dark mode (brief: "accents stay saturated"), so their contents re-scope to light tokens (`.on-world`). Muted ink becomes full ink there, because `#5B5E57` fails AA on lilac and blue. Contrast is unit-tested, and axe (WCAG 2.2 AA) reports 0 violations on `/` and `/design-system` in light and dark.

### D-011 · The focus ring gets an ink halo

The brief asks for focus rings in `--signal`, but `#2E9BF7` on cream is only ~2.5:1, below the 3:1 needed for non-text contrast. The ring stays signal blue, with a 2px ink halo inside it.

### D-010 · Squiggle drawn with a clip-path wipe, not stroke-dashoffset

The dash approach (`pathLength` with a non-scaling stroke) renders broken dashes in Chrome when the SVG is stretched under wide words. A left-to-right `clip-path` wipe gives the same "being drawn" feel and is robust. The server and no-JS output is the finished underline.

### D-009 · Phase 2 motion without GSAP, Motion or Lenis

Every design-system effect is CSS (keyframes, scroll-driven `animation-timeline: view()` as progressive enhancement, `position: sticky`) or a small hook (IntersectionObserver, one rAF loop for the cursor, SMIL for blob morphs). The libraries the brief names join in Phase 4, lazy-loaded, where the homepage choreography actually needs them. "No unused dependencies" (brief §11).

Also:

- **The custom cursor follows the native cursor instead of hiding it.** Precision, OS accessibility cursors and text selection keep working.
- **`packages/ui` treats Next as a peer.** Components use `next/link`, `next/image` and `next/navigation` directly, since every consumer is a Next app.
- **Social links** render only once they have a URL. **The contact email** comes from `NEXT_PUBLIC_CONTACT_EMAIL` and is hidden while unset. **The newsletter form** appears once the Phase 3 endpoint exists.

## 2026-09-25 — Phase 1 (Foundation)

### D-008 · Web and API ports are independently overridable

`apps/web` reads `PORT` (the Next.js default behaviour). `apps/api` reads `API_PORT` and falls back to `PORT` for PaaS hosts that inject it. Turbo passes both through (`globalPassThroughEnv`). **Why:** `PORT=3100 pnpm dev` must not start both servers on the same port. Port 3000 was already in use on the dev machine.

### D-007 · Local object storage = RustFS instead of MinIO

MinIO stopped publishing community Docker images: `minio/minio` on Docker Hub and `quay.io/minio/minio` both have no pullable tags. Local dev uses `rustfs/rustfs` (Apache-2.0, S3-compatible) as service `storage` on :9000/:9001. **Impact:** none on app code. The API talks plain S3 (endpoint, key, secret, bucket), and production targets Cloudflare R2 or AWS S3 as the brief planned. **Revisit if** you would rather self-host MinIO from source or use SeaweedFS or Garage.

### D-006 · Vitest for API tests (brief said Jest)

NestJS 12 is **ESM-only**, and its official starter moved from Jest to Vitest. Jest's ESM support still needs experimental flags. The Nest e2e tests (supertest against the real app with helmet, CORS and Swagger) run on Vitest, and constructor DI with decorator metadata works. It also gives the whole monorepo one test runner. Playwright is still planned for web e2e.

### D-005 · ESLint 9.39 (not 10)

`eslint-config-next` bundles `eslint-plugin-react`, `-import` and `-jsx-a11y`, and all of them declare `eslint ≤ 9`. We stay on the latest 9.x with flat config. **Revisit** when those plugins support ESLint 10.

### D-004 · TypeScript 6.0 (not 7.0)

TypeScript 7 (the native Go compiler) is `latest`, but typescript-eslint requires `<6.1`, `@nestjs/cli` pins `~6.0`, and ts-based tooling hasn't caught up. We use `~6.0.3` everywhere. **Revisit** when typescript-eslint supports TS 7.

### D-003 · Prisma 7.10 (not the 8.0 RC)

The npm `latest` tag for `prisma` currently points at `8.0.0-rc.15`, a release candidate. The brief says "latest **stable**", so Phase 3 uses 7.10.x.

### D-002 · Package build strategy

- `packages/types` and `packages/sdk` compile to `dist/` (ESM + `.d.ts`), because the Nest API runs compiled JS and can't consume raw TS. Turbo's `^build` dependency keeps them fresh.
- `packages/ui` ships **TypeScript source** and is compiled by each Next app via `transpilePackages`. It's React-only, so there's no build step to keep in sync.
- `packages/config` is plain JS and JSON presets.

### D-001 · Fonts: Inter Tight, Noto Sans Bengali, JetBrains Mono

All three load through `next/font/google` and are self-hosted at build time. Noto Sans Bengali is a **variable** font, unlike Hind Siliguri, which gives a lighter payload and every weight. Bangla and mono fonts are `preload: false` so the Latin hero font owns the critical path.

### Also

- **pnpm 11 build scripts:** `@scarf/scarf` (telemetry) and `unrs-resolver` (unneeded native fallback) are explicitly denied in `pnpm-workspace.yaml`.
- **API versioning:** URI versioning with default `v1` (`/v1/...`). `/health` is `VERSION_NEUTRAL`. Swagger UI is served at `/docs` outside production only.
- **Root `compose.yaml`** `include`s `infra/docker-compose.yml`, so the brief's `docker compose up -d` works from the repo root.

## Narrower site container and smaller display scale

A personal site reads better narrower than a product site. Nav, sections and footer now share one width, `--container-site: 72rem` (`max-w-site`, gutters included, via `<Container>`), down from Tailwind's `max-w-7xl`. The display sizes scale to that container instead of the viewport edge: hero `clamp(52px, 8.5vw, 120px)` (brief suggested ≈160px) and H2 `clamp(38px, 5.2vw, 72px)`. The footer "Let's Build." caps at 200px.

## Inner pages on code-defined content (before the content API)

Every route in brief §3 now renders from `apps/web/src/content/catalog.ts`, which mirrors the API seed. Pages consume typed arrays, so switching to SDK reads later only touches the data source. Unknown values (venture one-liners, prices, follower counts, milestone dates) stay `undefined` and the UI hides them or shows an honest "in the works" state. Posts, playbooks and experiments are empty arrays; their `[slug]` templates (TOC scroll-spy, prev/next, related, JSON-LD) are built and verified with a temporary fixture. `/collaborate` validates with `LeadCreateInputSchema` in a server action and forwards to `POST /v1/leads`; Turnstile uses Cloudflare's test key in development only. About chapters and the legal pages are drafts that need the owner's review.

## Blog replaces /writing; title-card page heroes; nav stays visible

- The notes section is now `/blog` (nav label "Blog"), at the owner's request. `/writing` and `/writing/:slug` redirect permanently. Six launch posts live in `apps/web/src/content/posts.ts`, written in the owner's voice from facts in the brief only; they need his review before launch.
- Posts get generated cover art (world colour + blob composition + issue number + category) instead of stock images. The reading layout adds a progress bar, drop cap, share links (no trackers), author card and related posts. `/rss.xml` serves the feed.
- Inner-page heroes are now "title cards": a rounded panel in the page's world colour with an oversized headline and sticker chips, replacing the plain header with a lone blob, which read as a generic blog template.
- `FloatingNav` no longer hides on scroll-down by default (`autoHide` opt-in); the owner found the disappearing header confusing.

## Store: code-written sales pages on API commerce data

- Price, currency, files and published state come from the API (`GET /v1/products`, tagged `products` so the revalidation webhook refreshes them). Sales copy (kind, tagline, features, specs, tiers, FAQ) lives in `apps/web/src/content/products.ts`. Products that exist only in the admin still get a generic page, so anything can be sold without a code change.
- Product kinds: software, ebook, template, source code, course, SaaS, service, system, digital. Each gets generated box art; an uploaded cover replaces it.
- Pricing tiers are separate API products (own slug and price) grouped under one sales page.
- Checkout: `startCheckout` server action → `POST /v1/checkout` → Stripe redirect (free products complete immediately) → `/checkout/success`. Turnstile and a honeypot guard the form; the Turnstile widget is now one shared component used by collaborate too.
- Six `sample: true` products preview each kind in development only; production builds drop them, so no invented product ships.

## Playbooks with steps, checklists and downloadable templates

- Six playbooks live in `apps/web/src/content/playbooks.ts` (two Frameworks, one Systems, two Workflows, one SOP). They are general methods written in the owner's voice, with no claims about his results; they need his review before launch.
- Each playbook has an outcome, audience, time, level, tools, timed steps with tips, a checklist and templates. The checklist remembers ticks in the visitor's browser only (localStorage, with an in-memory fallback). Templates are plain Markdown/CSV files served by a static route (`/playbooks/[slug]/templates/[file]`), so there is nothing to upload.
- Playbook pages emit HowTo JSON-LD with steps and tools.

## Simple, regular UI (supersedes the "sheets" look)

The owner found the panel-heavy look ("box box") too busy and asked for a regular, organised website. The whole UI was simplified; this overrides the brief's §2.1 "section sheets", giant yellow footer, floating pill nav and tilted stat stacks.

- Flat surfaces: content sits on the page background. Sections are separated by space and 1px hairlines (`border-ink/10`), not coloured rounded panels. `SectionSheet` is now a flat section (`tone: default | muted`, optional `divided`); the overlap/world props are gone, and the home page no longer tweens the body colour.
- Lists over cards: ventures, playbooks, templates, FAQs, social links and categories are divider rows. Cards remain only where an image leads (blog covers, product art), with no box around the text.
- Colour is an accent, not a surface: small dots, the squiggle, covers and product art. Covers and product art are flat colour (no blobs).
- Header: a regular full-width bar (logo, links, search, theme, menu, small CTA) that gains a hairline on scroll. Footer: CTA row, link columns, bottom bar, on the page background. The menu sheet uses the page background.
- Buttons: solid pill (primary), outlined pill (secondary), underlined text; the accent "chip" prop was removed. Chips are outlined; status chips are a dot + label. Card radius 28px → 16px.

## Original spot illustrations and a line-icon set

Pages that felt empty now carry visuals without bringing back boxed panels. Illustrations are original, drawn in code in the brief's §2.3 style (flat objects in the five world colours, thin ink lines) rather than stock art, so there is no licensing or attribution to manage and they read the same in both themes: `DeskScene` on the home hero and 19 `Spot`s (one per inner-page header, plus empty states, 404 and checkout success). A 24px line-icon set (`Icon`) marks categories, buying promises, playbook categories, manifesto pillars and blog covers. Slots are listed in `apps/web/public/illustrations/README.md` and previewed at `/design-system/art`; commissioned art can replace any slot later.
