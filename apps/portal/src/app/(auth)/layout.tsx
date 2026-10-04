import { Spot } from '@shimanto/ui';
import Link from 'next/link';
import { SITE_URL } from '@/lib/config';

/** Sign-in pages: the form on the canvas, a calm illustrated sheet beside it on wide screens. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col px-6 py-6 sm:px-10">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="bg-ink text-canvas grid size-8 place-items-center rounded-[10px] text-sm font-semibold"
            >
              S
            </span>
            <span className="text-[15px] font-semibold tracking-tight">Shimanto</span>
          </Link>
          <a href={SITE_URL} className="text-ink-soft hover:text-ink text-sm font-medium">
            Back to the store
          </a>
        </header>
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          {children}
        </main>
        <footer className="text-ink-soft text-center text-xs">
          Secure sign-in · Your password is never stored in plain text
        </footer>
      </div>
      <aside className="hidden p-3 lg:block">
        <div className="bg-paper relative flex h-full flex-col justify-end overflow-hidden rounded-[24px] p-12">
          <div className="absolute inset-x-12 top-16 mx-auto max-w-sm">
            <Spot name="package" float />
          </div>
          <p className="text-[clamp(28px,3vw,40px)] leading-[1.05] font-medium tracking-[-0.03em]">
            Everything you bought, in one place.
          </p>
          <p className="text-ink-soft mt-3 max-w-md">
            Downloads, repository access, receipts and support. Links are fresh every time, so they
            never expire in your inbox.
          </p>
        </div>
      </aside>
    </div>
  );
}
