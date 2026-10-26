import { Container, Icon, cn } from '@shimanto/ui';
import Link from 'next/link';
import { CONTENT_OS_MARKETS, type ContentOsCopy, type ContentOsLocale } from '@/content/content-os';
import type { GuideBlock, GuidesCopy } from '@/content/content-os/guides';
import type { StoreProduct } from '@/lib/store';
import { BotMark } from './bot-chat';
import { CopyCode } from './copy-code';
import { BuyButton, IconTile, offer, tint } from './parts';
import { pressDark } from './press';
import { ContentOsShell } from './shell';

function Block({ block, g }: { block: GuideBlock; g: GuidesCopy }) {
  switch (block.kind) {
    case 'p':
      return <p className="text-ink-soft text-[17px] leading-relaxed">{block.text}</p>;
    case 'code':
      return <CopyCode code={block.code} copyLabel={g.copy} copiedLabel={g.copied} />;
    case 'steps':
      return (
        <ol className="grid gap-2.5">
          {block.items.map((item, i) => (
            <li key={item} className="flex gap-3 text-[16px] leading-snug">
              <span
                aria-hidden="true"
                className={cn(
                  pressDark,
                  'grid size-7 shrink-0 place-items-center rounded-[9px] font-mono text-xs',
                )}
              >
                {i + 1}
              </span>
              <span className="pt-0.5">{item}</span>
            </li>
          ))}
        </ol>
      );
    case 'table':
      return (
        <div className="overflow-x-auto rounded-[14px] ring-1 ring-white/10">
          <table className="w-full text-left text-[15px]">
            <thead className="text-ink-soft bg-white/[0.04] text-xs">
              <tr>
                <th className="px-4 py-2.5 font-medium">{block.head[0]}</th>
                <th className="px-4 py-2.5 font-medium">{block.head[1]}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {block.rows.map(([a, b]) => (
                <tr key={a}>
                  <td className="px-4 py-2.5 font-mono text-[13px] whitespace-nowrap">{a}</td>
                  <td className="text-ink-soft px-4 py-2.5">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'prompt':
      return (
        <div className="rounded-[18px] bg-gradient-to-br from-[#16304f] to-[#141618] p-1.5 ring-1 ring-white/15">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 pt-2 pb-2.5 text-sm">
            <BotMark className="size-5 rounded-full text-[8px]" />
            <span className="font-medium">{block.label}</span>
            <span className="text-ink-soft">· {g.promptFor}</span>
          </p>
          <CopyCode code={block.text} copyLabel={g.copy} copiedLabel={g.copied} prompt />
        </div>
      );
    case 'tip':
      return (
        <p className="bg-idea/10 ring-idea/25 flex gap-2.5 rounded-[14px] px-4 py-3 text-[15px] leading-snug ring-1">
          <Icon name="bulb" className="text-idea mt-0.5 size-4 shrink-0" />
          {block.text}
        </p>
      );
  }
}

/**
 * Content OS guides: from install to a first post, then daily use, video, team and fixes. A
 * contents list on the left (sticky on large screens), short guides on the right.
 */
export function ContentOsGuides({
  copy,
  guides,
  product,
  lang,
  path,
}: {
  copy: ContentOsCopy;
  guides: GuidesCopy;
  product: StoreProduct | undefined;
  lang: ContentOsLocale;
  path: string;
}) {
  const c = copy;
  const g = guides;
  const market = CONTENT_OS_MARKETS[lang];
  const { buy, price } = offer(product, market);

  return (
    <ContentOsShell copy={c} product={product} lang={lang} path={path} sections={g.sections}>
      {/* ───────────── Hero ───────────── */}
      <section id="top">
        <Container className="pt-6 pb-10 md:pt-20 md:pb-16">
          <p className="rounded-pill inline-flex items-center gap-2 bg-white/[0.06] py-1.5 pr-4 pl-1.5 text-sm text-[#F3EFE4] ring-1 ring-white/15">
            <BotMark className="size-6 rounded-full text-[9px]" />
            {g.hero.badge}
          </p>
          <h1 className="cos-display mt-7 text-[clamp(46px,7vw,100px)] leading-[0.92] font-medium tracking-[-0.06em] text-balance">
            <span className="block">{g.hero.title}</span>
            <span className="from-signal via-idea to-build block bg-gradient-to-r bg-clip-text pb-[0.06em] text-transparent">
              {g.hero.rest}
            </span>
          </h1>
          <p className="text-ink-soft mt-6 text-lg md:text-xl">{g.hero.intro}</p>
          <p className="text-build mt-3 inline-flex items-center gap-2 text-sm">
            <Icon name="clock" className="size-4" />
            {g.hero.time}
          </p>
        </Container>
      </section>

      <Container className="grid gap-10 pb-16 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14">
        {/* Contents */}
        <nav aria-label={g.toc} className="lg:sticky lg:top-8 lg:self-start">
          <p className="text-ink-soft text-sm font-medium">{g.toc}</p>
          <ol className="mt-3 flex [scrollbar-width:none] gap-1.5 overflow-x-auto pb-1 lg:grid lg:overflow-visible">
            {g.guides.map((guide, i) => (
              <li key={guide.id} className="shrink-0">
                <a
                  href={`#${guide.id}`}
                  className="text-ink-soft flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-sm transition hover:bg-white/[0.05] hover:text-[#F3EFE4]"
                >
                  <span aria-hidden="true" className="font-mono text-xs opacity-60">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {guide.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Guides */}
        <div className="grid gap-6">
          {g.guides.map((guide, i) => (
            <section
              key={guide.id}
              id={guide.id}
              aria-labelledby={`${guide.id}-title`}
              className={cn(
                'scroll-mt-8 rounded-[24px] p-5 ring-1 ring-white/10 md:p-8',
                i % 2 ? 'bg-white/[0.02]' : tint[guide.tone],
              )}
            >
              <div className="flex items-start gap-4">
                <IconTile icon={guide.icon} tone={guide.tone} />
                <div>
                  <p className="text-ink-soft font-mono text-xs">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <h2
                    id={`${guide.id}-title`}
                    className="text-2xl font-medium tracking-[-0.03em] md:text-3xl"
                  >
                    {guide.title}
                  </h2>
                  <p className="text-ink-soft mt-1">{guide.lead}</p>
                </div>
              </div>
              <div className="mt-6 grid gap-4">
                {guide.blocks.map((block, j) => (
                  <Block key={j} block={block} g={g} />
                ))}
              </div>
            </section>
          ))}

          <div className="flex flex-wrap items-center gap-5 rounded-[24px] bg-gradient-to-br from-[#16304f] to-[#141618] p-6 ring-1 ring-white/15 md:p-8">
            <BotMark className="size-12 rounded-[14px] text-base" />
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-medium tracking-[-0.03em]">{g.help.title}</h2>
              <p className="text-ink-soft mt-1">{g.help.body}</p>
            </div>
            <BuyButton
              href={buy ?? `${market.base}#pricing`}
              label={c.final.buy.replaceAll('{price}', price)}
              comingSoon={c.pricing.comingSoon}
              size="sm"
              className="h-11 rounded-[14px] px-5"
            />
            <Link
              href={`${market.base}/features`}
              className={cn(
                pressDark,
                'inline-flex h-11 items-center gap-2 rounded-[14px] px-4 text-sm font-medium',
              )}
            >
              <Icon name="grid" className="size-4" />
              {c.nav.pages[1]?.label}
            </Link>
          </div>
        </div>
      </Container>
    </ContentOsShell>
  );
}
