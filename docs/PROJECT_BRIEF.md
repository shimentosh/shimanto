# shimanto.xyz — Project Brief (Master Prompt, verbatim)

> Source of truth for the whole project. Saved verbatim from PART A of the master build prompt.
> Phase prompts and illustration prompts live in [PHASES.md](./PHASES.md). Deviations are logged in [DECISIONS.md](./DECISIONS.md).
>
> **Amendment (2026-09-25, owner decision):** no CMS. Page content lives in the web app's code. The
> backend and admin panel cover only **storage, products and orders (Gumroad-style, Stripe,
> free = $0 order), buyer access by email magic link, and leads**. Wherever the brief below says
> "CMS", "content from the API" or "translations per entity", read "in code". See DECISIONS.md D-015 to D-024.

````text
You are a senior full-stack engineer + creative-technologist + SEO architect. Build the complete production-grade codebase for **shimanto.xyz** — the personal brand HQ of Shimanto. Read this whole brief first, save it verbatim to `docs/PROJECT_BRIEF.md`, then propose a short plan and start with Phase 1 unless I say otherwise. Always use the latest stable versions of every library. Never ship placeholder "lorem ipsum" — use the real seed copy provided here.

══════════════════════════════════════════
1. WHAT THIS SITE IS
══════════════════════════════════════════
shimanto.xyz is NOT a normal portfolio. It is a **Personal Brand HQ / Owned Knowledge Hub** — the source of truth for everything Shimanto builds, writes, sells and experiments with. Social media distributes; this site owns.

Identity:
- Name: Shimanto
- Positioning line (primary): **Founder. Builder. Systems Thinker.**
- Secondary line: Entrepreneur · Founder · Creator
- Core: uses Business + Marketing + Technology + AI + Automation to build businesses, software and systems.
- He is explicitly NOT "a developer" and NOT only "an AI creator". Never write "I'm a developer". Copy voice = founder/operator: confident, warm, concise, a little playful.
- Creative side: music & songwriting, guitar, video, design, YouTube channels. One older song has **35M+ views** — a signature proof point.
- Ventures/builds: uContents, DotMirror, Routehook, ClipMesh, Wallpapi, Autochromey, Sentosh, Content OS (also sold as a product).

Visitors & intents: founders, clients, collaborators, buyers of his products, readers of his notes, media. Every page must push toward one of: **Explore → Read → Buy → Collaborate**.

══════════════════════════════════════════
2. DESIGN DIRECTION — "WARM CINEMATIC"
══════════════════════════════════════════
Fusion of two references:
(a) The playful, warm, editorial feel of mindmarket.com (studied structure only — do NOT copy its illustrations, characters, copy or logo), and
(b) Cinematic presentation: anime-opening / Netflix-intro title-card energy, motion with purpose, 2026-premium, experimental yet very readable.

Rule: **Visual wow + excellent typography + usability.** Motion must never block reading. Everything must work with `prefers-reduced-motion` (static, still beautiful).

2.1 Design tokens (put in `packages/ui/tokens` and Tailwind v4 `@theme`):
Colors
- --canvas: #F3EFE4   (warm cream page background)
- --canvas-2: #E6E0D3 (deeper cream for alternate sheets)
- --ink: #2C2E2A      (primary text, near-black warm charcoal)
- --ink-soft: #5B5E57
- --paper: #FFFFFF    (cards, nav pill)
- --night: #0E0F0C    (cinematic intro / dark mode base)
- Accent "worlds" (each major section owns one color):
  - --build:   #8FD464  (grass green → Builds / Ventures)
  - --create:  #FF7059  (coral → Creative Archive / Wall of Wins)
  - --spark:   #F4E311  (electric yellow → Now / Collaborate footer)
  - --signal:  #2E9BF7  (sky blue → Products / Resources)
  - --idea:    #E6C3F5  (lilac → Writing / Playbooks / Experiments)
