import { accentBg, cn } from '@shimanto/ui';
import Image from 'next/image';
import { contrastWorld } from '@/lib/blog';
import type { StoreProduct } from '@/lib/store';
import { site } from '@/lib/site';

/**
 * Product "box art": a mock-up of the thing itself (book, app window, code editor, video player…)
 * on the product's world colour. Uses the uploaded cover instead when the product has one.
 */
export function ProductArt({
  product,
  size = 'card',
  className,
}: {
  product: StoreProduct;
  size?: 'card' | 'hero';
  className?: string;
}) {
  const hero = size === 'hero';
  if (product.cover) {
    return (
      <div
        className={cn('rounded-card relative overflow-hidden', accentBg[product.world], className)}
      >
        <Image
          src={product.cover.url}
          alt={product.cover.alt}
          fill
          unoptimized
          sizes={hero ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 33vw, 100vw'}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        'on-world rounded-card relative isolate grid place-items-center overflow-hidden',
        accentBg[product.world],
        className,
      )}
    >
      <div className={cn('w-[62%]', hero && 'w-[58%]')}>
        <Mockup product={product} hero={hero} />
      </div>
    </div>
  );
}

const shadow = 'shadow-[0_28px_50px_-24px_rgb(0_0_0/0.55)]';

function Dots() {
  return (
    <div className="flex gap-1">
      <span className="bg-create size-2 rounded-full" />
      <span className="bg-spark size-2 rounded-full" />
      <span className="bg-build size-2 rounded-full" />
    </div>
  );
}

function Bar({ w, className }: { w: string; className?: string }) {
  return <div className={cn('bg-canvas-2 h-2 rounded-full', className)} style={{ width: w }} />;
}

function Mockup({ product, hero }: { product: StoreProduct; hero: boolean }) {
  const accent = accentBg[contrastWorld[product.world]];
  switch (product.kind) {
    case 'ebook':
      return (
        <div className={cn('mx-auto flex aspect-[3/4] w-[70%] -rotate-3 rounded-r-lg', shadow)}>
          <div className="bg-night w-[9%] rounded-l-sm" />
          <div className="bg-paper flex flex-1 flex-col justify-between rounded-r-lg p-[10%]">
            <div>
              <div className={cn('h-1.5 w-8 rounded-full', accent)} />
              <p
                className={cn(
                  'mt-3 leading-[1.02] font-semibold tracking-[-0.03em]',
                  hero ? 'text-2xl md:text-3xl' : 'text-base',
                )}
              >
                {product.name}
              </p>
            </div>
            <p className="font-mono text-[9px] tracking-[0.18em] uppercase">{site.name}</p>
          </div>
        </div>
      );
    case 'source-code':
      return (
        <div className={cn('bg-night rotate-2 rounded-xl p-3', shadow)}>
          <Dots />
          <div className="mt-3 space-y-1.5 font-mono text-[10px] leading-none">
            {[
              ['w-[40%]', 'bg-idea'],
              ['w-[70%]', 'bg-signal'],
              ['w-[55%]', 'bg-build'],
              ['w-[30%]', 'bg-create'],
              ['w-[64%]', 'bg-spark'],
              ['w-[46%]', 'bg-idea'],
            ].map(([w, c], i) => (
              <div
                key={i}
                className="flex items-center gap-2"
                style={{ paddingLeft: `${(i % 3) * 10}px` }}
              >
                <span className="text-cream/30 w-3 text-right">{i + 1}</span>
                <span className={cn('h-1.5 rounded-full opacity-90', w, c)} />
              </div>
            ))}
          </div>
        </div>
      );
    case 'course':
      return (
        <div className={cn('bg-paper -rotate-2 rounded-xl p-3', shadow)}>
          <div className="bg-night relative grid aspect-video place-items-center rounded-lg">
            <span
              className={cn('text-on-world grid size-9 place-items-center rounded-full', accent)}
            >
              <svg viewBox="0 0 24 24" className="ml-0.5 size-4" fill="currentColor">
                <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />
              </svg>
            </span>
            <div className="bg-cream/20 absolute inset-x-3 bottom-2 h-1 rounded-full">
              <div className={cn('h-full w-2/5 rounded-full', accent)} />
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <Bar w="80%" />
            <Bar w="60%" />
          </div>
        </div>
      );
    case 'template':
      return (
        <div className="relative mx-auto aspect-[4/3] w-[86%]">
          {['rotate-6 translate-x-4 translate-y-2', '-rotate-3 -translate-x-2', 'rotate-0'].map(
            (t, i) => (
              <div
                key={i}
                className={cn('bg-paper absolute inset-0 space-y-2 rounded-xl p-3', shadow, t)}
              >
                <div className={cn('h-2 w-1/3 rounded-full', i === 2 ? accent : 'bg-canvas-2')} />
                <Bar w="90%" />
                <Bar w="70%" />
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <div className="bg-canvas-2 h-6 rounded" />
                  <div className="bg-canvas-2 h-6 rounded" />
                  <div className="bg-canvas-2 h-6 rounded" />
                </div>
              </div>
            ),
          )}
        </div>
      );
    case 'service':
      return (
        <div className={cn('bg-paper -rotate-2 rounded-xl p-4', shadow)}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase">1 : 1</span>
            <span className={cn('size-3 rounded-full', accent)} />
          </div>
          <p className={cn('mt-3 font-semibold tracking-[-0.03em]', hero ? 'text-2xl' : 'text-lg')}>
            90 min
          </p>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className={cn('h-4 rounded', i === 5 ? accent : 'bg-canvas-2')} />
            ))}
          </div>
        </div>
      );
    case 'system':
      return (
        <svg viewBox="0 0 200 150" className="mx-auto w-[90%] overflow-visible">
          <g stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" opacity="0.6">
            <line x1="40" y1="30" x2="100" y2="75" />
            <line x1="160" y1="30" x2="100" y2="75" />
            <line x1="40" y1="120" x2="100" y2="75" />
            <line x1="160" y1="120" x2="100" y2="75" />
          </g>
          <circle cx="100" cy="75" r="26" className="fill-[var(--paper)]" />
          <text
            x="100"
            y="80"
            textAnchor="middle"
            className="fill-current text-[13px] font-semibold"
          >
            OS
          </text>
          {[
            [40, 30],
            [160, 30],
            [40, 120],
            [160, 120],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="12" className="fill-[var(--paper)]" />
          ))}
        </svg>
      );
    case 'saas':
    case 'software':
    case 'digital':
    default:
      return (
        <div className={cn('bg-paper rotate-2 rounded-xl p-3', shadow)}>
          <Dots />
          <div className="mt-3 grid grid-cols-[1fr_2.4fr] gap-2">
            <div className="bg-canvas-2 space-y-1.5 rounded-md p-1.5">
              <div className={cn('h-1.5 rounded-full', accent)} />
              <div className="bg-paper h-1.5 rounded-full" />
              <div className="bg-paper h-1.5 rounded-full" />
            </div>
            <div className="space-y-2">
              <Bar w="70%" />
              <div className="flex h-12 items-end gap-1">
                {[40, 65, 50, 85, 60].map((h, i) => (
                  <div
                    key={i}
                    className={cn('flex-1 rounded-sm', i === 3 ? accent : 'bg-canvas-2')}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      );
  }
}
