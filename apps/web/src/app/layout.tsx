import { CustomCursor, FloatingNav, Footer, Logo, ThemeScript } from '@shimanto/ui';
import type { Metadata, Viewport } from 'next';
import {
  Instrument_Sans,
  Instrument_Serif,
  Inter_Tight,
  JetBrains_Mono,
  Noto_Sans_Bengali,
  Unbounded,
} from 'next/font/google';
import {
  accountNav,
  ctaNav,
  footerColumns,
  legalNav,
  menuGroups,
  primaryNav,
  socialProfiles,
} from '@/content/navigation';
import { AnalyticsProvider } from '@/components/analytics/analytics';
import { VintageField } from '@/components/home/vintage-field';
import { Lightbox } from '@/components/page/lightbox';
import { SiteChrome } from '@/components/page/site-chrome';
import { SiteCommandPalette } from '@/components/page/site-command-palette';
import { site, siteUrl } from '@/lib/site';
import { getTrackingConfig } from '@/lib/tracking';
import './globals.css';

// Self-hosted at build time by next/font: no layout shift and no third-party request at runtime.
const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter-tight',
  display: 'swap',
});
// Display headlines: Instrument Sans, with Instrument Serif italic for the softer accent line.
const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument-sans',
  display: 'swap',
});
const instrumentSerif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
});
// Logo face only: one weight, preloaded because the wordmark is above the fold on every page.
const unbounded = Unbounded({
  subsets: ['latin'],
  weight: '700',
  variable: '--font-unbounded',
  display: 'swap',
});
const notoBengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  variable: '--font-noto-bengali',
  display: 'swap',
  preload: false,
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${site.name} — ${site.tagline}`, template: site.titleTemplate },
  description: site.description,
  applicationName: site.name,
  appleWebApp: { capable: true, title: site.name, statusBarStyle: 'default' },
  alternates: { canonical: '/', types: { 'application/rss+xml': '/rss.xml' } },
};

export const viewport: Viewport = {
  // Lets the phone tab bar sit above the home indicator via env(safe-area-inset-bottom).
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F3EFE4' },
    { media: '(prefers-color-scheme: dark)', color: '#0E0F0C' },
  ],
};

const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || undefined;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const tracking = await getTrackingConfig();
  return (
    // data-theme is set before paint by ThemeScript, so the attribute legitimately differs from SSR.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${interTight.variable} ${instrumentSans.variable} ${instrumentSerif.variable} ${unbounded.variable} ${notoBengali.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="text-ink relative isolate min-h-dvh pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">
        <a
          href="#main"
          className="bg-paper text-ink rounded-button sr-only z-[100] px-4 py-2 focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
        >
          Skip to content
        </a>
        <SiteChrome>
          <FloatingNav
            logo={<Logo name={site.name} />}
            links={primaryNav}
            groups={menuGroups}
            cta={ctaNav}
            account={{ href: accountNav.href, label: 'Log in' }}
            showAccount
            showLocaleSwitch={false}
            tabs={[
              { href: '/', label: 'Home', icon: 'home' },
              { href: '/work', label: 'Work', icon: 'briefcase' },
              { href: '/tools', label: 'Tools', icon: 'wrench' },
              { href: '/blog', label: 'Blog', icon: 'pen' },
            ]}
          />
          {/* The vintage halftone poster at the top of every page (HeroField is the 3D particle-ocean
            alternative); it scrolls away with the page and pauses offscreen. */}
          <VintageField className="absolute inset-x-0 top-0 -z-10 h-[min(100svh,900px)] [mask-image:linear-gradient(to_bottom,black_60%,transparent)]" />
        </SiteChrome>
        {children}
        <SiteChrome>
          <Footer
            showLocaleSwitch={false}
            owner={site.name}
            invite="Got a business, a product or a messy process that needs a system? Tell me what you're building."
            cta={{ href: '/collaborate', label: 'Start a conversation' }}
            columns={footerColumns}
            legal={legalNav}
            email={contactEmail}
            socials={socialProfiles.flatMap((p) =>
              p.href ? [{ label: p.label, href: p.href }] : [],
            )}
          />
        </SiteChrome>
        <SiteCommandPalette />
        <Lightbox />
        <CustomCursor />
        <AnalyticsProvider config={tracking} />
      </body>
    </html>
  );
}
