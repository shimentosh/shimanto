'use client';

import { BUDGET_RANGES, type LeadIntent, TIMELINES } from '@shimanto/types';
import { type Accent, Button, accentBg, cn } from '@shimanto/ui';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { submitLead } from '@/app/collaborate/actions';
import { TURNSTILE_KEY, Turnstile } from './turnstile';

export type PublicIntent = Exclude<LeadIntent, 'SUPPORT'>;

export const intents: Array<{ id: PublicIntent; label: string; note: string; tone: Accent }> = [
  {
    id: 'WORK_WITH_ME',
    label: 'Work with me',
    note: 'A role, a retainer or a long project',
    tone: 'build',
  },
  {
    id: 'BUILD_SOMETHING',
    label: 'Build something',
    note: 'Software, a system or an MVP',
    tone: 'signal',
  },
  {
    id: 'BUSINESS_COLLABORATION',
    label: 'Business collaboration',
    note: 'Joint ventures and deals',
    tone: 'spark',
  },
  {
    id: 'PRODUCT_COLLABORATION',
    label: 'Product collaboration',
    note: 'Co-build or resell a product',
    tone: 'idea',
  },
  {
    id: 'CONSULTING',
    label: 'Consulting',
    note: 'Marketing, AI and automation advice',
    tone: 'create',
  },
  {
    id: 'PARTNERSHIP',
    label: 'Partnership',
    note: 'Brands, platforms and sponsors',
    tone: 'build',
  },
  { id: 'SPEAKING', label: 'Speaking', note: 'Podcasts, events and interviews', tone: 'signal' },
  { id: 'OTHER', label: 'Something else', note: 'Surprise me', tone: 'spark' },
];

/** Intents where budget and timeline matter; the others skip that step. */
const PROJECT_INTENTS: PublicIntent[] = [
  'WORK_WITH_ME',
  'BUILD_SOMETHING',
  'PRODUCT_COLLABORATION',
  'CONSULTING',
];

type Fields = {
  name: string;
  email: string;
  company: string;
  budgetRange: string;
  timeline: string;
  message: string;
  website: string;
};

const empty: Fields = {
  name: '',
  email: '',
  company: '',
  budgetRange: '',
  timeline: '',
  message: '',
  website: '',
};

const inputClass =
  'border-ink/15 placeholder:text-ink-soft/70 rounded-button w-full border bg-transparent px-4 py-3 text-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)] aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-[var(--create)]';

/**
 * Intent-based multi-step lead form (brief §5 /collaborate): intent → details → project → send.
 * Honeypot + Turnstile here, rate-limit and verification in the API.
 */
