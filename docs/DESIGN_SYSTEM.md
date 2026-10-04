# Design system: "Warm Cinematic"

Source: brief §2. Code: [`packages/ui`](../packages/ui). Live reference: **`/design-system`** in the web app (noindex).

## Using it in an app

```css
/* app/globals.css */
@import 'tailwindcss';
@import '@shimanto/ui/styles.css'; /* tokens + base layer */
@source '../../../../packages/ui/src';
```

The tokens are also exported from TypeScript (`import { worlds } from '@shimanto/ui/tokens'`) for canvas, OG images and 3D. A unit test keeps the TS and CSS values in sync.

## Colour

| Token        | Light     | Dark      | Tailwind        | Use              |
| ------------ | --------- | --------- | --------------- | ---------------- |
| `--canvas`   | `#F3EFE4` | `#0E0F0C` | `bg-canvas`     | Page background  |
| `--canvas-2` | `#E6E0D3` | `#1A1C17` | `bg-canvas-2`   | Alternate sheets |
| `--ink`      | `#2C2E2A` | `#F3EFE4` | `text-ink`      | Primary text     |
| `--ink-soft` | `#5B5E57` | `#B9B4A7` | `text-ink-soft` | Secondary text   |
| `--paper`    | `#FFFFFF` | `#1F211C` | `bg-paper`      | Cards, nav pill  |
| `--night`    | `#0E0F0C` | same      | `bg-night`      | Cinematic intro  |

### Worlds (accents keep the same values in both themes)

| World    | Hex       | Tailwind    | Owns                              |
| -------- | --------- | ----------- | --------------------------------- |
| `build`  | `#8FD464` | `bg-build`  | Builds / Ventures                 |
| `create` | `#FF7059` | `bg-create` | Creative Archive / Wall of Wins   |
| `spark`  | `#F4E311` | `bg-spark`  | Now / Collaborate footer          |
| `signal` | `#2E9BF7` | `bg-signal` | Products / Resources; focus rings |
| `idea`   | `#E6C3F5` | `bg-idea`   | Writing / Playbooks / Experiments |

On any world colour, text is always `#2C2E2A` (fixed ink), never the themed `--ink`, which turns cream in dark mode. Contrast checks happen in Phase 2.

Dark mode follows the system preference unless `<html data-theme="light|dark">` is set (the Phase 2 ThemeToggle sets it).

## Type

| Role    | Font                         | Tailwind      | Spec                                              |
| ------- | ---------------------------- | ------------- | ------------------------------------------------- |
| Display | Inter Tight (variable)       | `text-hero`   | clamp(52px, 8.5vw, 120px) · 500 · -0.06em · 0.92  |
| H2      | Inter Tight                  | `text-h2`     | clamp(38px, 5.2vw, 72px) · -0.05em · 0.95         |
| Body    | Inter Tight                  | base          | 18px · 1.55                                       |
| Bangla  | Noto Sans Bengali (variable) | `font-bangla` | auto on `:lang(bn)`: 1.65 line-height, 0 tracking |
| Labels  | JetBrains Mono               | `font-mono`   | eyebrows, dates, status chips                     |

## Shape

| Token             | Value | Tailwind          |
| ----------------- | ----- | ----------------- |
| `--radius-card`   | 16px  | `rounded-card`    |
| `--radius-sheet`  | 24px  | `rounded-t-sheet` |
| `--radius-pill`   | 999px | `rounded-pill`    |
| `--radius-button` | 10px  | `rounded-button`  |

## World surfaces are "light islands"

The `build`, `create`, `spark`, `signal` and `idea` surfaces keep their saturated colour in dark mode. Anything placed on them gets the `.on-world` class through `surfaceBg`, which re-scopes `--ink`, `--ink-soft`, `--paper` and `--canvas` to their light values. White cards on a green sheet therefore stay white, and text stays dark, in both themes.

On accents, `--ink-soft` equals `--ink`: `#5B5E57` fails 4.5:1 on lilac and blue. There, hierarchy comes from size and weight. The contrast tests in `src/lib/contrast.test.ts` keep this true.

## Base behaviour (`styles/index.css`)

- The focus ring is a 3px `--signal` outline plus a 2px `--ink` halo. Blue alone is only ~2.5:1 on cream, and the halo keeps the indicator at 3:1 or better on every surface.
- `prefers-reduced-motion: reduce` flattens CSS animations and transitions globally. Components that animate also check it themselves (see the table below).
- The body background is `var(--page-bg, var(--canvas))` and tweens when `<WorldBackground>` updates it.
- The `dark:` variant follows `data-theme` first, then the system preference.

## Components

Everything is exported from `@shimanto/ui`. "Client" marks client components; the rest are server components.

