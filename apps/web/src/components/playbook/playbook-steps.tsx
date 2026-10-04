import { type Accent, accentBg, cn } from '@shimanto/ui';
import type { PlaybookStep } from '@/content/playbooks';

/**
 * Numbered steps on a thin vertical rail: number, title, duration, body, sub-points and an
 * optional tip. An ordered list, so the sequence is announced to assistive tech.
 */
export function PlaybookSteps({ steps, tone }: { steps: PlaybookStep[]; tone: Accent }) {
  return (
    <ol className="relative">
      <span aria-hidden="true" className="bg-ink/10 absolute top-5 bottom-5 left-4.75 w-px" />
      {steps.map((step, i) => (
        <li key={step.title} className="relative grid grid-cols-[40px_1fr] gap-5 pb-10 last:pb-0">
          <span
            aria-hidden="true"
            className={cn(
              'text-on-world relative z-10 grid size-10 place-items-center rounded-full text-sm font-semibold',
              accentBg[tone],
            )}
          >
            {i + 1}
          </span>
          <div className="pt-1.5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-xl leading-snug font-medium tracking-[-0.02em]">
                <span className="sr-only">Step {i + 1}: </span>
                {step.title}
              </h3>
              {step.duration && <span className="text-ink-soft text-sm">{step.duration}</span>}
            </div>
            <p className="text-ink-soft mt-2 max-w-[62ch] text-lg leading-relaxed">{step.body}</p>
            {step.items && step.items.length > 0 && (
              <ul className="mt-3 list-disc space-y-1.5 pl-5">
                {step.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {step.tip && (
              <p className="bg-canvas-2 rounded-button mt-4 max-w-[62ch] px-4 py-3">
                <span className="font-medium">Tip: </span>
                <span className="text-ink-soft">{step.tip}</span>
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
