import { Container, Icon, type IconName, cn } from '@shimanto/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ContentOsCopy } from '@/content/content-os';
import type { StoreProduct } from '@/lib/store';
import { Dock } from './dock';
import { BuyButton, Wordmark, offer } from './parts';
import { pressDark } from './press';

/**
 * The frame every Content OS page shares: the header (name, pages, this page's sections, buy), the
 * floating dock that takes over once you scroll past it, and the footer. Standalone and always
 * dark, like the landing it grew out of.
 */
export function ContentOsShell({
  copy,
  product,
  lang,
  path,
  sections,
  children,
}: {
  copy: ContentOsCopy;
  product: StoreProduct | undefined;
  lang: string;
  /** This page's path, to mark it in the nav. */
  path: string;
  /** This page's sections, as `#id` links, for the dock. */
  sections: Array<{ href: string; label: string; icon: IconName }>;
  children: ReactNode;
}) {
  const c = copy;
  const { price, buy } = offer(product);
  const buyLabel = c.nav.buy.replaceAll('{price}', price);
  // Not on sale yet: the buttons lead to the pricing section on the landing.
  const href = buy ?? '/content-os#pricing';

  return (
    <main id="main" lang={lang} data-standalone="" className="cos-dark min-h-dvh pb-20 md:pb-24">
      <header>
        <Container className="flex h-16 items-center md:h-20">
          <Link href="/content-os" className="shrink-0">
            <Wordmark className="h-6 md:h-7" />
          </Link>
          <nav aria-label={c.nav.label} className="ml-auto hidden lg:block">
            <ul className="flex items-center gap-1.5">
              {c.nav.pages.map((page) => {
                const here = page.href === path;
                return (
                  <li key={page.href}>
                    <Link
                      href={page.href}
                      aria-current={here ? 'page' : undefined}
                      className={cn(
                        pressDark,
                        'flex h-9 items-center gap-2 rounded-[12px] px-3 text-sm font-medium',
                        here
                          ? 'text-[#F3EFE4] shadow-[inset_0_-2px_0_#2e9bf7]'
                          : 'text-ink-soft hover:text-[#F3EFE4]',
                      )}
                    >
                      <Icon name={page.icon} className="size-4" />
                      {page.label}
                    </Link>
                  </li>
                );
              })}
              <li aria-hidden="true" className="mx-1 hidden h-5 w-px bg-white/10 xl:block" />
              {sections.map((link) => (
                <li key={link.href} className="hidden xl:block">
                  <a
                    href={link.href}
                    className="text-ink-soft flex h-9 items-center rounded-[12px] px-2.5 text-sm transition hover:bg-white/[0.06] hover:text-[#F3EFE4]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <BuyButton
            href={href}
            label={buyLabel}
            comingSoon={c.pricing.comingSoon}
            size="sm"
            className="ml-auto h-9 rounded-[12px] lg:ml-4"
          />
        </Container>
      </header>
      <Dock
        label={c.nav.label}
        pages={c.nav.pages}
        links={sections}
        buy={
          <BuyButton
            href={href}
            label={buyLabel}
            comingSoon={c.pricing.comingSoon}
            size="sm"
            className="h-10 rounded-[14px]"
          />
        }
      />

      {children}

      <footer className="border-t border-white/10 py-10">
        <Container className="text-ink-soft flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <Wordmark className="h-6" />
          <span>{c.footer.by}</span>
          <Link href="/" className="underline underline-offset-4 hover:text-[#F3EFE4]">
            {c.footer.back}
          </Link>
          <ul className="flex flex-wrap gap-4 md:ml-auto">
            {[...c.nav.pages, ...c.footer.links].map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-[#F3EFE4]">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </footer>
    </main>
  );
}