- Dark mode: --night background, cream text (#F3EFE4), accents stay saturated. Default = light; respect system preference; toggle in nav.

Typography
- Display + UI: **Inter Tight** or **Inter** variable (weight 500 for headlines), via `next/font` (self-hosted, no layout shift).
- Bangla: **Hind Siliguri** or **Noto Sans Bengali** variable via `next/font`, auto-applied under `/bn` and on `lang="bn"` nodes; Bangla gets +0.1 line-height and 0 letter-spacing.
- Optional mono accent for metadata/labels: **JetBrains Mono** or **Geist Mono** (small caps labels, dates, status chips).
- Display scale: fluid `clamp()`; hero H1 ≈ clamp(56px, 10vw, 160px), weight 500, letter-spacing -0.06em, line-height 0.92. H2 ≈ clamp(40px, 6vw, 96px), -0.05em.
- Body 18–20px, line-height 1.55, max 68ch for reading pages.

Shape & surface
- Radii: cards 28px, section sheets 48–64px top corners, pills 999px, buttons 14px.
- Section "sheets": each big section is a full-width rounded-top panel in its world color that slides up over the previous one (sticky stacking on scroll).
- Squiggle underline: a hand-drawn SVG wave under 1 keyword per headline (color = section world color), drawn with stroke-dashoffset animation when in view.
- Organic blobs: large SVG blob shapes that morph slowly and parallax behind content.
- Soft grain/noise overlay (2–3% opacity) on canvas for a filmic texture.

Signature components
- **Floating pill nav**: white rounded bar, detached from the top edge (margin 16px), logo left, links centre, round accent "menu" button, and a separate white pill CTA "Let's build" with a circular avatar/emoji chip on its right. Shrinks slightly on scroll, hides on scroll-down, shows on scroll-up. Mobile: full-screen menu sheet in --spark with huge links.
- **Button**: white rectangle-rounded button with label + circular accent chip containing "›" that nudges right on hover.
- **Tag chips**: small white pills on images (e.g., "AI", "Automation", "Case study").
- **Stat card stack**: tilted (±3–6°) big-number cards (white, green, coral) that stack/shuffle as you scroll (sticky pinning). Number in 96–140px, icon badge top-right.
- **Logo/platform marquee**: 2–3 rows of pill chips (icon circle + name) scrolling in opposite directions, pause on hover.
- **Bento grid** for Writing/Projects: one large feature card + smaller cards, image + tag chips + title below.
- **Giant footer**: full --spark sheet, massive "Let's Build." headline with a wavy green underline, CTA, link columns, contact, socials.

2.2 Motion system
- Libraries: GSAP + ScrollTrigger (scroll choreography), Motion (formerly Framer Motion) for component/micro interactions, Lenis for smooth scroll (disabled on reduced-motion and on touch if janky), Rive or Lottie for character/illustration animation, React Three Fiber + drei ONLY where meaningful (hero + Skills Galaxy). Lazy-load all heavy motion/3D client components with `next/dynamic` and `ssr:false`; SSR must still output full semantic HTML text.
- **Cinematic intro (first visit only, ≤2.2s, skippable, stored in sessionStorage)**: black --night screen → thin light sweep → "SHIMANTO" title-card letters snap in with an anime-opening style staggered mask → four words flash like cuts: BUSINESS · MARKETING · TECHNOLOGY · AI → a circular iris wipe opens into the warm cream homepage (the "lights on" moment). Never delays LCP: the hero H1 text is in the HTML underneath; intro is an overlay.
- Headlines: line-by-line mask reveal (y: 100% → 0, 0.9s, expo.out, 0.06s stagger).
- Section transitions: color sheets slide up with rounded tops; background color of `<body>` tweens to the section world color.
- Hover: cards lift 6px + slight tilt toward cursor; images scale 1.04.
- Cursor: custom soft circle that grows with a label ("View", "Read", "Play") over interactive media (desktop only).
- Performance budget: animations only on transform/opacity; 60fps; no layout thrash.

2.3 Illustration direction (original, not Mindmarket's)
- Flat, bold, rubber-hose-inspired characters and objects in the 5 world colors with thin black line detail — but themed around Shimanto's world: a founder juggling products, a guitar, a camera, gears/automation nodes, rocket, laptop, soundwave, AI spark. Delivered as SVG/Rive. Until real assets exist, create tasteful placeholder SVG blob-compositions (no stock photos, no copyrighted characters). Keep an `/public/illustrations/README.md` listing each slot and its required size.

══════════════════════════════════════════
3. INFORMATION ARCHITECTURE (routes)
══════════════════════════════════════════
English is default at `/`. Bangla at `/bn/...` with the same slugs.
/                       Home
/about                  Story-driven founder profile
/work                   Builds / Ventures index   (filter: status, category)
/work/[slug]            Venture / case study page
/products               Products store index (software, SaaS, digital products, templates, source code, AI systems, tools, services)
/products/[slug]        Sales-oriented product page (Content OS first)
/writing                Notes index (categories: Founder notes, Business, Marketing, Technology, AI, Automation, Product building, Lessons, Ideas, Research)
/writing/[slug]         Article
/playbooks              Frameworks, systems, workflows, SOPs
/playbooks/[slug]
/resources              Tools, templates, guides, curated + own resources (filterable)
/experiments            Prototypes, AI/tech experiments, failed experiments, "testing now"
/experiments/[slug]
/now                    What I'm doing now (dated, with history archive)
/creative               Creative Archive: music, songs, guitar, video, design, visual experiments (35M+ story featured)
/social                 Social Universe: platforms, counts, notable posts
/wins                   Track Record / Wall of Wins (visual timeline)
/lab                    Marketing Lab
/skills                 Skills Galaxy (interactive 3D/2D)
/exploring              Currently exploring
/personal               Personal side (interests, stories, random)
/featured               Media / press / podcasts
/collaborate            Collaborate (intent-based lead form)
/search                 Full-site search
/legal/privacy, /legal/terms, /legal/refund
Utility: /sitemap.xml, /robots.txt, /rss.xml (writing), /feed.json, /llms.txt, /og/* (dynamic OG images), /api/health

Primary nav: Work · Products · Writing · Playbooks · Now · (menu button opens everything else grouped: Explore / Create / Proof / Personal) · CTA "Let's build".

══════════════════════════════════════════
4. HOMEPAGE — SECTION BY SECTION (design map)
══════════════════════════════════════════
Canvas = cream. Follow this order:

① HERO (cream)
- Mono eyebrow: "SHIMANTO — FOUNDER HQ"
- H1 (huge, 2 lines): "Founder. Builder." / "Systems Thinker." — squiggle under "Systems".
- Sub (20–24px, ink-soft, max 36ch): "I build businesses, software and systems at the intersection of business, marketing, technology, AI and automation."
- CTAs: [Explore my work ›] (primary) and [Let's build together] (text link).
- Visual: centred R3F scene OR Rive composition — floating objects (laptop, guitar, gear, rocket, AI spark) orbiting a soft green blob "planet"; reacts to cursor; below the fold a cream → green blob rises.
- Marquee strip under hero: "Business · Marketing · Technology · AI · Automation · Content · Design · Music ·" in mono, infinite.

② MANIFESTO SPLIT (cream, illustration left, white card right — Mindmarket "No more chaos" pattern)
- Card title: "Not a portfolio. A headquarters."
- Body: social media scatters ideas; this site is where the builds, notes, playbooks and products live.
- Button: [About me ›]

③ SELECTED WORK (green --build sheet, rounded top)
- H2: "Things I've built." (squiggle "built")
- Horizontal pinned scroll on desktop (vertical stack on mobile) of large venture cards: logo, one-liner, role, status chip (Live / Building / Paused / Sunset / Exited), key metric, hover preview video/screenshot.
- Seed: uContents, DotMirror, Routehook, ClipMesh, Wallpapi, Autochromey, Sentosh, Content OS.
- CTA: [All builds ›]

④ PRODUCTS (blue --signal accent on cream)
- H2: "Tools you can use today."
- 3-card product grid with price chip + "Buy / Get access". Content OS featured large.

⑤ WALL OF WINS / NUMBERS (cream) — Mindmarket stat-card pattern
- Left: H2 "A few numbers behind the builds" + short paragraph.
- Right: sticky stack of tilted cards: "35M+ views on one song", "8+ ventures launched", "X+ followers across platforms", "X+ products shipped" (values from CMS).
- CTA: [See the full track record ›]

⑥ WRITING & PLAYBOOKS (lilac --idea sheet)
- Bento grid: 1 large featured note + 3 small; tag chips on images; tabs to switch Notes / Playbooks / Experiments.
- CTA: [Read the notes ›]

⑦ NOW (yellow --spark mini-panel)
- "Now — updated {date}" with 4 bullets: building / learning / experimenting / goal. Link to /now.

⑧ CREATIVE ARCHIVE teaser (coral --create sheet)
- Full-bleed video/audio strip, "Before startups, there was a song with 35M+ views." Play button with waveform animation. Link to /creative.

⑨ SOCIAL UNIVERSE (deeper cream)
- Platform pill marquee (YouTube, Facebook, Instagram, X, LinkedIn, TikTok…) each with icon circle + follower count; 2 rows opposite directions.

⑩ FEATURED / AS SEEN IN (optional, hidden if empty)

⑪ COLLABORATE FOOTER (yellow --spark sheet)
- Left: short invite paragraph + [Start a conversation ›]
- Massive "Let's Build." with green wavy underline.
- Link columns, email, socials, language switch (EN / বাংলা), theme toggle, newsletter field, © year.

══════════════════════════════════════════
5. OTHER PAGES — KEY REQUIREMENTS
══════════════════════════════════════════
- /about: story-driven, chaptered scroll ("Chapter 01 — The first hustle", "02 — Music & 35M views", "03 — Building businesses", "04 — Systems thinking", "05 — What I believe"). Sticky chapter index. Philosophy quotes set huge. Interests grid. Timeline strip. Portrait slot.
- /work/[slug] (venture template): hero with logo + one-liner + status + role + years + links; sections: What it is · Why I built it · Problem it solves · My role · System/Tech (diagram) · Progress & metrics · Screenshots gallery (lightbox) · Case study body (MDX/rich text) · Lessons · Related writing · Next venture CTA.
- /products/[slug] (sales page): hero + price + primary buy CTA, problem → solution, features grid, demo video, what's included, FAQ (FAQPage schema), testimonials (real only; hide if none), pricing tiers with localized currency (USD default, BDT on /bn), sticky mobile buy bar. Checkout = creates an Order + redirects to payment provider (Stripe/Lemon Squeezy for USD; SSLCommerz/bKash adapter stub for BDT). Build a payment adapter interface; only Stripe fully wired in v1.
- /writing/[slug]: best-in-class reading: 68ch column, TOC sidebar with scroll-spy, reading time, updated date, code/callout/image/embed blocks, footnotes, share, related posts, newsletter CTA, prev/next. Article + BreadcrumbList schema.
- /playbooks/[slug]: steps component, checklists, downloadable template attachments, "Use this playbook" CTA.
- /experiments: card grid with status (Idea / Prototype / Testing / Shipped / Failed ❌ — failures shown proudly with "what I learned").
- /now: current entry + archive of previous "now" snapshots (versioned).
- /creative: masonry media wall; audio player with waveform; YouTube embeds via facade (lite-youtube) for performance.
- /social: platform cards with live-ish counts (cached daily by backend job), selected posts/videos.
- /wins: vertical animated timeline (year markers, milestone cards color-coded by type: launch, users, views, revenue, press).
- /skills: Skills Galaxy — R3F constellation: 9 planets (Business, Marketing, Product, Technology, AI, Automation, Content, Design, Music/Creative); click a planet → linked projects/notes. Accessible 2D list fallback always rendered in HTML.
- /collaborate: intent picker cards (Work with me · Build something · Business collaboration · Product collaboration · Consulting · Partnership · Speaking · Other) → adaptive multi-step form (name, email, company, budget range, timeline, message, attachments optional) → creates a **Lead** in the backend; honeypot + rate-limit + Cloudflare Turnstile; success screen with confetti in world colors; email notification to Shimanto + auto-reply.
- /search: instant search (Meilisearch or Postgres full-text via backend) across projects, notes, playbooks, resources, experiments, products; ⌘K command palette available site-wide.

══════════════════════════════════════════
6. TECH ARCHITECTURE
══════════════════════════════════════════
Monorepo: **pnpm + Turborepo**
apps/
  web/        Next.js (latest, App Router, React Server Components, TypeScript strict) — public site
  api/        NestJS (latest) — REST API (+ OpenAPI/Swagger), auth, CMS, leads, orders, search, media
  admin/      (scaffold only now — Next.js app, protected) — future admin panel
  portal/     (scaffold only now — Next.js app) — future customer panel
packages/
  ui/         shared design system (tokens, Button, Chip, Card, Sheet, Squiggle, Marquee, StatCard…) — Tailwind v4 + Radix primitives
  types/      shared DTO/zod schemas generated or shared between api & web
  config/     eslint, tsconfig, prettier, tailwind preset
  sdk/        typed API client (generated from OpenAPI) used by web/admin/portal
infra/        docker-compose (postgres, redis, meilisearch, minio), Dockerfiles, CI (GitHub Actions)

Backend (NestJS)
- DB: PostgreSQL + Prisma ORM. Cache/queues: Redis + BullMQ (emails, social-count sync, search indexing, sitemap revalidation pings).
- Modules: auth, users, roles (RBAC), content (projects, products, posts, playbooks, resources, experiments, now, wins, creative, social, featured, pages), taxonomy (tags/categories), media (S3-compatible upload, image variants), i18n (translations per entity), seo (per-entity meta overrides, redirects), leads, orders, payments (adapter pattern), customers, newsletter, search, settings, audit-log, webhooks.
- Auth: email+password with argon2, JWT access + rotating refresh (httpOnly cookies), roles: SUPER_ADMIN, EDITOR, CUSTOMER. Guards + decorators ready for admin/portal.
- Validation: class-validator or zod pipes; global exception filter; helmet; CORS allow-list; throttler; request-id logging (pino).
- On content publish/update → call Next.js on-demand revalidation (`revalidateTag`) via signed webhook.
- Seed script with ALL real seed content from this brief.

Content model (Prisma, sketch — extend sensibly)
- Every content entity: id, slug, status (DRAFT/PUBLISHED/ARCHIVED), publishedAt, updatedAt, featured(bool), order, coverMediaId, tags[], seo (title, description, ogImage, canonical, noindex), translations (locale 'en'|'bn' → title, summary, body JSON/MDX).
- Project/Venture: role, status (LIVE/BUILDING/PAUSED/SUNSET/EXITED), startedAt, endedAt, problem, why, techStack[], metrics JSON, links JSON, gallery[], relatedPosts[].
- Product: type (SOFTWARE/SAAS/DIGITAL/TEMPLATE/SOURCE_CODE/AI_SYSTEM/TOOL/SERVICE), prices[] (currency, amount, interval?), deliverable (file/url/license), linkedProjectId.
- Post (Writing), Playbook (steps JSON, attachments), Resource (kind, url, isOwn, price?), Experiment (stage incl. FAILED, learnings), NowEntry (versioned), Win (date, type, value, label), CreativeItem (kind, embedUrl, stats), SocialPlatform (name, url, handle, followers, lastSyncedAt), Featured (outlet, url, date).
- Lead: intent, name, email, company, budgetRange, timeline, message, source/utm, locale, status (NEW/CONTACTED/QUALIFIED/WON/LOST), notes[], assignedTo.
- Order: customer, items, currency, total, status (PENDING/PAID/FULFILLED/REFUNDED/FAILED), provider, providerRef, license keys/downloads.
- Customer: user relation, orders, downloads, licenses.

Frontend (apps/web)
- Next.js App Router, RSC by default, client components only for interaction/motion.
- Data: fetch from API with `next: { tags: [...] }`; SSG/ISR for all content pages (`generateStaticParams`), on-demand revalidation. Search & forms client-side.
- i18n: `[locale]` segment via middleware — `/` = en (no prefix), `/bn` = Bangla. Use next-intl for UI strings; content translations from API. Fallback to English with a small "এই লেখাটি এখনো বাংলায় নেই" notice. Locale-aware currency & date formatting (Intl).
- Styling: Tailwind v4 with the token preset; CSS variables for world colors; no CSS-in-JS runtime.
- Images: next/image, AVIF/WebP, blur placeholders, explicit sizes.
- Forms: react-hook-form + zod (shared schemas from packages/types).
- Analytics: privacy-friendly (Plausible or Umami) + UTM capture stored on leads/orders. Cookie banner only if non-essential cookies exist.

══════════════════════════════════════════
7. SEO — NON-NEGOTIABLE
══════════════════════════════════════════
- Every route uses `generateMetadata`: unique title (template "%s — Shimanto"), description, canonical, `alternates.languages` (en, bn, x-default) → proper hreflang.
- Dynamic OG images per page via `next/og` (ImageResponse) in the brand style (cream bg, huge Inter headline, world-color blob, squiggle).
- JSON-LD (via a typed `<JsonLd>` helper): Person (with sameAs social links, jobTitle "Founder", knowsAbout), WebSite + SearchAction, Organization for each venture, CreativeWork/SoftwareApplication for projects, Product + Offer for products, Article/BlogPosting for writing, HowTo for playbooks where it fits, BreadcrumbList everywhere, FAQPage on product pages, MusicRecording/VideoObject in creative.
- `app/sitemap.ts` (split sitemaps per type, include both locales with alternates, lastModified from API), `app/robots.ts`, RSS + JSON feed, `/llms.txt` summarizing the site for AI crawlers.
- Semantic HTML: one H1 per page, logical heading order, landmarks, descriptive link text, alt text required by CMS schema.
- Core Web Vitals targets: LCP < 2.0s, CLS < 0.05, INP < 150ms on mobile. Hero text must be SSR'd; 3D/Rive lazy after idle; fonts via next/font with `display: swap`; critical CSS small; JS for home < 180KB gzipped (excluding lazy 3D).
- Clean slugs, trailing-slash policy consistent, 301 redirects manageable from CMS, custom 404 (playful illustration + search) and 500 pages.
- Internal linking: related content blocks on every detail page; breadcrumbs UI.
- Lighthouse: ≥ 95 Performance (mobile), 100 SEO, 100 Best Practices, ≥ 95 Accessibility.

══════════════════════════════════════════
8. ACCESSIBILITY & QUALITY
══════════════════════════════════════════
- WCAG 2.2 AA: contrast (ink on yellow/green checked), focus-visible rings in --signal, keyboard nav for menu, marquee pausable, carousels with controls, reduced-motion path for every animation, skip-to-content link.
- Tests: Vitest (units), Playwright (e2e: nav, locale switch, lead form, product checkout happy path), Jest e2e for Nest endpoints. ESLint + Prettier + strict TS. Husky + lint-staged. Conventional commits.
- `.env.example` for every app; zero secrets committed.
- README with setup: `pnpm i && docker compose up -d && pnpm db:migrate && pnpm db:seed && pnpm dev`.

══════════════════════════════════════════
9. FUTURE PANELS — PREPARE NOW, BUILD LATER
══════════════════════════════════════════
Do NOT build full UIs yet, but make the architecture ready:
- Admin panel (apps/admin): content CRUD for every entity with EN/BN tabs, media library, SEO fields & redirects, featured content ordering, site settings, Now editor, **Leads management** (kanban NEW→CONTACTED→QUALIFIED→WON/LOST, notes, assign, export CSV), **Orders management** (status, refunds, resend download), customers, newsletter subscribers, audit log. All API endpoints for these must exist and be protected now.
- Customer portal (apps/portal): login, my orders, downloads, license keys, invoices, profile, support request (creates a Lead with intent=SUPPORT).
- Scaffold both apps with auth-protected layout + one placeholder dashboard page each, sharing packages/ui.
- Keep a hook point for future **Content OS** integration (webhook/API key auth to push posts/projects into the CMS).

══════════════════════════════════════════
10. SEED CONTENT (use in seed script; mark unknown values clearly as TODO in CMS, never invent fake metrics)
══════════════════════════════════════════
- Hero, manifesto and section copy as written above.
- Ventures: uContents, DotMirror, Routehook, ClipMesh, Wallpapi, Autochromey, Sentosh, Content OS — with one-liner "TODO: add one-liner" where unknown, status BUILDING by default.
- Win: "35M+ views on one song" (Creative / YouTube).
- Now: building shimanto.xyz, Content OS, AI video/automation systems.
- Writing categories & Playbook/Resource/Experiment categories as listed in section 3/5.
- Social platforms: YouTube, Facebook, Instagram (URLs/followers TODO).
- Do not create fake testimonials, fake press or fake numbers.

══════════════════════════════════════════
11. WORKING RULES FOR YOU (the AI agent)
══════════════════════════════════════════
- Work phase by phase. At the end of each phase: run build, lint, type-check, tests; fix everything; summarize what was done, what's next, and any decisions I must make.
- Keep components small, typed, documented. Server-first. No unused dependencies.
- When a design decision is ambiguous, follow section 2 and pick the more readable option.
- Keep a `docs/DECISIONS.md` log and a `docs/DESIGN_SYSTEM.md` with every token and component.
````
