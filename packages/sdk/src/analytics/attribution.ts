import type { Touch } from '@shimanto/types';

const SEARCH_ENGINES = [
  'google.',
  'bing.',
  'duckduckgo.',
  'yahoo.',
  'baidu.',
  'yandex.',
  'ecosia.',
];
const MAX_URL = 500;

const clip = (value: string | null | undefined, max = 200) => {
  const v = value?.trim();
  return v ? v.slice(0, max) : null;
};

/**
 * The marketing touch of a page load, or null for direct / internal navigation.
 * UTM parameters win; then ad click ids; then an external referrer (organic search or referral).
 */
export function touchFromLocation(
  href: string,
  referrer: string,
  ownHosts: string[],
  now = new Date(),
): Touch | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const p = url.searchParams;
  const landingPage = clip(url.href, MAX_URL);
  const ref = clip(referrer, MAX_URL);
  const at = now.toISOString();

  if (p.get('utm_source') || p.get('utm_medium') || p.get('utm_campaign')) {
    return {
      source: clip(p.get('utm_source'))?.toLowerCase() ?? null,
      medium: clip(p.get('utm_medium'))?.toLowerCase() ?? null,
      campaign: clip(p.get('utm_campaign')),
      term: clip(p.get('utm_term')),
      content: clip(p.get('utm_content')),
      referrer: ref,
      landingPage,
      at,
    };
  }
  if (p.get('gclid') || p.get('gbraid') || p.get('wbraid')) {
    return { source: 'google', medium: 'cpc', campaign: null, referrer: ref, landingPage, at };
  }
  if (p.get('fbclid')) {
    return { source: 'facebook', medium: 'social', campaign: null, referrer: ref, landingPage, at };
  }
  if (ref) {
    let host: string;
    try {
      host = new URL(ref).hostname.replace(/^www\./, '');
    } catch {
      return null;
    }
    const own = ownHosts.some((h) => host === h || host.endsWith(`.${h}`));
    if (own || !host) return null;
    const search = SEARCH_ENGINES.some((s) => host.includes(s));
    return {
      source: search
        ? (host.split('.').find((part) => SEARCH_ENGINES.some((s) => s.startsWith(part))) ?? host)
        : host,
      medium: search ? 'organic' : 'referral',
      campaign: null,
      referrer: ref,
      landingPage,
      at,
    };
  }
  return null;
}

export interface AttributionState {
  first: Touch | null;
  last: Touch | null;
}

const isDirect = (t: Touch | null) => !t || t.source === '(direct)';

/**
 * First touch = the first known marketing source (a direct first visit is provisional and is
 * replaced by the first real campaign). Last touch = the most recent campaign or referral;
 * direct visits never overwrite it.
 */
export function nextAttribution(
  state: AttributionState,
  touch: Touch | null,
  landing: { href: string; referrer: string; now?: Date },
  opts: { firstTouch: boolean; lastTouch: boolean },
): AttributionState {
  const next: AttributionState = { ...state };
  if (touch) {
    if (opts.lastTouch) next.last = touch;
    if (opts.firstTouch && isDirect(state.first)) next.first = touch;
  } else if (opts.firstTouch && !state.first) {
    next.first = {
      source: '(direct)',
      medium: '(none)',
      campaign: null,
      landingPage: clip(landing.href, MAX_URL),
      referrer: clip(landing.referrer, MAX_URL),
      at: (landing.now ?? new Date()).toISOString(),
    };
  }
  return next;
}

/** GA client id from the `_ga` cookie ("GA1.1.123.456" → "123.456"). */
export function gaClientId(cookie: string | undefined): string | null {
  if (!cookie) return null;
  const parts = cookie.split('.');
  return parts.length >= 4 ? `${parts[parts.length - 2]}.${parts[parts.length - 1]}` : null;
}
