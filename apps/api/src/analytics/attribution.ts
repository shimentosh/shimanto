import type { AttributionInput, OrderAttribution, Touch } from '@shimanto/types';

const clip = (value: string | null | undefined, max = 200) => {
  const v = value?.trim();
  return v ? v.slice(0, max) : null;
};

/** A touch with only the fields we keep, trimmed. Null when it says nothing. */
export function cleanTouch(touch: Touch | null | undefined): Touch | null {
  if (!touch) return null;
  const clean: Touch = {
    source: clip(touch.source)?.toLowerCase() ?? null,
    medium: clip(touch.medium)?.toLowerCase() ?? null,
    campaign: clip(touch.campaign),
    term: clip(touch.term),
    content: clip(touch.content),
    referrer: clip(touch.referrer, 2000),
    landingPage: clip(touch.landingPage, 2000),
    at: touch.at ?? null,
  };
  const meaningful =
    clean.source || clean.medium || clean.campaign || clean.referrer || clean.landingPage;
  return meaningful ? clean : null;
}

/** Legacy `utm` map (utm_source=…) as a touch, for callers that only send raw UTM params. */
export function touchFromUtm(utm: Record<string, string> | null | undefined): Touch | null {
  if (!utm) return null;
  return cleanTouch({
    source: utm.utm_source,
    medium: utm.utm_medium,
    campaign: utm.utm_campaign,
    term: utm.utm_term,
    content: utm.utm_content,
  });
}

/**
 * Order attribution columns. First touch prefers what the customer already has on file (their
 * first-ever visit), so a returning buyer's first source never changes. Last touch is this
 * checkout's most recent campaign or referral.
 */
export function orderAttribution(
  input: AttributionInput | null | undefined,
  legacyUtm: Record<string, string> | null | undefined,
  customerFirst: Touch | null,
) {
  const last = cleanTouch(input?.last) ?? touchFromUtm(legacyUtm);
  const first = customerFirst ?? cleanTouch(input?.first) ?? last;
  return {
    firstSource: first?.source ?? null,
    firstMedium: first?.medium ?? null,
    firstCampaign: first?.campaign ?? null,
    firstContent: first?.content ?? null,
    firstTerm: first?.term ?? null,
    lastSource: last?.source ?? null,
    lastMedium: last?.medium ?? null,
    lastCampaign: last?.campaign ?? null,
    lastContent: last?.content ?? null,
    lastTerm: last?.term ?? null,
    landingPage: first?.landingPage ?? last?.landingPage ?? null,
    referrer: first?.referrer ?? last?.referrer ?? null,
  };
}

/** Customer first-touch columns, written once (never overwritten). */
export function customerFirstTouch(input: AttributionInput | null | undefined) {
  const first = cleanTouch(input?.first) ?? cleanTouch(input?.last);
  if (!first && !input?.anonymousId) return {};
  return {
    firstSource: first?.source ?? null,
    firstMedium: first?.medium ?? null,
    firstCampaign: first?.campaign ?? null,
    firstContent: first?.content ?? null,
    firstTerm: first?.term ?? null,
    firstLandingPage: first?.landingPage ?? null,
    firstReferrer: first?.referrer ?? null,
    anonymousId: input?.anonymousId ?? null,
  };
}

type FirstColumns = {
  firstSource: string | null;
  firstMedium: string | null;
  firstCampaign: string | null;
  firstContent: string | null;
  firstTerm: string | null;
};

/** A stored customer's first touch as a Touch (null if never recorded). */
export function customerTouch(
  c: FirstColumns & { firstLandingPage?: string | null; firstReferrer?: string | null },
): Touch | null {
  if (!c.firstSource && !c.firstMedium && !c.firstCampaign && !c.firstLandingPage) return null;
  return {
    source: c.firstSource,
    medium: c.firstMedium,
    campaign: c.firstCampaign,
    content: c.firstContent,
    term: c.firstTerm,
    landingPage: c.firstLandingPage ?? null,
    referrer: c.firstReferrer ?? null,
  };
}

/** Order columns → the admin view. */
export function toOrderAttribution(
  o: FirstColumns & {
    lastSource: string | null;
    lastMedium: string | null;
    lastCampaign: string | null;
    lastContent: string | null;
    lastTerm: string | null;
    landingPage: string | null;
    referrer: string | null;
  },
): OrderAttribution {
  const first = customerTouch({ ...o, firstLandingPage: o.landingPage, firstReferrer: o.referrer });
  const last =
    o.lastSource || o.lastMedium || o.lastCampaign
      ? {
          source: o.lastSource,
          medium: o.lastMedium,
          campaign: o.lastCampaign,
          content: o.lastContent,
          term: o.lastTerm,
        }
      : null;
  return { first, last };
}
