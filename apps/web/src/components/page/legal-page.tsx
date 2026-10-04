import { Container } from '@shimanto/ui';
import Link from 'next/link';
import { Breadcrumbs } from './breadcrumbs';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
  list?: string[];
}

const legalLinks = [
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/terms', label: 'Terms' },
  { href: '/legal/refund', label: 'Refunds' },
];

/** Plain, readable legal page: 68ch column, section list, sibling policy links. */
export function LegalPage({
  title,
  path,
  updated,
  intro,
  sections,
}: {
  title: string;
  path: string;
  updated: { iso: string; label: string };
  intro: string;
  sections: LegalSection[];
}) {
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <main id="main">
      <article data-world="canvas" className="pt-32 pb-32 md:pt-40 md:pb-40">
        <Container>
          <Breadcrumbs items={[{ label: title, href: path }]} />
          <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_220px]">
            <div className="max-w-[68ch]">
              <h1 className="text-h2 font-medium">{title}</h1>
              <p className="text-ink-soft mt-4 font-mono text-xs tracking-[0.14em] uppercase">
                Last updated <time dateTime={updated.iso}>{updated.label}</time>
              </p>
              <p className="mt-8 text-xl leading-relaxed">{intro}</p>
              <div className="mt-12 space-y-10">
                {sections.map((section, i) => (
                  <section key={section.heading}>
                    <h2 className="text-2xl font-medium tracking-[-0.02em]">
                      <span className="text-ink-soft mr-3 font-mono text-sm">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {section.heading}
                    </h2>
                    <div className="mt-3 space-y-3 text-lg leading-relaxed">
                      {section.paragraphs.map((p) => (
                        <p key={p}>{p}</p>
                      ))}
                      {section.list && (
                        <ul className="list-disc space-y-1.5 pl-6">
                          {section.list.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </section>
                ))}
                <section>
                  <h2 className="text-2xl font-medium tracking-[-0.02em]">Questions</h2>
                  <p className="mt-3 text-lg leading-relaxed">
                    {contact ? (
                      <>
                        Email{' '}
                        <a
                          href={`mailto:${contact}`}
                          className="font-medium underline underline-offset-4"
                        >
                          {contact}
                        </a>{' '}
                        or use the{' '}
                      </>
                    ) : (
                      'Use the '
                    )}
                    <Link
                      href="/collaborate?intent=OTHER"
                      className="font-medium underline underline-offset-4"
                    >
                      contact form
                    </Link>
                    .
                  </p>
                </section>
              </div>
            </div>
            <nav aria-label="Legal" className="lg:sticky lg:top-28 lg:self-start">
              <p className="text-ink-soft font-mono text-xs tracking-[0.2em] uppercase">Policies</p>
              <ul className="mt-4 space-y-2">
                {legalLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={link.href === path ? 'page' : undefined}
                      className="text-ink-soft hover:text-ink aria-[current=page]:text-ink font-medium aria-[current=page]:underline aria-[current=page]:underline-offset-4"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </Container>
      </article>
    </main>
  );
}
