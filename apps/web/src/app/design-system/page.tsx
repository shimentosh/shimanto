import {
  BentoGrid,
  Blob,
  Button,
  Card,
  Chip,
  LocaleSwitch,
  Marquee,
  MarqueePill,
  MarqueeWord,
  MediaCard,
  type Milestone,
  SectionSheet,
  Squiggle,
  StatCardStack,
  ThemeToggle,
  Tilt,
  Timeline,
  WorldBackground,
  colors,
  radii,
  worlds,
} from '@shimanto/ui';
import type { Metadata } from 'next';
import { CommandPaletteDemo } from './command-palette-demo';

export const metadata: Metadata = {
  title: 'Design system',
  description: 'Living reference for the shimanto.xyz "Warm Cinematic" design system.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/design-system' },
};

/** Clearly-labelled sample data. The brief forbids fake metrics on real pages, and this page is an internal reference. */
const SAMPLE_MILESTONES: Milestone[] = [
  {
    id: 's1',
    date: '2026-03',
    type: 'LAUNCH',
    title: 'Sample launch milestone',
    description: 'Green = launch.',
  },
  {
    id: 's2',
    date: '2026-01',
    type: 'USERS',
    title: 'Sample users milestone',
    description: 'Blue = users.',
  },
  {
    id: 's3',
    date: '2025-08',
    type: 'VIEWS',
    title: 'Sample views milestone',
    value: '00M+',
    description: 'Coral = views.',
  },
  {
    id: 's4',
    date: '2025-02',
    type: 'REVENUE',
    title: 'Sample revenue milestone',
    description: 'Yellow = revenue.',
  },
  {
    id: 's5',
    date: '2025-01',
    type: 'PRESS',
    title: 'Sample press mention',
    description: 'Lilac = press.',
  },
];

const swatches = [
  ...Object.entries(colors).map(([name, hex]) => ({ name, hex, group: 'Base' })),
  ...Object.entries(worlds).map(([name, hex]) => ({ name, hex, group: 'World' })),
];

