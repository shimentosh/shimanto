import type {
  AnalyticsEventName,
  AnalyticsItem,
  AttributionInput,
  BrowserEventName,
  CollectInput,
  ConfirmedPurchase,
  Consent,
  Ecommerce,
  PublicTrackingConfig,
  Touch,
} from '@shimanto/types';
import {
  type AttributionState,
  gaClientId,
  nextAttribution,
  touchFromLocation,
} from './attribution.js';

type Params = Record<string, unknown>;

interface TrackingWindow {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  fbq?: ((...args: unknown[]) => void) & {
    queue?: unknown[];
    callMethod?: (...args: unknown[]) => void;
  };
  _fbq?: unknown;
}

export interface AnalyticsClientOptions {
  /** API base URL (for the first-party collector). */
  apiUrl: string;
  /** e.g. `.shimanto.xyz`, so the site and the portal share visitor ids and attribution. */
  cookieDomain?: string;
  /** Our own hosts: referrals from these are internal navigation, not marketing. */
  ownHosts?: string[];
}

const COOKIES = {
  anonymousId: 'sx_aid',
  sessionId: 'sx_sid',
  first: 'sx_ft',
  last: 'sx_lt',
  consent: 'sx_consent',
} as const;
const FIRED_KEY = 'sx_fired';
const SESSION_MINUTES = 30;

/** Events the browser never sends to GA4 directly: the server sends them (Measurement Protocol). */
const SERVER_OWNED: AnalyticsEventName[] = ['purchase', 'refund', 'sign_up'];
/** Events kept in the internal database from the browser. */
const COLLECTED: BrowserEventName[] = [
  'page_view',
  'view_item',
  'add_to_cart',
  'remove_from_cart',
  'begin_checkout',
];
const META_EVENTS: Partial<Record<AnalyticsEventName, string>> = {
  page_view: 'PageView',
  view_item: 'ViewContent',
  add_to_cart: 'AddToCart',
  begin_checkout: 'InitiateCheckout',
  sign_up: 'CompleteRegistration',
  purchase: 'Purchase',
};

const randomId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

/** Minor units → major units (what GA4 / Meta expect), respecting zero-decimal currencies. */
export function toMajor(amount: number, currency: string): number {
  let digits = 2;
  try {
    digits =
      new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
        .maximumFractionDigits ?? 2;
  } catch {
    // keep 2
  }
  return Number((amount / 10 ** digits).toFixed(digits));
}

/**
 * The one analytics entry point for React code. Components call `trackViewItem(…)` etc.;
 * this client decides, per consent and configuration, what goes to GTM's dataLayer, GA4 (gtag),
 * Meta Pixel, Google Ads and the internal collector. No component touches a vendor API.
 */
export class AnalyticsClient {
  private config: PublicTrackingConfig | null = null;
  private loaded = { gtm: false, ga4: false, meta: false, ads: false };
  private lastPage: string | null = null;

  constructor(private readonly opts: AnalyticsClientOptions) {}

  private get w(): (Window & TrackingWindow) | null {
    return typeof window === 'undefined' ? null : (window as Window & TrackingWindow);
  }

  // ───────────── Cookies (first-party, no secrets, no PII) ─────────────

  private readCookie(name: string): string | undefined {
    if (typeof document === 'undefined') return undefined;
    const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
  }

  private writeCookie(name: string, value: string, maxAgeSeconds: number) {
    if (typeof document === 'undefined') return;
    const domain = this.opts.cookieDomain ? `; domain=${this.opts.cookieDomain}` : '';
    const secure = location.protocol === 'https:' ? '; secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax${domain}${secure}`;
  }