| Component                               | Kind           | What it does                                                                                                                                                                                                   | Reduced motion / no JS                                                    |
| --------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `Button`                                | Server         | Solid pill (`primary`), outlined pill (`secondary`) or underlined `text` action, with a small arrow that nudges on hover. With `href` it renders a Next `<Link>`, otherwise a `<button>`                       | Hover nudge becomes instant                                               |
| `Chip`                                  | Server         | `tag` (outlined pill, or a `tone` fill) and `status` (coloured dot + label)                                                                                                                                    | Static                                                                    |
| `Card`                                  | Server         | 16px surface in any world. `interactive` adds a hover lift. Rarely used: most content is lists on the page background                                                                                          | Lift becomes instant                                                      |
| `Tilt`                                  | Client         | Tilts its child toward the cursor (max 4°)                                                                                                                                                                     | Off on touch and under reduced motion                                     |
| `BentoGrid`                             | Server         | The first child is the 2×2 feature tile; a single column on mobile                                                                                                                                             | Static                                                                    |
| `MediaCard`                             | Server         | Image (next/image) or blob placeholder art, tag chips, and the title below. The whole card is one link with a `data-cursor` label                                                                              | Image zoom becomes instant                                                |
| `SectionSheet`                          | Server         | Flat full-width section. `tone="muted"` adds a deeper band; `divided` adds a hairline above                                                                                                                    | A plain stack of colour                                                   |
| `WorldBackground`                       | Client         | Tweens `--page-bg` to the world of the `[data-world]` section at mid-viewport                                                                                                                                  | Instant swap                                                              |
| `Squiggle`                              | Client         | Hand-drawn wave under one keyword, wiped in left to right when it comes into view                                                                                                                              | SSR, no-JS and reduced motion show the finished underline                 |
| `Blob`                                  | Client         | Organic SVG shape that morphs via SMIL, with optional scroll parallax                                                                                                                                          | Static shape (server output)                                              |
| `Marquee`, `MarqueePill`, `MarqueeWord` | Client         | Multi-row infinite ticker with rows in opposite directions. Pauses on hover or focus, and has a visible Pause button (WCAG 2.2.2). The duplicate copy is `aria-hidden` and `inert`                             | A static wrapped list: one copy, no edge mask                             |
| `StatCardStack`, `StatCard`             | Server         | Tilted big-number cards that pin and pile up (CSS sticky)                                                                                                                                                      | Same (layout, not animation)                                              |
| `Timeline`                              | Server         | Year groups, newest first, with colour-coded milestone cards: launch green, users blue, views coral, revenue yellow, press lilac                                                                               | Cards visible without the reveal                                          |
| `FloatingNav`                           | Client         | Full-width header bar: logo, links with `aria-current`, search, theme, menu button and a small CTA. Gains a hairline and translucent background on scroll; `autoHide` (off by default) hides it on scroll-down | Never hides. It also stays visible while it has focus or the menu is open |
| `MenuSheet` (alias `MobileMenuSheet`)   | Client, lazy   | Full-screen sheet on the page background: large primary links, the Explore/Create/Proof/Personal groups, locale and theme. Radix Dialog gives the focus trap and Esc, and focus returns to the menu button     | Opens without the iris animation                                          |
| `CommandPalette`                        | Client, lazy   | ⌘K / Ctrl+K, or `openCommandPalette()`. cmdk fuzzy-filters the pages; full-text search joins in Phase 6                                                                                                        | Opens without the pop animation                                           |
| `Footer`                                | Server         | Flat footer above a hairline: "Let's build." with the invite and CTA, link columns, newsletter, email and socials when configured, then ©, policy links, locale and theme                                      | Static                                                                    |
| `ThemeToggle`, `ThemeScript`            | Client, Server | Light↔dark with a saved choice. The head script applies it before paint, so there's no flash. Both icons are server-rendered and CSS picks one                                                                 | Static                                                                    |
| `LocaleSwitch`                          | Client         | EN / বাংলা links to the same page (`/x` ↔ `/bn/x`) with `hreflang`. The Bangla label uses the OS font, so English pages skip the webfont                                                                       | Static                                                                    |
| `GrainOverlay`                          | Server         | Fixed SVG-noise film grain at ~3.5% (6% in dark)                                                                                                                                                               | Static by design                                                          |
| `CustomCursor`                          | Client         | Soft circle trailing the native cursor; grows with a label over `[data-cursor]`                                                                                                                                | Off on touch and under reduced motion                                     |

Helpers: `cn` (tailwind-merge that knows our theme keys), `surfaceBg`, `accentBg`, `surfaceVar`, `usePrefersReducedMotion`, `useFinePointer`, `useInView`, `localizePath`, `parseLocalePath`, `contrastRatio`, `nextNavState`, `groupByYear`.

## Performance notes

- Home page (production build, gzip): **148 KB JS**, 9 KB CSS, 83 KB fonts, CLS 0. The brief's budget is 180 KB of JS.
- cmdk and Radix (~18 KB) load only when the menu or palette is first opened. Hovering or focusing their buttons preloads them.
- No GSAP, Motion or Lenis yet. They join in Phase 4, lazily, for the homepage choreography.
