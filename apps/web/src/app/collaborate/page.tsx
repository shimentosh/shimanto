import { type Accent, Container, Icon, Squiggle, accentBg, cn } from '@shimanto/ui';
import { LeadIntentSchema } from '@shimanto/types';
import { CollaborateForm, type PublicIntent } from '@/components/page/collaborate-form';
import { AuthorAvatar } from '@/components/page/article';
import { Masthead } from '@/components/page/masthead';
import { site } from '@/lib/site';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Collaborate',
  description:
    'Work with Shimanto: build something, consulting, business or product collaboration, partnerships and speaking.',
  path: '/collaborate',
});

const nextSteps: Array<{ text: string; tone: Accent }> = [
  { text: 'You get a confirmation email right away.', tone: 'build' },
  { text: 'I read every message myself.', tone: 'spark' },
  { text: 'If it fits, we set up a call.', tone: 'signal' },
];

type Props = { searchParams: Promise<{ intent?: string | string[] }> };

export default async function CollaboratePage({ searchParams }: Props) {
  const raw = (await searchParams).intent;
  const parsed = LeadIntentSchema.exclude(['SUPPORT']).safeParse(Array.isArray(raw) ? raw[0] : raw);
  const initialIntent: PublicIntent | undefined = parsed.success ? parsed.data : undefined;
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

  return (
    <main id="main">
      <Masthead
        crumbs={[{ label: 'Collaborate', href: '/collaborate' }]}
        kicker="Collaborate / Build · Consult · Partner"
        world="spark"
        title={
          <>
            Let&apos;s <Squiggle world="build">build</Squiggle> something.
          </>
        }
        intro="Got a business, a product or a messy process that needs a system? Pick what fits and tell me what you're building."
      />
      <section className="pb-24 md:pb-32">
        <Container className="grid items-start gap-6 lg:grid-cols-[1fr_340px] lg:gap-8">
          <div className="border-ink/10 bg-paper rounded-sheet border p-6 md:p-10">
            <CollaborateForm initialIntent={initialIntent} />
          </div>
          <aside className="space-y-4 lg:sticky lg:top-28">
            <div className="border-ink/10 rounded-sheet bg-ink/[0.03] border p-6">
              <div className="flex items-center gap-4">
                <AuthorAvatar tone="build" size={56} />
                <div>
                  <p className="font-medium">{site.name}</p>
                  <p className="text-ink-soft text-sm">You talk to me, not a sales team.</p>
                </div>
              </div>
              <p className="text-ink-soft mt-6 font-mono text-xs tracking-[0.14em] uppercase">
                What happens next
              </p>
              <ol className="relative mt-4 space-y-5">
                <span
                  aria-hidden="true"
                  className="bg-ink/15 absolute top-3 bottom-3 left-[13px] w-px"
                />
                {nextSteps.map((step, i) => (
                  <li key={step.text} className="relative flex items-start gap-3.5">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'on-world ring-canvas relative grid size-7 shrink-0 place-items-center rounded-full font-mono text-[11px] font-medium ring-4',
                        accentBg[step.tone],
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="pt-0.5 leading-snug">{step.text}</span>
                  </li>
                ))}
              </ol>
            </div>
            {email && (
              <a
                href={`mailto:${email}`}
                className="group border-ink/10 hover:border-ink/25 rounded-sheet flex items-center gap-4 border p-6 transition-colors"
              >
                <span
                  aria-hidden="true"
                  className="bg-signal on-world grid size-11 shrink-0 place-items-center rounded-xl"
                >
                  <Icon name="mail" className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="text-ink-soft block text-sm">Prefer email?</span>
                  <span className="block font-medium break-all group-hover:underline">{email}</span>
                </span>
              </a>
            )}
          </aside>
        </Container>
      </section>
    </main>
  );
}
