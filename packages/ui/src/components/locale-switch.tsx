'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../lib/cn';
import { localizePath, parseLocalePath, type UiLocale } from '../lib/locale-path';

const LOCALES: Array<{ code: UiLocale; label: string; name: string }> = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'bn', label: 'বাংলা', name: 'বাংলা (Bangla)' },
];

/** EN / বাংলা switch that keeps you on the same page (`/x` ↔ `/bn/x`). */
export function LocaleSwitch({ className }: { className?: string }) {
  const pathname = usePathname() ?? '/';
  const { locale: current } = parseLocalePath(pathname);

  return (
    <nav
      aria-label="Language"
      className={cn('rounded-pill border-ink/15 inline-flex border p-0.5', className)}
    >
      {LOCALES.map(({ code, label, name }) => {
        const active = code === current;
        return (
          <Link
            key={code}
            href={localizePath(pathname, code)}
            hrefLang={code}
            lang={code}
            aria-current={active ? 'true' : undefined}
            aria-label={name}
            className={cn(
              'rounded-pill px-3 py-1 text-sm font-medium transition-colors',
              active ? 'bg-ink text-canvas' : 'text-ink-soft hover:text-ink',
              // The OS Bangla font draws this one label, so English pages never download the ~100 KB webfont.
              code === 'bn' && '[font-family:system-ui,sans-serif]',
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
