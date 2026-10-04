import { type Accent, Icon, type IconName, accentBg, cn } from '@shimanto/ui';

export interface FlowStep {
  label: string;
  note: string;
  tone: Accent;
  icon?: IconName;
  /** Small count badge, e.g. how many entries sit at this step. */
  count?: number;
}

/**
 * A process drawn as connected steps: coloured numbered nodes on a line, horizontal from md up and
 * vertical on phones. Used for the experiment pipeline and the lab method.
 */
export function FlowSteps({ steps, label }: { steps: FlowStep[]; label: string }) {
  return (
    <ol
      aria-label={label}
      className="relative grid gap-8 md:gap-6"
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {/* Connector: vertical on phones, horizontal from md */}
      <span
        aria-hidden="true"
        className="bg-ink/15 absolute top-7 bottom-7 left-7 w-px md:top-7 md:right-[calc(100%/var(--n)/2)] md:bottom-auto md:left-[calc(100%/var(--n)/2)] md:h-px md:w-auto"
        style={{ ['--n' as string]: steps.length }}
      />
      {steps.map((step, i) => (
        <li
          key={step.label}
          className="relative col-span-full grid grid-cols-[56px_1fr] items-start gap-5 md:col-span-1 md:block md:text-center"
        >
          <span
            className={cn(
              'on-world ring-canvas relative mx-auto grid size-14 place-items-center rounded-full ring-8',
              accentBg[step.tone],
            )}
          >
            {step.icon ? (
              <Icon name={step.icon} className="size-6" />
            ) : (
              <span className="font-mono text-sm font-medium">
                {String(i + 1).padStart(2, '0')}
              </span>
            )}
            {step.count !== undefined && (
              <span className="bg-ink text-canvas absolute -top-1 -right-1 grid size-6 place-items-center rounded-full text-xs font-medium">
                {step.count}
              </span>
            )}
          </span>
          <span className="block md:mt-5">
            <span className="text-ink-soft block font-mono text-[11px] tracking-[0.14em] uppercase">
              Step {String(i + 1).padStart(2, '0')}
            </span>
            <span className="mt-1 block text-xl font-medium tracking-[-0.02em]">{step.label}</span>
            <span className="text-ink-soft mt-1 block text-sm leading-snug">{step.note}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
