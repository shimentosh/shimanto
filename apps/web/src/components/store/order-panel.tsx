'use client';

import { type Accent, Button, Chip, accentBg, cn } from '@shimanto/ui';
import Link from 'next/link';
import { useId, useState } from 'react';
import { analytics } from '@/components/analytics/analytics';

export interface OrderOption {
  slug: string;
  name: string;
  blurb?: string;
  features: string[];
  priceLabel?: string;
  /** Minor units, for analytics (add_to_cart). */
  amount?: number;
  currency?: string;
  purchasable: boolean;
  highlight?: boolean;
}

function Check({ tone }: { tone: Accent }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'text-on-world mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px]',
        accentBg[tone],
      )}
    >
      ✓
    </span>
  );
}

/**
 * Pricing: pick an option (tiers render as a pricing table), then continue to checkout. Samples
 * and unreleased products show why they can't be bought.
 */
export function OrderPanel({
  productName,
  options,
  tone,
  status,
}: {
  productName: string;
  options: OrderOption[];
  tone: Accent;
  status: 'available' | 'coming-soon' | 'sample';
}) {
  const id = useId();
  const initial =
    options.find((o) => o.highlight && o.purchasable) ??
    options.find((o) => o.purchasable) ??
    options.find((o) => o.highlight) ??
    options[0];
  const [selected, setSelected] = useState(initial?.slug);
  const option = options.find((o) => o.slug === selected);
  const tiered = options.length > 1;
  const free = option?.priceLabel === 'Free';

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <fieldset className={cn('grid gap-4', tiered && options.length > 1 && 'md:grid-cols-2')}>
        <legend className="sr-only">Choose an option</legend>
        {options.map((o) => {
          const active = o.slug === selected;
          return (
            <label
              key={o.slug}
              className={cn(
                'border-ink/15 rounded-card relative flex cursor-pointer flex-col border p-6 transition-colors md:p-7',
                tiered && active && 'border-ink ring-ink ring-1',
                tiered && 'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--signal)]',
                !tiered && 'cursor-default',
              )}
            >
              {tiered && (
                <input
                  type="radio"
                  name={`${id}-option`}
                  value={o.slug}
                  checked={active}
                  onChange={() => setSelected(o.slug)}
                  className="sr-only"
                />
              )}
              <div className="flex items-start justify-between gap-3">
                <span className="text-ink-soft font-mono text-xs tracking-[0.2em] uppercase">
                  {o.name}
                </span>
                {o.highlight && (
                  <Chip variant="status" tone={tone}>
                    Most popular
                  </Chip>
                )}
              </div>
              <p className="mt-4 text-5xl font-medium tracking-[-0.05em]">{o.priceLabel ?? '—'}</p>
              <p className="text-ink-soft mt-1 text-sm">
                {o.priceLabel === 'Free'
                  ? 'No card needed'
                  : o.priceLabel
                    ? 'One-time payment'
                    : 'Pricing announced at launch'}
              </p>
              {o.blurb && <p className="mt-4">{o.blurb}</p>}
              {o.features.length > 0 && (
                <ul className="mt-5 space-y-2.5">
                  {o.features.map((f) => (
                    <li key={f} className="flex gap-3 text-[15px]">
                      <Check tone={tone} />
                      {f}
                    </li>
                  ))}
                </ul>
              )}
            </label>
          );
        })}
      </fieldset>

      <div className="border-ink/15 rounded-card border p-6 md:p-7">
        {status === 'available' && option ? (
          <div>
            <p className="text-ink-soft font-mono text-xs tracking-[0.2em] uppercase">Checkout</p>
            <p className="mt-2 text-2xl leading-tight font-medium tracking-[-0.03em]">
              {productName}
              {tiered && <span className="text-ink-soft"> · {option.name}</span>}
            </p>
            <p className="mt-3 text-4xl font-medium tracking-[-0.04em]">
              {option.priceLabel ?? '—'}
            </p>
            <Button
              href={`/checkout?items=${encodeURIComponent(option.slug)}`}
              className={cn(
                'mt-6 w-full justify-center py-3 text-lg',
                !option.purchasable && 'pointer-events-none opacity-50',
              )}
              aria-disabled={!option.purchasable || undefined}
              onClick={() =>
                analytics.trackAddToCart(
                  {
                    item_id: option.slug,
                    item_name: `${productName}${tiered ? ` · ${option.name}` : ''}`,
                    price: option.amount ?? 0,
                    quantity: 1,
                  },
                  option.currency ?? 'USD',
                )
              }
            >
              {free ? 'Get it free' : 'Continue to checkout'}
            </Button>
            <ul className="text-ink-soft mt-5 space-y-1.5 text-sm">
              <li>
                🔒{' '}
                {free
                  ? 'No card needed.'
                  : 'Secure payment by Stripe. Card details never touch this site.'}
              </li>
              <li>
                ⚡ Everything lands in your account right after {free ? 'you claim it' : 'payment'}.
              </li>
              <li>
                ↩ Fair refunds.{' '}
                <Link href="/legal/refund" className="text-ink underline underline-offset-4">
                  Refund policy
                </Link>
              </li>
            </ul>
          </div>
        ) : status === 'sample' ? (
          <div>
            <Chip variant="status" tone="idea">
              Sample · preview only
            </Chip>
            <p className="mt-4 text-2xl leading-tight font-medium tracking-[-0.03em]">
              This product is an example.
            </p>
            <p className="text-ink-soft mt-3">
              It shows how this kind of product looks in the store and only appears in development.
              Create a product with the same slug in the admin to start selling it for real.
            </p>
          </div>
        ) : (
          <div>
            <Chip variant="status" tone="spark">
              Coming soon
            </Chip>
            <p className="mt-4 text-2xl leading-tight font-medium tracking-[-0.03em]">
              Not on sale yet.
            </p>
            <p className="text-ink-soft mt-3">
              Ask for early access and you&apos;ll hear first, before the public launch.
            </p>
            <Button href={`/collaborate?intent=PRODUCT_COLLABORATION`} className="mt-6">
              Get early access
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
