'use client';

import { useId, useState } from 'react';
import { cn } from '../lib/cn';

export interface ConsentChoice {
  analytics: boolean;
  marketing: boolean;
}

export interface ConsentBannerProps {
  onSave: (choice: ConsentChoice) => void;
  privacyHref?: string;
  className?: string;
}

/**
 * Cookie consent in three levels: essential (always on: sign-in, checkout, order attribution kept
 * on this site), analytics (GA4, internal page/product stats) and marketing (Meta Pixel, ads).
 * Nothing optional loads before a choice; checkout works whatever is chosen.
 */
export function ConsentBanner({
  onSave,
  privacyHref = '/legal/privacy',
  className,
}: ConsentBannerProps) {
  const id = useId();
  const [custom, setCustom] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${id}-title`}
      className={cn(
        'bg-paper text-ink border-ink/10 fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[90] mx-auto max-w-2xl rounded-[20px] border p-5 shadow-[0_18px_60px_-20px_rgba(14,15,12,0.45)] md:bottom-5',
        className,
      )}
    >
      <p id={`${id}-title`} className="text-[17px] font-medium tracking-tight">
        Cookies, your choice
      </p>
      <p className="text-ink-soft mt-1.5 text-[15px] leading-relaxed">
        Essential cookies keep sign-in and checkout working. With your OK, we also measure visits
        (analytics) and ad results (marketing).{' '}
        <a href={privacyHref} className="text-ink underline underline-offset-4">
          Privacy policy
        </a>
      </p>

      {custom && (
        <fieldset className="border-ink/10 mt-4 grid gap-3 border-t pt-4">
          <legend className="sr-only">Cookie categories</legend>
          <label className="flex items-start gap-3 text-[15px]">
            <input type="checkbox" checked disabled className="accent-ink mt-1 size-4" />
            <span>
              <span className="font-medium">Essential</span>
              <span className="text-ink-soft block text-sm">
                Sign-in, checkout, fraud protection. Always on.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-[15px]">
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
              className="accent-ink mt-1 size-4"
            />
            <span>
              <span className="font-medium">Analytics</span>
              <span className="text-ink-soft block text-sm">
                Google Analytics and anonymous page and product stats.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-[15px]">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              className="accent-ink mt-1 size-4"
            />
            <span>
              <span className="font-medium">Marketing</span>
              <span className="text-ink-soft block text-sm">
                Meta Pixel and ad conversion measurement.
              </span>
            </span>
          </label>
        </fieldset>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSave({ analytics: true, marketing: true })}
          className="bg-ink text-canvas rounded-pill h-10 px-5 text-[15px] font-medium hover:opacity-85"
        >
          Accept all
        </button>
        <button
          type="button"
          onClick={() => onSave({ analytics: false, marketing: false })}
          className="border-ink/15 hover:border-ink/40 rounded-pill h-10 border px-5 text-[15px] font-medium"
        >
          Essential only
        </button>
        {custom ? (
          <button
            type="button"
            onClick={() => onSave({ analytics, marketing })}
            className="border-ink/15 hover:border-ink/40 rounded-pill h-10 border px-5 text-[15px] font-medium"
          >
            Save choices
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCustom(true)}
            className="text-ink-soft hover:text-ink h-10 px-3 text-[15px] font-medium underline-offset-4 hover:underline"
          >
            Choose
          </button>
        )}
      </div>
    </div>
  );
}
