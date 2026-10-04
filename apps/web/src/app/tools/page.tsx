import { Squiggle } from '@shimanto/ui';
import Link from 'next/link';
import { CtaBand, Masthead, ctaPrimary, ctaSecondary } from '@/components/page/masthead';
import { Section } from '@/components/page/section';
import { ToolFeature } from '@/components/page/tool-card';
import { tools } from '@/content/tools';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Tools',
  description:
    'Tools Shimanto built and shares: Chrome extensions, apps and scripts anyone can use, free.',
  path: '/tools',
});

export default function ToolsPage() {
  return (
    <main id="main">
      <Masthead
        crumbs={[{ label: 'Tools', href: '/tools' }]}
        kicker={`Tools / ${tools.length} ${tools.length === 1 ? 'tool' : 'tools'}`}
        world="create"
        title={
          <>
            Tools I built. <Squiggle world="create">Free</Squiggle> to use.
          </>
        }
        intro="Extensions, apps and scripts I made for my own work, shared so you can use them too."
      >
        <ul aria-label="Kinds of tools" className="flex flex-wrap gap-2">
          {[...new Set(tools.map((t) => t.kind))].map((kind) => (
            <li key={kind} className="border-ink/15 rounded-pill border px-4 py-1.5 text-sm">
              {kind}
            </li>
          ))}
        </ul>
      </Masthead>

      <Section labelledBy="tools-title">
        <h2 id="tools-title" className="sr-only">
          All tools
        </h2>
        <ul className="grid gap-6">
          {tools.map((tool, i) => (
            <li key={tool.slug}>
              <ToolFeature tool={tool} flip={i % 2 === 1} />
            </li>
          ))}
        </ul>
      </Section>

      <Section className="pb-24 md:pb-32">
        <CtaBand
          eyebrow="Missing something?"
          title="Tell me the tool you wish existed."
          body="The best ones started as a problem someone sent me."
          world="create"
        >
          <Link href="/collaborate?intent=OTHER" className={ctaPrimary}>
            Suggest a tool →
          </Link>
          <Link href="/products" className={ctaSecondary}>
            Products
          </Link>
        </CtaBand>
      </Section>
    </main>
  );
}
