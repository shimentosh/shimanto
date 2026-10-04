'use client';

import { useSyncExternalStore } from 'react';
import { cn } from '../lib/cn';
import { THEME_STORAGE_KEY as STORAGE_KEY } from './theme-script';

export type Theme = 'light' | 'dark';

/** The effective theme: the explicit choice if there is one, else the system preference. */
export function resolveTheme(): Theme {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === 'light' || explicit === 'dark') return explicit;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private mode or blocked storage: the choice still applies for this page view.
  }
  window.dispatchEvent(new Event('themechange'));
}

function subscribe(onChange: () => void) {
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener('change', onChange);
  window.addEventListener('themechange', onChange);
  return () => {
    mql.removeEventListener('change', onChange);
    window.removeEventListener('themechange', onChange);
  };
}

/** Light/dark switch. Both icons are server-rendered and CSS shows the right one, so there's no hydration flash. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore<Theme | null>(subscribe, resolveTheme, () => null);
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={() => applyTheme(isDark ? 'light' : 'dark')}
      aria-label="Dark theme"
      aria-pressed={theme === null ? undefined : isDark}
      className={cn(
        'hover:bg-canvas-2 grid size-10 place-items-center rounded-full transition-colors',
        className,
      )}
    >
      <svg className="theme-icon-moon size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
      <svg className="theme-icon-sun size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
