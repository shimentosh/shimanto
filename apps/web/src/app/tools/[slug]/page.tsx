import { Button, Chip, Container, Icon, accentBg, cn } from '@shimanto/ui';
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/page/breadcrumbs';
import { JsonLd } from '@/components/page/json-ld';
import { Section, SectionTitle } from '@/components/page/section';
import { ToolCard } from '@/components/page/tool-card';
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

export default async function ToolPage({ params }: Props) {
  const { slug } = await params;
  const tool = tools.find((t) => t.slug === slug);
  if (!tool) notFound();
  const [hero, ...gallery] = tool.screenshots;
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
          applicationCategory: 'BrowserApplication',
          operatingSystem: 'Chrome',
          image: absoluteUrl(tool.logo.src),
          author: { '@type': 'Person', name: site.name },
          offers: { '@type': 'Offer', price: tool.price ? tool.price.replace(/[^\d.]/g, '') : '0' },
        }}
      />

      <section className="pt-28 pb-12 md:pt-36 md:pb-16">
        <Container>
          <Breadcrumbs
            items={[
              { label: 'Tools', href: '/tools' },
              { label: tool.name, href: `/tools/${tool.slug}` },
            ]}
          />
          <div className="mt-10 grid items-center gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
            <div className="min-w-0">
              <div className="flex items-center gap-4">
                <Image
                  src={tool.logo.src}
                  alt={tool.logo.alt}
                  width={72}
                  height={72}
                  priority
                  className="size-16 rounded-2xl md:size-18"
                />
                <div>
                  <p className="text-ink-soft text-sm font-medium">{tool.kind}</p>
                  <Chip variant="status" tone={tool.price ? 'spark' : 'build'}>
                    {priceLabel(tool)}
                  </Chip>
                </div>
              </div>
              <h1 className="mt-6 text-[clamp(38px,5.4vw,68px)] leading-[1.02] font-medium tracking-[-0.045em] text-balance">
                {tool.name}
              </h1>
              <p className="mt-5 max-w-[46ch] text-xl leading-relaxed md:text-2xl">
                {tool.tagline}
              </p>
              <p className="text-ink-soft mt-4 max-w-[52ch] text-lg leading-relaxed">
                {tool.intro}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <GetIt href={tool.href}>{tool.cta}</GetIt>
                <Button href="/tools" variant="secondary">
                  All tools
                </Button>
              </div>
              <ul aria-label="Tags" className="mt-8 flex flex-wrap gap-2">
                {tool.tags.map((tag) => (
                  <li key={tag}>
                    <Chip>{tag}</Chip>
                  </li>
                ))}
              </ul>
            </div>
            {hero && (
              <div className="border-ink/10 rounded-card overflow-hidden border shadow-[0_32px_64px_-32px_rgb(0_0_0/0.45)]">
                <Image
                  src={hero.src}
                  alt={hero.alt}
                  width={hero.width}
                  height={hero.height}
                  priority
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  className="h-auto w-full"
                />
              </div>
            )}
          </div>

          <dl className="border-ink/10 mt-14 grid grid-cols-2 gap-6 border-t pt-8 md:grid-cols-4">
            {facts.map((fact) => (
              <div key={fact.term}>
                <dt className="text-ink-soft text-sm">{fact.term}</dt>
                <dd className="mt-1 text-lg font-medium">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

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

      {gallery.length > 0 && (
        <Section divided labelledBy="shots-title">
          <SectionTitle id="shots-title" eyebrow="Screenshots" title="See it in action." />
          <ul className="mt-10 grid gap-6 md:grid-cols-2">
            {gallery.map((shot, i) => (
              <li
                key={shot.src}
                className={cn(
                  'border-ink/10 rounded-card overflow-hidden border',
                  i === 0 && gallery.length % 2 === 1 && 'md:col-span-2',
                )}
              >
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  width={shot.width}
                  height={shot.height}
                  sizes={
                    i === 0 && gallery.length % 2 === 1
                      ? '(min-width: 768px) 80vw, 100vw'
                      : '(min-width: 768px) 45vw, 100vw'
                  }
                  className="h-auto w-full"
                />
              </li>
            ))}
          </ul>
        </Section>
      )}

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

      <Section className={cn(others.length === 0 && 'pb-32 md:pb-40')}>
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-medium tracking-[-0.03em] md:text-5xl">
              {tool.price ? 'Ready when you are.' : 'Free. Go grab it.'}
            </h2>
            <p className="text-ink-soft mt-3 text-lg">
              {tool.price
                ? `${tool.price}, straight from the store.`
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
