'use client';

import { ApiError, createHttpClient, errorMessage, fieldErrors } from '@shimanto/sdk';
import type { CheckoutQuote, CheckoutResult, CustomerMe } from '@shimanto/types';
import { Button, Icon, Spot, cn } from '@shimanto/ui';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { analytics } from '@/components/analytics/analytics';
import { Turnstile } from '@/components/page/turnstile';
import { PORTAL_URL, PUBLIC_API_URL, PUBLIC_SITE_URL } from '@/lib/public-env';
import { formatPrice } from '@/lib/store';

const api = createHttpClient({ baseUrl: PUBLIC_API_URL });

const inputClass =
  'border-ink/15 placeholder:text-ink-soft/70 rounded-button w-full border bg-transparent px-4 py-3 text-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)] aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-[var(--create)]';

type Blocked = { kind: 'account-exists' } | { kind: 'owned'; message: string } | null;

function money(amount: number, currency: string) {
  return formatPrice(amount, currency);
}

export function Checkout() {
  const id = useId();
  const router = useRouter();
  const params = useSearchParams();
  const items = useMemo(
    () =>
      (params.get('items') ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => /^[a-z0-9-]{1,120}$/.test(s))
        .slice(0, 10)
        .map((slug) => ({ slug })),
    [params],
  );
  const cancelled = params.get('cancelled') === '1';

  const [me, setMe] = useState<CustomerMe | null | undefined>(undefined);
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState(params.get('coupon') ?? '');
  const [coupon, setCoupon] = useState(params.get('coupon') ?? '');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [withPassword, setWithPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [website, setWebsite] = useState('');
  const [token, setToken] = useState<string>();
  const [resetSignal, setResetSignal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [blocked, setBlocked] = useState<Blocked>(null);

  // Signed in? (optional: guests check out with an email)
  useEffect(() => {
    let cancelledReq = false;
    api.get<CustomerMe>('/v1/account/me').then(
      (value) => !cancelledReq && setMe(value),
      () => !cancelledReq && setMe(null),
    );
    return () => {
      cancelledReq = true;
    };
  }, []);

  const checkoutTracked = useRef(false);

  // Price the cart (and coupon) on the server.
  useEffect(() => {
    if (!items.length) return;
    let cancelledReq = false;
    api.post<CheckoutQuote>('/v1/checkout/quote', { items, couponCode: coupon || undefined }).then(
      (value) => {
        if (cancelledReq) return;
        setQuote(value);
        setQuoteError(null);
        // begin_checkout once per checkout page (not again when a coupon re-prices it).
        if (!checkoutTracked.current) {
          checkoutTracked.current = true;
          analytics.trackBeginCheckout({
            value: value.total,
            currency: value.currency,
            ...(value.discount ? { discount: value.discount } : {}),
            ...(value.coupon ? { coupon: value.coupon.code } : {}),
            items: value.items.map((i) => ({
              item_id: i.slug,
              item_name: i.name,
              price: i.unitPrice,
              quantity: i.quantity,
              ...(i.discount ? { discount: Math.round(i.discount / i.quantity) } : {}),
            })),
          });
        }
      },
      (e: unknown) => {
        if (cancelledReq) return;
        setQuoteError(
          e instanceof ApiError && e.status === 404
            ? 'This product isn’t available to buy right now.'
            : errorMessage(e),
        );
      },
    );
    return () => {
      cancelledReq = true;
    };
  }, [items, coupon]);

  // Same on server and client (no hydration mismatch): back to this checkout after signing in.
  const returnUrl = `${PUBLIC_SITE_URL}/checkout?${params.toString()}`;
  const loginHref = `${PORTAL_URL}/login?return=${encodeURIComponent(returnUrl)}${email ? `&email=${encodeURIComponent(email)}` : ''}`;

  const submit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      if (!quote) return;
      setError(null);
      setFields({});
      setBlocked(null);
      if (!me && !/^\S+@\S+\.\S+$/.test(email)) {
        setFields({ email: 'Enter the email for your receipt and account.' });
        return;
      }
      if (!token) {
        setError('Please complete the quick human check.');
        return;
      }
      setBusy(true);
      const utm = Object.fromEntries([...params].filter(([k]) => k.startsWith('utm_')));
      try {
        const result = await api.post<CheckoutResult>('/v1/checkout', {
          items,
          couponCode: quote.coupon?.code,
          ...(me
            ? {}
            : {
                email,
                name: name || undefined,
                password: withPassword && password ? password : undefined,
              }),
          locale: 'en',
          turnstileToken: token,
          utm: Object.keys(utm).length ? utm : undefined,
          attribution: analytics.attributionPayload(),
          website,
        });
        if (result.kind === 'redirect') {
          window.location.assign(result.url);
          return;
        }
        // $0 order: confirmed by the server in this response, so pixels may count it now.
        if (result.purchase) analytics.trackPurchase(result.purchase);
        router.push(
          `/checkout/success?order=${result.orderNumber}&free=1${result.signedIn ? '&account=1' : ''}`,
        );
      } catch (e) {
        const code =
          e instanceof ApiError ? (e.body as { code?: string } | undefined)?.code : undefined;
        if (code === 'ACCOUNT_EXISTS') setBlocked({ kind: 'account-exists' });
        else if (code === 'ALREADY_OWNED') setBlocked({ kind: 'owned', message: errorMessage(e) });
        else {
          const byField = fieldErrors(e);
          setFields(byField);
          setError(
            Object.keys(byField).length ? 'Please check the highlighted fields.' : errorMessage(e),
          );
        }
        setResetSignal((n) => n + 1);
        setToken(undefined);
        setBusy(false);
      }
    },
    [quote, me, email, token, params, items, name, withPassword, password, website, router],
  );

  if (!items.length) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto w-48">
          <Spot name="package" />
        </div>
        <h1 className="mt-6 text-4xl font-medium tracking-[-0.04em]">Your cart is empty</h1>
        <p className="text-ink-soft mt-3">Pick something from the store to check out.</p>
        <Button href="/products" className="mt-8">
          Browse the store
        </Button>
      </div>
    );
  }

  const free = quote ? !quote.paymentRequired : false;

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
      <div>
        <p className="text-ink-soft font-mono text-xs tracking-[0.2em] uppercase">Checkout</p>
        <h1 className="mt-3 text-[clamp(36px,5vw,56px)] leading-[1.02] font-medium tracking-[-0.045em]">
          {free ? 'Claim it in a minute.' : 'Almost yours.'}
        </h1>
        {cancelled && (
          <p role="status" className="bg-spark/30 mt-6 rounded-[14px] px-4 py-3">
            Payment was cancelled, nothing was charged. You can try again below.
          </p>
        )}

        <form onSubmit={submit} className="mt-10 space-y-6" noValidate>
          {/* Honeypot: hidden from people and assistive tech. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label>
              Website
              <input
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </label>
          </div>

          {me === undefined ? (
            <div className="bg-ink/[0.05] h-28 animate-pulse rounded-[16px]" aria-hidden="true" />
          ) : me ? (
            <div className="border-ink/10 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border px-5 py-4">
              <div>
                <p className="text-ink-soft text-sm">Signed in as</p>
                <p className="text-lg font-medium">
                  {me.name ? `${me.name} · ${me.email}` : me.email}
                </p>
              </div>
              <a
                href={`${PORTAL_URL}/`}
                className="text-ink-soft hover:text-ink text-sm font-medium underline underline-offset-4"
              >
                Your account
              </a>
            </div>
          ) : (
            <fieldset className="space-y-5">
              <legend className="mb-1 text-xl font-medium tracking-[-0.02em]">Your details</legend>
              <p className="text-ink-soft -mt-2 text-[15px]">
                Have an account?{' '}
                <a href={loginHref} className="text-ink font-medium underline underline-offset-4">
                  Sign in
                </a>
              </p>
              <div>
                <label htmlFor={`${id}-email`} className="mb-2 block font-medium">
                  Email
                </label>
                <input
                  id={`${id}-email`}
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={Boolean(fields.email)}
                  aria-describedby={`${id}-email-help`}
                  className={inputClass}
                />
                <p
                  id={`${id}-email-help`}
                  className={cn(
                    'mt-2 text-sm',
                    fields.email ? 'font-medium text-[var(--create)]' : 'text-ink-soft',
                  )}
                >
                  {fields.email ??
                    'Your receipt goes here, and your purchase lives in an account for this email.'}
                </p>
              </div>
              <div>
                <label htmlFor={`${id}-name`} className="mb-2 block font-medium">
                  Name <span className="text-ink-soft font-normal">(optional)</span>
                </label>
                <input
                  id={`${id}-name`}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="accent-ink mt-1.5 size-4"
                  checked={withPassword}
                  onChange={(e) => setWithPassword(e.target.checked)}
                />
                <span>
                  <span className="font-medium">Create a password now</span>
                  <span className="text-ink-soft block text-sm">
                    Optional. Otherwise we email you a sign-in link.
                  </span>
                </span>
              </label>
              {withPassword && (
                <div>
                  <label htmlFor={`${id}-password`} className="mb-2 block font-medium">
                    Password
                  </label>
                  <input
                    id={`${id}-password`}
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={Boolean(fields.password)}
                    aria-describedby={`${id}-password-help`}
                    className={inputClass}
                  />
                  <p
                    id={`${id}-password-help`}
                    className={cn(
                      'mt-2 text-sm',
                      fields.password ? 'font-medium text-[var(--create)]' : 'text-ink-soft',
                    )}
                  >
                    {fields.password ?? 'At least 8 characters.'}
                  </p>
                </div>
              )}
            </fieldset>
          )}

          {blocked?.kind === 'account-exists' && (
            <div role="alert" className="bg-signal/10 rounded-[14px] px-4 py-3">
              <p className="font-medium">You already have an account with this email.</p>
              <p className="text-ink-soft mt-1 text-[15px]">
                <a href={loginHref} className="text-ink font-medium underline underline-offset-4">
                  Sign in
                </a>{' '}
                to check out. Forgot your password? You can reset it there.
              </p>
            </div>
          )}
          {blocked?.kind === 'owned' && (
            <div role="alert" className="bg-build/20 rounded-[14px] px-4 py-3">
              <p className="font-medium">{blocked.message}</p>
              <a
                href={`${PORTAL_URL}/products`}
                className="mt-1 inline-block font-medium underline underline-offset-4"
              >
                Open your products
              </a>
            </div>
          )}

          <Turnstile onToken={setToken} resetSignal={resetSignal} />

          {error && (
            <p role="alert" className="font-medium text-[var(--create)]">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={busy || !quote || me === undefined}
            className="w-full justify-center py-3 text-lg sm:w-auto"
          >
            {busy
              ? free
                ? 'Claiming…'
                : 'Starting payment…'
              : !quote
                ? 'Loading…'
                : free
                  ? 'Get it free'
                  : `Pay ${money(quote.total, quote.currency)}`}
          </Button>
          <p className="text-ink-soft text-sm">
            {free
              ? 'No card needed. Your order goes through the same secure process as any purchase.'
              : 'You’ll pay on Stripe’s secure page. Card details never touch this site.'}{' '}
            By continuing you agree to the{' '}
            <Link href="/legal/terms" className="underline underline-offset-4">
              terms
            </Link>{' '}
            and{' '}
            <Link href="/legal/refund" className="underline underline-offset-4">
              refund policy
            </Link>
            .
          </p>
        </form>
      </div>

      <aside className="lg:pt-16">
        <div className="bg-paper rounded-[24px] p-6 md:p-8">
          <h2 className="text-xl font-medium tracking-[-0.02em]">Order summary</h2>
          {quoteError ? (
            <div className="mt-6">
              <p role="alert" className="font-medium">
                {quoteError}
              </p>
              <Button href="/products" variant="secondary" className="mt-4">
                Back to the store
              </Button>
            </div>
          ) : !quote ? (
            <div className="mt-6 space-y-3" aria-hidden="true">
              <div className="bg-ink/[0.06] h-6 animate-pulse rounded" />
              <div className="bg-ink/[0.06] h-6 w-2/3 animate-pulse rounded" />
            </div>
          ) : (
            <>
              <ul className="divide-ink/[0.07] mt-6 divide-y">
                {quote.items.map((item) => (
                  <li
                    key={item.productId}
                    className="flex items-start justify-between gap-4 py-3 first:pt-0"
                  >
                    <div>
                      <p className="font-medium">
                        {item.name}
                        {item.quantity > 1 && (
                          <span className="text-ink-soft font-normal"> × {item.quantity}</span>
                        )}
                      </p>
                      <p className="text-ink-soft mt-0.5 flex flex-wrap gap-x-3 text-sm">
                        {item.deliveryMethods.includes('R2') && (
                          <span className="inline-flex items-center gap-1">
                            <Icon name="download" className="size-3.5" /> Download
                          </span>
                        )}
                        {item.deliveryMethods.includes('GITHUB') && (
                          <span className="inline-flex items-center gap-1">
                            <Icon name="github" className="size-3.5" /> GitHub repository
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right tabular-nums">
                      {item.discount > 0 && (
                        <p className="text-ink-soft text-sm line-through">
                          {money(item.unitPrice * item.quantity, quote.currency)}
                        </p>
                      )}
                      <p>{money(item.total, quote.currency)}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <form
                className="border-ink/10 mt-4 flex gap-2 border-t pt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setCoupon(couponInput.trim());
                }}
              >
                <label htmlFor={`${id}-coupon`} className="sr-only">
                  Coupon code
                </label>
                <input
                  id={`${id}-coupon`}
                  placeholder="Coupon code"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  className="border-ink/15 rounded-button min-w-0 flex-1 border bg-transparent px-3 py-2 uppercase outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]"
                />
                <button
                  type="submit"
                  className="border-ink/20 hover:border-ink/50 rounded-pill border px-4 font-medium"
                >
                  Apply
                </button>
              </form>
              {quote.couponError && coupon && (
                <p role="alert" className="mt-2 text-sm font-medium text-[var(--create)]">
                  {quote.couponError}
                </p>
              )}
              {quote.coupon && (
                <p className="mt-2 flex items-center justify-between text-sm">
                  <span>
                    Coupon <strong>{quote.coupon.code}</strong> applied
                  </span>
                  <button
                    type="button"
                    className="text-ink-soft hover:text-ink underline underline-offset-4"
                    onClick={() => {
                      setCoupon('');
                      setCouponInput('');
                    }}
                  >
                    Remove
                  </button>
                </p>
              )}

              <dl className="border-ink/10 mt-4 space-y-1.5 border-t pt-4 tabular-nums">
                {quote.discount > 0 && (
                  <>
                    <div className="text-ink-soft flex justify-between">
                      <dt>Subtotal</dt>
                      <dd>{money(quote.subtotal, quote.currency)}</dd>
                    </div>
                    <div className="text-ink-soft flex justify-between">
                      <dt>Discount</dt>
                      <dd>−{money(quote.discount, quote.currency)}</dd>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-xl font-medium">
                  <dt>Total</dt>
                  <dd>{money(quote.total, quote.currency)}</dd>
                </div>
              </dl>

              {quote.requiresGithub && (
                <div className="bg-canvas mt-6 flex gap-3 rounded-[14px] p-4 text-[15px]">
                  <Icon name="github" className="mt-0.5 size-5" />
                  <p>
                    <span className="font-medium">Includes private GitHub repository access.</span>{' '}
                    <span className="text-ink-soft">
                      {me?.github.connected
                        ? `We’ll invite @${me.github.login} right after checkout.`
                        : 'After checkout, connect your GitHub account in your account page and the invitation is sent automatically.'}
                    </span>
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