export function CollaborateForm({ initialIntent }: { initialIntent?: PublicIntent }) {
  const formId = useId();
  const [intent, setIntent] = useState<PublicIntent | undefined>(initialIntent);
  const [step, setStep] = useState(initialIntent ? 1 : 0);
  const [fields, setFields] = useState<Fields>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [token, setToken] = useState<string>();
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const [resetSignal, setResetSignal] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const needsProject = intent ? PROJECT_INTENTS.includes(intent) : false;
  const steps = needsProject ? ['Intent', 'You', 'Project'] : ['Intent', 'You', 'Message'];
  const lastStep = steps.length - 1;

  // Move focus to the new step's heading only when the step actually changes (never on load,
  // and StrictMode's double effect run can't trigger it either).
  const shown = useRef({ step, done });
  useEffect(() => {
    if (shown.current.step === step && shown.current.done === done) return;
    shown.current = { step, done };
    headingRef.current?.focus();
  }, [step, done]);

  function set<K extends keyof Fields>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      const rest = { ...e };
      delete rest[key];
      return rest;
    });
  }

  function validateDetails(): boolean {
    const next: Record<string, string> = {};
    if (!fields.name.trim()) next.name = 'Tell me your name.';
    if (!/^\S+@\S+\.\S+$/.test(fields.email)) next.email = 'That email doesn’t look right.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit() {
    if (fields.message.trim().length < 10) {
      setErrors({ message: 'A little more detail please (10+ characters).' });
      return;
    }
    if (!token) {
      setFormError('Please complete the quick human check.');
      return;
    }
    setFormError(undefined);
    const utm = Object.fromEntries(
      [...new URLSearchParams(window.location.search)].filter(([k]) => k.startsWith('utm_')),
    );
    startTransition(async () => {
      const result = await submitLead({
        intent,
        name: fields.name,
        email: fields.email,
        company: fields.company || undefined,
        budgetRange: needsProject && fields.budgetRange ? fields.budgetRange : undefined,
        timeline: needsProject && fields.timeline ? fields.timeline : undefined,
        message: fields.message,
        locale: 'en',
        source: window.location.pathname,
        utm: Object.keys(utm).length ? utm : undefined,
        turnstileToken: token,
        website: fields.website,
      });
      if (result.ok) {
        setDone(true);
        return;
      }
      setFormError(result.error);
      setErrors(result.fieldErrors ?? {});
      setResetSignal((n) => n + 1);
    });
  }

  if (done) {
    return (
      <div className="border-ink/15 rounded-card relative isolate overflow-hidden border p-8 text-center md:p-16">
        <Confetti />
        <h2 ref={headingRef} tabIndex={-1} className="text-h2 font-medium outline-none">
          Message received.
        </h2>
        <p className="mx-auto mt-6 max-w-[40ch] text-xl">
          Thanks, {fields.name.split(' ')[0]}. A confirmation is on its way to {fields.email}, and I
          reply to every real message personally.
        </p>
        <div className="mt-10 flex justify-center">
          <Button href="/work">Explore the work meanwhile</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-ink/15 rounded-card border p-6 md:p-10">
      <ol aria-label="Progress" className="flex flex-wrap items-center gap-2">
        {steps.map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? 'step' : undefined}
            className={cn(
              'rounded-pill px-3 py-1 font-mono text-xs tracking-[0.14em] uppercase',
              i === step
                ? 'bg-ink text-canvas'
                : i < step
                  ? 'border-ink/15 border'
                  : 'border-ink/15 text-ink-soft border',
            )}
          >
            {String(i + 1).padStart(2, '0')} {label}
          </li>
        ))}
      </ol>

      <form
        id={formId}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (step === 1 && validateDetails()) setStep(2);
          else if (step === lastStep) submit();
        }}
        className="mt-8"
      >
        {/* Honeypot: hidden from people and assistive tech. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Website
            <input
              tabIndex={-1}
              autoComplete="off"
              value={fields.website}
              onChange={(e) => set('website', e.target.value)}
            />
          </label>
        </div>

        {step === 0 && (
          <fieldset>
            <legend>
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="text-3xl font-medium tracking-[-0.03em] outline-none md:text-4xl"
              >
                What brings you here?
              </h2>
            </legend>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {intents.map((option) => (
                <label
                  key={option.id}
                  className={cn(
                    'rounded-card group relative flex cursor-pointer items-start gap-4 border p-5 transition-colors',
                    intent === option.id
                      ? 'bg-ink text-canvas border-transparent'
                      : 'border-ink/15 hover:border-ink/40',
                  )}
                >
                  <input
                    type="radio"
                    name="intent"
                    value={option.id}
                    checked={intent === option.id}
                    onChange={() => {
                      setIntent(option.id);
                      setStep(1);
                    }}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={cn('mt-1.5 size-3 shrink-0 rounded-full', accentBg[option.tone])}
                  />
                  <span>
                    <span className="block text-lg font-medium">{option.label}</span>
                    <span className="block text-sm opacity-70">{option.note}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {step === 1 && (
          <div>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-3xl font-medium tracking-[-0.03em] outline-none md:text-4xl"
            >
              Who am I talking to?
            </h2>
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <Field label="Name" error={errors.name} htmlFor={`${formId}-name`}>
                <input
                  id={`${formId}-name`}
                  autoComplete="name"
                  value={fields.name}
                  onChange={(e) => set('name', e.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? `${formId}-name-err` : undefined}
                  className={inputClass}
                />
              </Field>
              <Field label="Email" error={errors.email} htmlFor={`${formId}-email`}>
                <input
                  id={`${formId}-email`}
                  type="email"
                  autoComplete="email"
                  value={fields.email}
                  onChange={(e) => set('email', e.target.value)}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? `${formId}-email-err` : undefined}
                  className={inputClass}
                />
              </Field>
              <Field
                label="Company (optional)"
                htmlFor={`${formId}-company`}
                className="md:col-span-2"
              >
                <input
                  id={`${formId}-company`}
                  autoComplete="organization"
                  value={fields.company}
                  onChange={(e) => set('company', e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        )}

        {step === lastStep && step > 1 && (
          <div>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-3xl font-medium tracking-[-0.03em] outline-none md:text-4xl"
            >
              {needsProject ? 'Tell me about the project.' : 'What’s on your mind?'}
            </h2>
            {needsProject && (
              <div className="mt-8 grid gap-6 md:grid-cols-2">
                <ChoiceGroup
                  legend="Budget range"
                  options={BUDGET_RANGES}
                  value={fields.budgetRange}
                  onChange={(v) => set('budgetRange', v)}
                />
                <ChoiceGroup
                  legend="Timeline"
                  options={TIMELINES}
                  value={fields.timeline}
                  onChange={(v) => set('timeline', v)}
                />
              </div>
            )}
            <Field
              label="Message"
              error={errors.message}
              htmlFor={`${formId}-message`}
              className="mt-6"
            >
              <textarea
                id={`${formId}-message`}
                rows={6}
                value={fields.message}
                onChange={(e) => set('message', e.target.value)}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? `${formId}-message-err` : undefined}
                placeholder="What are you building, and where could I help?"
                className={cn(inputClass, 'resize-y')}
              />
            </Field>
            <Turnstile onToken={setToken} resetSignal={resetSignal} className="mt-6" />
          </div>
        )}

        {formError && (
          <p role="alert" className="bg-create on-world rounded-button mt-6 px-4 py-3 font-medium">
            {formError}
          </p>
        )}

        {step > 0 && (
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="font-medium underline decoration-2 underline-offset-[6px]"
            >
              ‹ Back
            </button>
            <Button type="submit" disabled={pending || (step === lastStep && !TURNSTILE_KEY)}>
              {step === lastStep ? (pending ? 'Sending…' : 'Send message') : 'Continue'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-2 block font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${htmlFor}-err`} className="mt-2 text-sm font-medium text-[var(--create)]">
          {error}
        </p>
      )}
    </div>
  );
}

function ChoiceGroup({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-3 font-medium">
        {legend} <span className="text-ink-soft font-normal">(optional)</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option}
            className={cn(
              'rounded-pill cursor-pointer border px-4 py-2 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--signal)]',
              value === option
                ? 'bg-ink text-canvas border-transparent'
                : 'border-ink/15 hover:border-ink/40',
            )}
          >
            <input
              type="radio"
              name={legend}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const CONFETTI_COLORS = ['bg-spark', 'bg-create', 'bg-signal', 'bg-idea', 'bg-paper'];

/** World-coloured confetti burst. CSS only; hidden under reduced motion. */
function Confetti() {
  return (
    <div aria-hidden="true" className="confetti pointer-events-none absolute inset-0 -z-10">
      {Array.from({ length: 36 }, (_, i) => (
        <span
          key={i}
          className={cn(
            'confetti-bit absolute top-0 block h-3 w-1.5 rounded-sm',
            CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          )}
          style={{
            left: `${(i * 97) % 100}%`,
            animationDelay: `${(i % 12) * 0.08}s`,
            animationDuration: `${1.6 + (i % 5) * 0.25}s`,
            ['--drift' as string]: `${((i * 37) % 120) - 60}px`,
            ['--spin' as string]: `${(i % 2 ? 1 : -1) * (360 + i * 20)}deg`,
          }}
        />
      ))}
    </div>
  );
}