function SectionTitle({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="mb-10 md:mb-14">
      <p className="font-mono text-xs tracking-[0.2em] uppercase">{eyebrow}</p>
      <h2 className="text-h2 mt-3 font-medium">{children}</h2>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <main id="main">
      <WorldBackground />

      {/* ── Intro + tokens ─────────────────────────────── */}
      <SectionSheet className="pt-36 md:pt-44">
        <p className="text-ink-soft font-mono text-sm tracking-[0.2em] uppercase">
          Internal · v0.2
        </p>
        <h1 className="text-hero mt-6 font-medium">
          Warm <Squiggle world="create">Cinematic</Squiggle>.
        </h1>
        <p className="text-ink-soft mt-8 max-w-[52ch] text-xl">
          Every token and component in <code className="font-mono text-base">@shimanto/ui</code>.
          Toggle the theme, turn on your OS &ldquo;reduce motion&rdquo; setting, or use a keyboard:
          each component has a static, accessible variant.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <ThemeToggle className="bg-paper" />
          <LocaleSwitch />
        </div>

        <h2 className="mt-20 text-3xl font-medium tracking-tight">Colour</h2>
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {swatches.map((s) => (
            <li key={s.name} className="bg-paper rounded-card overflow-hidden">
              <div className="h-24 border-b border-black/5" style={{ background: s.hex }} />
              <div className="p-4">
                <p className="font-medium">{s.name}</p>
                <p className="text-ink-soft font-mono text-xs">
                  {s.group} · {s.hex}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <h2 className="mt-20 text-3xl font-medium tracking-tight">Type</h2>
        <div className="mt-6 space-y-6">
          <p className="text-hero font-medium">Hero 120</p>
          <p className="text-h2 font-medium">H2 — Things I&apos;ve built.</p>
          <p className="max-w-[68ch] text-lg">
            Body 18/1.55 in Inter Tight, set to a 68ch measure for reading pages. Social media
            distributes; this site owns.
          </p>
          <p lang="bn" className="max-w-[68ch] text-lg">
            বাংলা: Noto Sans Bengali, এক ধাপ বেশি লাইন-হাইট আর শূন্য লেটার-স্পেসিং।
          </p>
          <p className="text-ink-soft font-mono text-sm tracking-[0.2em] uppercase">
            Mono label · 2026-09-25 · Building
          </p>
        </div>

        <h2 className="mt-20 text-3xl font-medium tracking-tight">Radii</h2>
        <ul className="mt-6 flex flex-wrap gap-4">
          {Object.entries(radii).map(([name, value]) => (
            <li
              key={name}
              className="bg-paper grid h-24 w-40 place-items-center font-mono text-sm"
              style={{ borderRadius: value }}
            >
              {name} {value}
            </li>
          ))}
        </ul>
      </SectionSheet>

      {/* ── Primitives ─────────────────────────────────── */}
      <SectionSheet>
        <SectionTitle eyebrow="Primitives">
          Buttons, <Squiggle world="signal">chips</Squiggle> & cards
        </SectionTitle>
        <div className="flex flex-wrap items-center gap-5">
          <Button href="/work">Explore my work</Button>
          <Button>Play the song</Button>
          <Button>Get access</Button>
          <Button href="/collaborate" variant="text">
            Let&apos;s build together
          </Button>
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          <Chip>AI</Chip>
          <Chip>Automation</Chip>
          <Chip>Case study</Chip>
          <Chip tone="spark">Featured</Chip>
          <Chip variant="status" tone="build">
            Live
          </Chip>
          <Chip variant="status" tone="spark">
            Building
          </Chip>
          <Chip variant="status">Paused</Chip>
          <Chip variant="status" tone="create">
            Sunset
          </Chip>
          <Chip variant="status" tone="idea">
            Exited
          </Chip>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <Card interactive>
            <h3 className="text-2xl font-medium">Hover lift</h3>
            <p className="text-ink-soft mt-2">Rises 6px on hover. Transform only.</p>
          </Card>
          <Tilt>
            <Card surface="build">
              <h3 className="text-2xl font-medium">Tilt toward cursor</h3>
              <p className="mt-2">Desktop pointers only. Off under reduced motion.</p>
            </Card>
          </Tilt>
          <Card surface="idea">
            <h3 className="text-2xl font-medium">World surface</h3>
            <p className="mt-2">Accent surfaces always carry dark ink (contrast-tested).</p>
          </Card>
        </div>
      </SectionSheet>

      {/* ── Bento + media cards ───────────────────────── */}
      <SectionSheet>
        <SectionTitle eyebrow="Content">
          Bento & media <Squiggle world="build">cards</Squiggle>
        </SectionTitle>
        <BentoGrid label="Sample notes">
          <MediaCard
            size="feature"
            href="/blog"
            title="Feature tile: the first card spans two columns and two rows"
            summary="Placeholder art is generated blob composition until real covers exist."
            tags={['Founder notes', 'Systems']}
            meta="Sample · 6 min read"
            world="build"
          />
          <MediaCard href="/blog" title="Small tile" tags={['AI']} meta="Sample" world="create" />
          <MediaCard
            href="/playbooks"
            title="Another tile"
            tags={['Playbook']}
            meta="Sample"
            world="signal"
          />
          <MediaCard
            href="/experiments"
            title="Third tile"
            tags={['Experiment']}
            meta="Sample"
            world="spark"
          />
        </BentoGrid>
      </SectionSheet>

      {/* ── Sheets & blobs ────────────────────────────── */}
      <SectionSheet>
        <SectionTitle eyebrow="Section sheets">
          Things I&apos;ve <Squiggle world="build">built</Squiggle>.
        </SectionTitle>
        <p className="max-w-[56ch] text-xl">
          Each big section is a rounded-top sheet in its world colour that rises over the previous
          one as it enters (CSS scroll-driven), and the page background tweens to match. With
          reduced motion it is a plain stack of colour.
        </p>
        <div className="mt-12 grid grid-cols-3 gap-6">
          <Blob world="paper" seed={0} className="w-full" />
          <Blob world="spark" seed={1} className="w-full" />
          <Blob world="idea" seed={2} className="w-full" />
        </div>
      </SectionSheet>

      {/* ── Stats ─────────────────────────────────────── */}
      <SectionSheet>
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <SectionTitle eyebrow="Stat card stack">
              A few <Squiggle world="create">numbers</Squiggle>
            </SectionTitle>
            <p className="text-ink-soft max-w-[40ch] text-xl">
              Tilted big-number cards pin and pile up as you scroll. Pure CSS sticky. Values here
              are placeholders; real ones come from the CMS.
            </p>
          </div>
          <StatCardStack
            stats={[
              { value: '00M+', label: 'Sample: views on one song', icon: '▶' },
              { value: '0+', label: 'Sample: ventures launched', icon: '✦' },
              { value: '0+', label: 'Sample: products shipped', icon: '⚙' },
            ]}
          />
        </div>
      </SectionSheet>

      {/* ── Marquee ───────────────────────────────────── */}
      <SectionSheet>
        <SectionTitle eyebrow="Marquee">Pausable, multi-row</SectionTitle>
        <div className="space-y-16">
          <Marquee
            label="Disciplines"
            gapClassName="gap-6"
            rows={[
              {
                items: [
                  'Business',
                  'Marketing',
                  'Technology',
                  'AI',
                  'Automation',
                  'Content',
                  'Design',
                  'Music',
                ].map((w) => <MarqueeWord key={w}>{w}</MarqueeWord>),
              },
            ]}
          />
          <Marquee
            label="Platforms"
            duration={60}
            rows={[
              {
                items: ['YouTube', 'Facebook', 'Instagram', 'X', 'LinkedIn', 'TikTok'].map(
                  (name) => <MarqueePill key={name} label={name} meta="— followers" />,
                ),
              },
              {
                direction: 'right',
                items: ['Spotify', 'SoundCloud', 'GitHub', 'Threads', 'Medium', 'Substack'].map(
                  (name) => <MarqueePill key={name} label={name} />,
                ),
              },
            ]}
          />
        </div>
      </SectionSheet>

      {/* ── Timeline ──────────────────────────────────── */}
      <SectionSheet>
        <SectionTitle eyebrow="Timeline">
          Wall of <Squiggle world="spark">wins</Squiggle>
        </SectionTitle>
        <Timeline items={SAMPLE_MILESTONES} />
      </SectionSheet>

      {/* ── Chrome ────────────────────────────────────── */}
      <SectionSheet>
        <SectionTitle eyebrow="Chrome">Nav, menu, search & cursor</SectionTitle>
        <ul className="grid max-w-3xl gap-4 text-lg">
          <li>
            <strong>Header</strong> (top): full-width bar that gains a hairline on scroll and always
            stays in view.
          </li>
          <li>
            <strong>Menu sheet</strong>: menu button in the header. Full-screen, focus-trapped, Esc
            to close.
          </li>
          <li>
            <strong>Custom cursor</strong>: hover the cards above; the circle grows with a label.
          </li>
          <li>
            <strong>Footer</strong>: CTA row, link columns and the bottom bar.
          </li>
        </ul>
        <div className="mt-8">
          <CommandPaletteDemo />
        </div>
      </SectionSheet>
    </main>
  );
}
