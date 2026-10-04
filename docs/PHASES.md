# Build phases & asset prompts

Companion to [PROJECT_BRIEF.md](./PROJECT_BRIEF.md). Phases are executed one at a time; each ends with build + lint + type-check + tests green and a short report.

| # | Phase | Status |
|---|-------|--------|
| 1 | Foundation | ✅ done |
| 2 | Design System | ✅ done |
| 3 | Backend: storage, products & orders, leads (no CMS, see D-015) | ✅ done |
| 4 | Homepage (the wow) | — |
| 5 | Content pages (in code: TSX/MDX) | — |
| 6 | Product sales pages + checkout UI, purchases page, Collaborate form, build-time search | — |
| 7 | SEO, i18n & polish | — |
| 8 | Admin (storage, products, orders, customers, leads) + deploy | — |

> **Scope change (2026-09-25):** no CMS. Page content is written in code; the backend only serves
> storage, Gumroad-style products and orders, buyer access and leads. The original phase prompts
> below are kept for reference. Where they mention CMS content, content now comes from code.
> Details: [DECISIONS.md](./DECISIONS.md) D-015 to D-024.

## PART B — Phase prompts

**Phase 1 — Foundation**
```text
Phase 1: Set up the pnpm + Turborepo monorepo exactly as in the brief (apps/web, apps/api, apps/admin & apps/portal scaffolds, packages/ui, types, config, sdk, infra/docker-compose with Postgres, Redis, Meilisearch, MinIO). Configure TypeScript strict, ESLint, Prettier, Husky, GitHub Actions CI, .env.example files and README. Make `pnpm dev` run web + api together. Stop and report.
```

**Phase 2 — Design System**
```text
Phase 2: Build packages/ui design system from brief section 2: Tailwind v4 theme tokens (light + dark), fonts via next/font (Inter/Inter Tight, Hind Siliguri/Noto Sans Bengali, mono), and components: FloatingNav, MobileMenuSheet, Button (with circle chip), Chip, Card, BentoGrid, SectionSheet (rounded-top sticky stacking + body color tween), Squiggle (animated SVG underline), Blob (morphing SVG), Marquee (pausable, multi-row), StatCardStack (tilted sticky cards), Timeline, MediaCard, Footer (giant "Let's Build."), CommandPalette (⌘K), ThemeToggle, LocaleSwitch, GrainOverlay, CustomCursor. Add a /design-system route in web that showcases all of them. Every animated component must have a reduced-motion variant.
```

**Phase 3 — Backend & CMS API**
```text
Phase 3: Build the NestJS API: Prisma schema for every entity in brief section 6 (with translations, SEO fields, statuses), migrations, seed script with the real seed content from section 10, auth (argon2, JWT access + rotating refresh in httpOnly cookies, RBAC), content CRUD endpoints, public read endpoints (published only, locale-aware), media upload to S3/MinIO, leads endpoint with Turnstile + throttling + email via queue, Swagger docs, revalidation webhook to Next.js. Generate the typed SDK in packages/sdk. Add e2e tests.
```

**Phase 4 — Homepage (the wow)**
```text
Phase 4: Build the homepage exactly per brief section 4 (sections ① to ⑪), wired to the API via the SDK with ISR tags. Include the cinematic first-visit intro overlay (skippable, sessionStorage, never blocking LCP), GSAP ScrollTrigger choreography, Lenis smooth scroll, lazy R3F hero scene with a static SVG fallback. Hit the performance budget in section 7 — show me Lighthouse mobile scores at the end.
```

**Phase 5 — Content pages**
```text
Phase 5: Build /about, /work + /work/[slug], /writing + /writing/[slug], /playbooks + [slug], /experiments + [slug], /resources, /now (with archive), /wins, /creative, /social, /exploring, /personal, /featured, /lab, following brief section 5. Include TOC with scroll-spy, related content, breadcrumbs, lite-youtube facades, audio waveform player. All SSG/ISR with generateStaticParams.
```

**Phase 6 — Products, Checkout, Collaborate, Search**
```text
Phase 6: Build /products + /products/[slug] sales template (Content OS as first product), payment adapter interface with Stripe fully wired (checkout session → webhook → Order PAID → email with download/licence), BDT adapter stub for SSLCommerz/bKash, localized currency. Build /collaborate intent-based multi-step lead form and /search + ⌘K palette backed by Meilisearch indexing jobs. Build Skills Galaxy (/skills) with R3F + accessible 2D fallback.
```

**Phase 7 — SEO, i18n & polish**
```text
Phase 7: Complete everything in brief section 7 and the /bn locale: generateMetadata on every route, hreflang alternates, dynamic OG images in brand style, all JSON-LD types, split sitemaps with both locales, robots, RSS/JSON feed, llms.txt, redirects, custom 404/500. Translate all UI strings to Bangla (natural, not literal). Run an accessibility audit (axe) and fix all issues. Report Lighthouse (mobile + desktop) for home, an article, a venture and a product page.
```

**Phase 8 — Panels scaffold & deploy**
```text
Phase 8: Scaffold apps/admin and apps/portal with protected layouts and a placeholder dashboard each, using packages/ui. Ensure all admin endpoints (leads kanban data, orders, customers, content CRUD, settings, audit log) exist and are tested. Write deployment docs: web on Vercel (or Docker), api + Postgres + Redis + Meilisearch on a VPS/Railway/Fly with Docker, MinIO → S3/R2 in production, domain shimanto.xyz with api.shimanto.xyz, admin.shimanto.xyz, my.shimanto.xyz.
```

## PART C — Original illustration prompts (AI image / vector reference)

Common style suffix (append to every prompt):
```text
flat vector illustration, bold rubber-hose inspired character style, thick simple shapes, thin black line details, limited palette: grass green #8FD464, coral #FF7059, electric yellow #F4E311, sky blue #2E9BF7, lilac #E6C3F5, white, on warm cream #F3EFE4 background, joyful energetic motion, playful exaggerated proportions, clean edges, no text, no logos, isolated, high resolution
```

1. **Hero composition** — `a cheerful founder character riding a flying laptop, surrounded by orbiting objects: an acoustic guitar, a gear, a small rocket, a play button, a glowing AI spark, all circling a big green blob planet` + style suffix
2. **Manifesto (chaos → HQ)** — `scattered paper notes, social media bubbles and phone screens flying chaotically on the left, being organized into one neat glowing headquarters building on the right` + style suffix
3. **Builds section** — `a character assembling giant building blocks, each block a different app window, with automation cables connecting them` + style suffix
4. **Creative archive** — `a character playing guitar on a giant vinyl record, soundwaves turning into colourful ribbons, a camera floating nearby` + style suffix
5. **Writing & playbooks** — `a character diving into an open giant notebook, pages turning into staircases and flowcharts` + style suffix
6. **Collaborate footer** — `two characters high-fiving over a shared blueprint, confetti and sparks around them` + style suffix
7. **404 page** — `a lost astronaut character holding a paper map upside down on a small lilac planet` + style suffix

> Tip: convert finals to SVG (Illustrator/Figma auto-trace or Recraft vector) and animate in Rive for a "living illustration" feel.
