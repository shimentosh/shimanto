import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from './button';
import { Container } from './container';
import { LocaleSwitch } from './locale-switch';
import type { NavGroup, NavLink } from './nav-types';
import { Squiggle } from './squiggle';
import { ThemeToggle } from './theme';

export interface FooterProps {
  /** Short invite paragraph next to the CTA. */
  invite: ReactNode;
  cta: { href: string; label: string };
  columns: NavGroup[];
  /** Public contact email. The line is hidden when it's not configured. */
  email?: string;
  socials?: NavLink[];
  /** POST target for the newsletter form. The form is hidden when it's not set. */
  newsletterAction?: string;
  /** Rights holder shown in the © line. */
  owner: string;
  /** Policy links next to the © line. */
  legal?: NavLink[];
  /** Show the EN / বাংলা switch. Turn off until the /bn pages exist. */
  showLocaleSwitch?: boolean;
}

/**
 * Site footer: an invite with the CTA, link columns, contact and socials, then a bottom bar with
 * ©, policy links, language and theme switches. Flat, on the page background, above a hairline.
 */
export function Footer({
  invite,
  cta,
  columns,
  email,
  socials = [],
  newsletterAction,
  owner,
  legal = [],
  showLocaleSwitch = true,
}: FooterProps) {
  const year = new Date().getFullYear();
  return (
    <footer className="border-ink/10 border-t pt-16 pb-8 md:pt-24">
      <Container>
        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-end">
          <div>
            <h2 className="text-4xl leading-[1.05] font-medium tracking-[-0.04em] md:text-6xl">
              Let&apos;s <Squiggle world="build">build</Squiggle>.
            </h2>
            <p className="text-ink-soft mt-5 max-w-[40ch] text-lg">{invite}</p>
          </div>
          <div className="md:justify-self-end">
            <Button href={cta.href}>{cta.label}</Button>
          </div>
        </div>

        <div className="border-ink/10 mt-16 grid gap-10 border-t pt-12 sm:grid-cols-2 md:grid-cols-[repeat(3,1fr)_1.3fr]">
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3 className="text-ink-soft font-mono text-xs tracking-[0.2em] uppercase">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="hover:text-ink-soft transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="space-y-6">
            {newsletterAction && (
              <form action={newsletterAction} method="post" className="space-y-2">
                <label
                  htmlFor="footer-newsletter"
                  className="text-ink-soft block font-mono text-xs tracking-[0.2em] uppercase"
                >
                  Notes in your inbox
                </label>
                <div className="border-ink/15 rounded-pill flex border p-1">
                  <input
                    id="footer-newsletter"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@company.com"
                    className="placeholder:text-ink-soft min-w-0 flex-1 bg-transparent px-4 outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-ink text-canvas rounded-pill px-4 py-2 text-sm font-medium"
                  >
                    Subscribe
                  </button>
                </div>
              </form>
            )}
            {email && (
              <p>
                <span className="text-ink-soft block font-mono text-xs tracking-[0.2em] uppercase">
                  Email
                </span>
                <a
                  href={`mailto:${email}`}
                  className="mt-2 inline-block text-lg font-medium underline underline-offset-4"
                >
                  {email}
                </a>
              </p>
            )}
            {socials.length > 0 && (
              <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Social profiles">
                {socials.map((social) => (
                  <li key={social.href}>
                    <a
                      href={social.href}
                      rel="me noopener"
                      target="_blank"
                      className="hover:text-ink-soft transition-colors"
                    >
                      {social.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="border-ink/10 text-ink-soft mt-16 flex flex-wrap items-center justify-between gap-4 border-t pt-6 text-sm">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <p>
              © {year} {owner}.
            </p>
            {legal.length > 0 && (
              <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Legal">
                {legal.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="hover:text-ink transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-center gap-2">
            {showLocaleSwitch && <LocaleSwitch />}
            <ThemeToggle className="border-ink/15 border" />
          </div>
        </div>
      </Container>
    </footer>
  );
}
