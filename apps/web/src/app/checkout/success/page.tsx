import { Button, Container, Spot, Squiggle } from '@shimanto/ui';
import type { Metadata } from 'next';
import { AccessLinkForm } from '@/components/store/access-link-form';
import { ConfirmPurchase } from '@/components/store/confirm-purchase';
import { PORTAL_URL } from '@/lib/public-env';

export const metadata: Metadata = {
  title: 'Thank you',
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{
    order?: string | string[];
    free?: string | string[];
    account?: string | string[];
    session?: string | string[];
  }>;
};

/**
 * Stripe's success URL (`/checkout/success?order=N`) and the landing for $0 orders. Nothing here
 * trusts the URL: the order is confirmed by the payment webhook and shown in the customer portal.
 */
export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const query = await searchParams;
  const raw = Array.isArray(query.order) ? query.order[0] : query.order;
  const order = raw && /^\d{1,10}$/.test(raw) ? raw : undefined;
  const free = Boolean(query.free);
  const signedIn = Boolean(query.account);
  const rawSession = Array.isArray(query.session) ? query.session[0] : query.session;
  const session = rawSession && /^[\w-]{8,200}$/.test(rawSession) ? rawSession : undefined;
  const orderUrl = order ? `${PORTAL_URL}/orders/${order}` : `${PORTAL_URL}/orders`;

  return (
    <main id="main">
      {session && <ConfirmPurchase session={session} />}
      <section className="pt-28 pb-24 md:pt-36 md:pb-32">
        <Container>
          <div className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-ink-soft flex items-center gap-2 text-sm font-medium">
                <span aria-hidden="true" className="bg-build size-2 rounded-full" />
                {order ? `Order #${order}` : 'Your order'}
              </p>
              <h1 className="mt-4 max-w-[16ch] text-[clamp(38px,5.4vw,68px)] leading-[1.02] font-medium tracking-[-0.045em]">
                {free ? 'It’s yours.' : 'Thank you!'} <Squiggle world="build">Check</Squiggle> your
                inbox.
              </h1>
              <p className="text-ink-soft mt-5 max-w-[56ch] text-lg leading-relaxed md:text-xl">
                {free
                  ? 'Your order is confirmed and delivered to your account.'
                  : 'We’re confirming your payment with Stripe; it takes a few seconds. Your receipt follows by email.'}{' '}
                {signedIn
                  ? 'Open your account to download files or manage repository access.'
                  : 'We’ve emailed you a link to your account, where your downloads and repository access live. Check spam or promotions if you don’t see it.'}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button href={orderUrl}>Open your account</Button>
                <Button href="/products" variant="secondary">
                  Back to the store
                </Button>
              </div>
            </div>
            <div className="hidden w-64 md:block lg:w-72">
              <Spot name="mail" float />
            </div>
          </div>

          <div className="border-ink/10 mt-16 grid gap-12 border-t pt-12 md:grid-cols-2">
            <div>
              <p className="text-ink-soft text-sm font-medium">No email?</p>
              <h2 className="mt-2 text-2xl font-medium tracking-[-0.03em]">Get a sign-in link.</h2>
              <p className="text-ink-soft mt-2 mb-6">
                Enter the email you used at checkout and we’ll send a one-time link to your account.
              </p>
              <AccessLinkForm />
            </div>
            <div>
              <p className="text-ink-soft text-sm font-medium">Need a hand?</p>
              <h2 className="mt-2 text-2xl font-medium tracking-[-0.03em]">I’m here.</h2>
              <p className="text-ink-soft mt-2 mb-6">
                Problems downloading, GitHub access, a question about your order or an invoice for
                your company: open a support ticket from your account.
              </p>
              <Button href={`${PORTAL_URL}/support/new`} variant="secondary">
                Open a ticket
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
