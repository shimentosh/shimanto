import { Button, Chip, Container, Icon, type IconName, accentBg, cn } from '@shimanto/ui';
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/page/breadcrumbs';
import { JsonLd } from '@/components/page/json-ld';
import { Section, SectionTitle } from '@/components/page/section';
import { ScreenshotSlider } from '@/components/page/screenshot-slider';
import { ToolCard } from '@/components/page/tool-card';
import { EnginesSection, FaqSection, ToolboxSection } from '@/components/page/toolbox';
import { priceLabel, tools } from '@/content/tools';
import { pageMetadata } from '@/lib/seo';
import { absoluteUrl, site } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return tools.map((t) => ({ slug: t.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tool = tools.find((t) => t.slug === slug);
  if (!tool) return {};
  const meta = pageMetadata({
    title: tool.name,
    description: tool.tagline,
    path: `/tools/${tool.slug}`,
  });
  const cover = tool.screenshots[0];
  return cover
    ? { ...meta, openGraph: { ...meta.openGraph, images: [{ url: cover.src, alt: cover.alt }] } }
    : meta;
}

/** Icons for the hero's fact cards and tag chips, keyed by their label. */
const factIcons: Record<string, IconName> = {
  Price: 'tag',
  'Works on': 'monitor',
  'Works in': 'globe',
  Licence: 'code',
  'Account needed': 'user',
  Exports: 'download',
};

const tagIcons: Record<string, IconName> = {
  'Open source': 'code',
  'Video editing': 'video',
  'Local AI': 'cpu',
  Creators: 'users',
  ChatGPT: 'chat',
  AI: 'spark',
  Automation: 'repeat',
  Instagram: 'heart',
  'Data export': 'download',
  'Marketing research': 'chart',
};

/** The external "get it" link, styled like the primary button. */
function GetIt({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-ink text-canvas rounded-pill inline-flex items-center gap-2 px-6 py-3 text-lg font-medium transition-opacity hover:opacity-85"
    >
      <span>{children}</span>
      <Icon name="external" className="size-4" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

/** The repo link for an open-source tool, styled like the secondary button. */
function SourceLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="border-ink/20 text-ink hover:border-ink/50 rounded-pill inline-flex items-center gap-2 border px-6 py-3 text-lg font-medium transition-colors"
    >
      <Icon name="github" className="size-5" />
      <span>View source</span>
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

export default async function ToolPage({ params }: Props) {
  const { slug } = await params;
  const tool = tools.find((t) => t.slug === slug);
  if (!tool) notFound();
  const others = tools.filter((t) => t.slug !== tool.slug);
  const facts = [{ term: 'Price', value: priceLabel(tool) }, ...tool.facts];

  return (
    <main id="main">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: tool.name,
          description: tool.tagline,
          url: absoluteUrl(`/tools/${tool.slug}`),
          applicationCategory:
            tool.kind === 'Chrome extension' ? 'BrowserApplication' : 'MultimediaApplication',
          operatingSystem: tool.os ?? 'Chrome',
          ...(tool.source && { codeRepository: tool.source }),
          image: absoluteUrl(tool.logo.src),
          author: { '@type': 'Person', name: site.name },
          offers: { '@type': 'Offer', price: tool.price ? tool.price.replace(/[^\d.]/g, '') : '0' },
        }}
      />

      <section className="pt-24 pb-12 md:pt-32 md:pb-16">
        <Container>
          <Breadcrumbs
            items={[
              { label: 'Tools', href: '/tools' },
              { label: tool.name, href: `/tools/${tool.slug}` },
            ]}
          />
          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-12">
            <div className="min-w-0">
              <div className="flex items-center gap-4">
                <Image
                  src={tool.logo.src}
                  alt={tool.logo.alt}
                  width={72}
                  height={72}
                  priority
                  className="size-14 rounded-2xl md:size-16"
                />
                <div className="min-w-0">
                  <h1 className="text-[clamp(36px,4.4vw,56px)] leading-none font-medium tracking-tighter">
                    {tool.name}
                  </h1>
                  <p className="text-ink-soft mt-2 flex items-center gap-3 text-sm font-medium">
                    {tool.kind}
                    <Chip variant="status" tone={tool.price ? 'spark' : 'build'}>
                      {priceLabel(tool)}
                    </Chip>
                  </p>
                </div>
              </div>
              <p className="mt-6 text-xl leading-snug text-balance md:text-2xl">{tool.tagline}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <GetIt href={tool.href}>{tool.cta}</GetIt>
                {tool.source ? (
                  <SourceLink href={tool.source} />
                ) : (
                  <Button href="/tools" variant="secondary">
                    All tools
                  </Button>
                )}
              </div>
              <dl className="border-ink/10 mt-8 grid grid-cols-2 overflow-hidden rounded-2xl border">
                {facts.map((fact, i) => (
                  <div
                    key={fact.term}
                    className={cn(
                      'border-ink/10 flex items-center gap-3 px-4 py-4',
                      i % 2 === 1 && 'border-l',
                      i >= 2 && 'border-t',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="bg-ink/[0.06] text-ink grid size-9 shrink-0 place-items-center rounded-lg"
                    >
                      <Icon name={factIcons[fact.term] ?? 'info'} className="size-[18px]" />
                    </span>
                    <div className="min-w-0">
                      <dt className="text-ink-soft text-xs">{fact.term}</dt>
                      <dd className="mt-0.5 font-medium">{fact.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
              <ul aria-label="Tags" className="mt-5 flex flex-wrap gap-2">
                {tool.tags.map((tag) => (
                  <li key={tag}>
                    <Chip className="gap-1.5 py-1 pl-2">
                      <Icon
                        name={tagIcons[tag] ?? 'tag'}
                        className="text-ink-soft size-3.5"
                        strokeWidth={2}
                      />
                      {tag}
                    </Chip>
                  </li>
                ))}
              </ul>
            </div>

            {tool.screenshots.length > 0 && (
              <div className="relative min-w-0">
                <div
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-x-[8%] top-[4%] bottom-[30%] rounded-full opacity-25 blur-[90px]',
                    accentBg[tool.tone],
                  )}
                />
                <ScreenshotSlider shots={tool.screenshots} />
              </div>
            )}
          </div>
        </Container>
      </section>

      {tool.toolbox ? (
        <ToolboxSection tool={tool} groups={tool.toolbox} />
      ) : (
        <Section divided labelledBy="does-title">
          <SectionTitle id="does-title" eyebrow="What it does" title="Everything in one click." />
          <ul className="mt-10 grid gap-x-10 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
            {tool.capabilities.map((item) => (
              <li key={item.title} className="border-ink/10 border-t py-6">
                <span
                  aria-hidden="true"
                  className={cn(
                    'text-on-world grid size-10 place-items-center rounded-full',
                    accentBg[tool.tone],
                  )}
                >
                  <Icon name={item.icon} />
                </span>
                <h3 className="mt-4 text-lg font-medium">{item.title}</h3>
                <p className="text-ink-soft mt-1">{item.body}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {tool.engines && <EnginesSection engines={tool.engines} tone={tool.tone} />}

      <Section divided labelledBy="details-title">
        <div className="grid gap-12 md:grid-cols-2 md:gap-16">
          <div>
            <SectionTitle id="details-title" eyebrow="The details" title="Built for power users." />
            <ul className="mt-8 space-y-3">
              {tool.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Icon name="check" className="text-ink-soft mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionTitle eyebrow="Who it’s for" title="Who gets the most out of it." />
            <ul className="mt-8 space-y-3">
              {tool.audience.map((who) => (
                <li key={who} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={cn('mt-2.5 size-1.5 shrink-0 rounded-full', accentBg[tool.tone])}
                  />
                  <span>{who}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {tool.privacy && (
        <Section>
          <div className="bg-ink/4 rounded-card flex flex-col gap-6 p-8 md:flex-row md:items-start md:p-12">
            <span
              aria-hidden="true"
              className="bg-ink text-canvas grid size-12 shrink-0 place-items-center rounded-full"
            >
              <Icon name="shield" />
            </span>
            <div>
              <h2 className="text-2xl font-medium tracking-[-0.03em] md:text-3xl">
                Private by design.
              </h2>
              <p className="text-ink-soft mt-3 max-w-[62ch] text-lg leading-relaxed">
                {tool.privacy}
              </p>
              {tool.disclaimer && (
                <p className="text-ink-soft mt-4 max-w-[62ch] text-sm">{tool.disclaimer}</p>
              )}
            </div>
          </div>
        </Section>
      )}

      {tool.faq && <FaqSection faq={tool.faq} />}

      <Section className={cn(others.length === 0 && 'pb-32 md:pb-40')}>
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-medium tracking-[-0.03em] md:text-5xl">
              {tool.price ? 'Ready when you are.' : 'Free. Go grab it.'}
            </h2>
            <p className="text-ink-soft mt-3 text-lg">
              {tool.price
                ? `${tool.price}, straight from the store.`
                : tool.source
                  ? 'Open source, no signup and no catch. Install it and start in a minute.'
                  : 'No signup and no catch. Install it and start in a minute.'}
            </p>
          </div>
          <GetIt href={tool.href}>{tool.cta}</GetIt>
        </div>
      </Section>

      {others.length > 0 && (
        <Section divided labelledBy="more-title" className="pb-32 md:pb-40">
          <SectionTitle
            id="more-title"
            eyebrow="More tools"
            title="Other things I built."
            action={
              <Button href="/tools" variant="text">
                All tools
              </Button>
            }
          />
          <ul className="mt-10 grid gap-6 md:grid-cols-2">
            {others.slice(0, 2).map((other) => (
              <li key={other.slug}>
                <ToolCard tool={other} />
              </li>
            ))}
          </ul>
        </Section>
      )}
    </main>
  );
}