  private readJson<T>(name: string): T | null {
    try {
      const raw = this.readCookie(name);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  get anonymousId(): string {
    let id = this.readCookie(COOKIES.anonymousId);
    if (!id) id = randomId();
    this.writeCookie(COOKIES.anonymousId, id, 400 * 86_400);
    return id;
  }

  /** Rolling 30-minute session. Numeric, so GA4 accepts it as `session_id`. */
  get sessionId(): string {
    const id = this.readCookie(COOKIES.sessionId) || String(Date.now());
    this.writeCookie(COOKIES.sessionId, id, SESSION_MINUTES * 60);
    return id;
  }

  get attribution(): AttributionState {
    return { first: this.readJson<Touch>(COOKIES.first), last: this.readJson<Touch>(COOKIES.last) };
  }

  // ───────────── Consent ─────────────

  getConsent(): Consent | null {
    const c = this.readJson<Consent>(COOKIES.consent);
    return c && typeof c.analytics === 'boolean' && typeof c.marketing === 'boolean' ? c : null;
  }

  /** True when the banner should show (consent required and not yet given). */
  needsConsent(): boolean {
    return Boolean(this.config?.requireConsent) && !this.getConsent();
  }

  private allowed(kind: keyof Consent): boolean {
    if (!this.config) return false;
    if (!this.config.requireConsent) return true;
    return Boolean(this.getConsent()?.[kind]);
  }

  setConsent(consent: Consent) {
    this.writeCookie(COOKIES.consent, JSON.stringify(consent), 180 * 86_400);
    this.gtag('consent', 'update', this.consentMode());
    this.loadTags();
    // The first page of the visit was not tracked yet.
    this.lastPage = null;
    this.trackPageView();
  }

  private consentMode() {
    const analytics = this.allowed('analytics') ? 'granted' : 'denied';
    const marketing = this.allowed('marketing') ? 'granted' : 'denied';
    return {
      analytics_storage: analytics,
      ad_storage: marketing,
      ad_user_data: marketing,
      ad_personalization: marketing,
    };
  }

  // ───────────── Setup ─────────────

  /** Call once per page load with the public config. Captures attribution and loads allowed tags. */
  init(config: PublicTrackingConfig) {
    if (!this.w) return;
    this.config = config;
    const w = this.w;
    w.dataLayer = w.dataLayer ?? [];
    if (!w.gtag) {
      w.gtag = function gtag() {
        // gtag must push the `arguments` object itself.
        // eslint-disable-next-line prefer-rest-params
        w.dataLayer!.push(arguments);
      };
      w.gtag('consent', 'default', { ...this.consentMode(), wait_for_update: 500 });
    }
    // Touch ids so they exist before any checkout.
    void this.anonymousId;
    void this.sessionId;
    if (config.utmTracking) this.captureAttribution();
    this.loadTags();
  }

  private captureAttribution() {
    if (!this.config) return;
    const hosts = this.opts.ownHosts ?? [location.hostname.replace(/^www\./, '')];
    const touch = touchFromLocation(location.href, document.referrer, hosts);
    const next = nextAttribution(
      this.attribution,
      touch,
      { href: location.href, referrer: document.referrer },
      {
        firstTouch: this.config.firstTouch,
        lastTouch: this.config.lastTouch,
      },
    );
    if (next.first) this.writeCookie(COOKIES.first, JSON.stringify(next.first), 180 * 86_400);
    if (next.last) this.writeCookie(COOKIES.last, JSON.stringify(next.last), 30 * 86_400);
  }

  private addScript(src: string) {
    const s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  private loadTags() {
    const c = this.config;
    const w = this.w;
    if (!c || !w) return;
    const analytics = this.allowed('analytics');
    const marketing = this.allowed('marketing');

    // GTM owns GA4/Ads when present (configure them in GTM from the dataLayer events).
    if (c.gtmContainerId && (analytics || marketing) && !this.loaded.gtm) {
      this.loaded.gtm = true;
      w.dataLayer!.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      this.addScript(
        `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(c.gtmContainerId)}`,
      );
    }
    if (!c.gtmContainerId && c.ga4MeasurementId && analytics && !this.loaded.ga4) {
      this.loaded.ga4 = true;
      this.addScript(
        `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(c.ga4MeasurementId)}`,
      );
      this.gtag('js', new Date());
      // Page views are sent by trackPageView (one per navigation), not automatically.
      this.gtag('config', c.ga4MeasurementId, { send_page_view: false });
    }
    if (!c.gtmContainerId && c.googleAds && marketing && !this.loaded.ads) {
      this.loaded.ads = true;
      if (!this.loaded.ga4)
        this.addScript(
          `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(c.googleAds.conversionId)}`,
        );
      this.gtag('js', new Date());
      this.gtag('config', c.googleAds.conversionId);
    }
    if (c.metaPixelId && marketing && !this.loaded.meta) {
      this.loaded.meta = true;
      if (!w.fbq) {
        type Fbq = NonNullable<TrackingWindow['fbq']>;
        const fbq = function fbq(...args: unknown[]) {
          const self = fbq as Fbq;
          if (self.callMethod) self.callMethod(...args);
          else self.queue!.push(args);
        } as NonNullable<TrackingWindow['fbq']> & {
          loaded?: boolean;
          version?: string;
          push?: unknown;
        };
        fbq.queue = [];
        fbq.loaded = true;
        fbq.version = '2.0';
        fbq.push = fbq;
        w.fbq = fbq;
        w._fbq = fbq;
        this.addScript('https://connect.facebook.net/en_US/fbevents.js');
      }
      w.fbq('init', c.metaPixelId);
    }
  }

  private gtag(...args: unknown[]) {
    this.w?.gtag?.(...args);
  }

  // ───────────── Dispatch ─────────────

  /**
   * Sends one taxonomy event to every allowed destination. `eventId` is shared with the server
   * for events both may send (Meta deduplicates on it).
   */
  track(
    name: AnalyticsEventName,
    opts: { eventId?: string; ecommerce?: Ecommerce; params?: Params } = {},
  ) {
    const w = this.w;
    const c = this.config;
    if (!w || !c) return;
    const eventId = opts.eventId ?? randomId();
    const e = opts.ecommerce;
    const gaEcommerce = e
      ? {
          ...(e.transaction_id ? { transaction_id: e.transaction_id } : {}),
          value: toMajor(e.value, e.currency),
          currency: e.currency,
          ...(e.coupon ? { coupon: e.coupon } : {}),
          items: e.items.map((i) => ({
            ...i,
            price: toMajor(i.price, e.currency),
            ...(i.discount ? { discount: toMajor(i.discount, e.currency) } : {}),
          })),
        }
      : undefined;

    // GTM: one clean dataLayer event (ecommerce cleared first, as GA4 recommends).
    if (c.gtmContainerId && (this.allowed('analytics') || this.allowed('marketing'))) {
      if (gaEcommerce) w.dataLayer!.push({ ecommerce: null });
      w.dataLayer!.push({
        event: name,
        event_id: eventId,
        // Tells GTM this conversion is already sent server-side (GA4 MP / Meta CAPI).
        server_tracked: SERVER_OWNED.includes(name),
        ...(gaEcommerce ? { ecommerce: gaEcommerce } : {}),
        ...opts.params,
      });
    }
    // GA4 direct (no GTM). Conversions come from the server, so they're not duplicated here.
    if (this.loaded.ga4 && !SERVER_OWNED.includes(name)) {
      this.gtag('event', name, {
        ...gaEcommerce,
        ...opts.params,
        ...(name === 'page_view' ? { page_location: location.href } : {}),
      });
    }
    // Google Ads conversion (no GTM), for purchases.
    if (this.loaded.ads && name === 'purchase' && c.googleAds && gaEcommerce) {
      this.gtag('event', 'conversion', {
        send_to: c.googleAds.conversionLabel
          ? `${c.googleAds.conversionId}/${c.googleAds.conversionLabel}`
          : c.googleAds.conversionId,
        value: gaEcommerce.value,
        currency: gaEcommerce.currency,
        transaction_id: gaEcommerce.transaction_id,
      });
    }
    // Meta Pixel, with the same event id as the Conversions API.
    const metaName = META_EVENTS[name];
    if (this.loaded.meta && metaName && w.fbq) {
      const data = e
        ? {
            value: toMajor(e.value, e.currency),
            currency: e.currency,
            content_type: 'product',
            content_ids: e.items.map((i) => i.item_id),
            content_name: e.items.map((i) => i.item_name).join(', '),
            contents: e.items.map((i) => ({
              id: i.item_id,
              quantity: i.quantity,
              item_price: toMajor(i.price, e.currency),
            })),
            num_items: e.items.reduce((n, i) => n + i.quantity, 0),
          }
        : {};
      w.fbq('track', metaName, data, { eventID: eventId });
    }
    // Internal first-party collector.
    if ((COLLECTED as string[]).includes(name) && this.allowed('analytics')) {
      const body: CollectInput = {
        event_name: name as BrowserEventName,
        event_id: eventId,
        anonymous_id: this.anonymousId,
        session_id: this.sessionId,
        page_url: location.href.slice(0, 2000),
        referrer: document.referrer.slice(0, 2000) || undefined,
        attribution: this.attribution.last ?? this.attribution.first,
        ...(e ? { ecommerce: e } : {}),
      };
      void fetch(`${this.opts.apiUrl.replace(/\/+$/, '')}/v1/analytics/collect`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
        keepalive: true,
      }).catch(() => undefined);
    }
  }

  /** Fires an event only once per browser (e.g. a purchase on a refreshed success page). */
  private once(eventId: string): boolean {
    try {
      const fired = JSON.parse(localStorage.getItem(FIRED_KEY) ?? '[]') as string[];
      if (fired.includes(eventId)) return false;
      localStorage.setItem(FIRED_KEY, JSON.stringify([...fired, eventId].slice(-50)));
      return true;
    } catch {
      return true;
    }
  }

  // ───────────── Taxonomy helpers ─────────────

  /** One page_view per URL (repeated renders of the same page are ignored). */
  trackPageView() {
    if (typeof location === 'undefined' || !this.config) return;
    if (this.lastPage === location.href) return;
    if (this.config.requireConsent && !this.getConsent()) return;
    this.lastPage = location.href;
    this.track('page_view', { params: { page_title: document.title } });
  }

  trackViewItem(item: AnalyticsItem, currency: string) {
    this.track('view_item', {
      ecommerce: { value: item.price * item.quantity, currency, items: [item] },
    });
  }

  trackAddToCart(item: AnalyticsItem, currency: string) {
    this.track('add_to_cart', {
      ecommerce: { value: item.price * item.quantity, currency, items: [item] },
    });
  }

  trackRemoveFromCart(item: AnalyticsItem, currency: string) {
    this.track('remove_from_cart', {
      ecommerce: { value: item.price * item.quantity, currency, items: [item] },
    });
  }

  trackBeginCheckout(ecommerce: Ecommerce) {
    this.track('begin_checkout', { ecommerce });
  }

  /** After the server created the account: same id as the server's sign_up event. */
  trackSignUp(customerId: string) {
    const eventId = `signup_${customerId}`;
    if (this.once(eventId)) this.track('sign_up', { eventId, params: { method: 'email' } });
  }

  trackLogin() {
    this.track('login', { params: { method: 'email' } });
  }

  /** Only with a server-confirmed purchase (never on "reached the success page"). Fires once. */
  trackPurchase(purchase: ConfirmedPurchase) {
    if (this.once(purchase.event_id)) {
      this.track('purchase', { eventId: purchase.event_id, ecommerce: purchase.ecommerce });
    }
  }

  trackDownload(params: { productName: string; fileName: string }) {
    this.track('download', {
      params: { product_name: params.productName, file_name: params.fileName },
    });
  }

  trackGithubAccessGranted(deliveryId: string, productName: string) {
    const eventId = `github_access_${deliveryId}`;
    if (this.once(eventId))
      this.track('github_access_granted', { eventId, params: { product_name: productName } });
  }

  trackSupportTicketCreated(ticketNumber: number) {
    this.track('support_ticket_created', { params: { ticket_number: ticketNumber } });
  }

  /** What checkout and sign-up send to the API so the order/account keeps its attribution. */
  attributionPayload(): AttributionInput {
    const { first, last } = this.attribution;
    return {
      first,
      last,
      anonymousId: this.anonymousId,
      sessionId: this.sessionId,
      gaClientId: gaClientId(this.readCookie('_ga')),
      fbp: this.readCookie('_fbp') ?? null,
      fbc: this.readCookie('_fbc') ?? null,
      consent:
        this.config && !this.config.requireConsent
          ? { analytics: true, marketing: true }
          : this.getConsent(),
    };
  }
}

export function createAnalyticsClient(opts: AnalyticsClientOptions) {
  return new AnalyticsClient(opts);
}
