import { ThemeScript } from '@shimanto/ui';
import type { Metadata, Viewport } from 'next';
import { Inter_Tight } from 'next/font/google';
import { AdminSessionProvider } from '@/lib/session';
import './globals.css';

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter-tight',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Admin — Shimanto', template: '%s — Shimanto Admin' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F3EFE4' },
    { media: '(prefers-color-scheme: dark)', color: '#0E0F0C' },
  ],
};

/** Store admin. Every page renders in the browser and talks to the API with the admin cookie. */
export default function AdminRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={interTight.variable} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="bg-canvas text-ink min-h-dvh text-base">
        <AdminSessionProvider>{children}</AdminSessionProvider>
      </body>
    </html>
  );
}
