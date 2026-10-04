# Analytics, tracking and attribution

**Actual sales always come from Orders + Payments.** GA4, GTM, Meta Pixel and the Meta
Conversions API are measurement and attribution tools. Their numbers will not match the admin
reports exactly, and they are never used for money.

## How it fits together

```
Browser (web + portal)                       API (NestJS)
──────────────────────                       ────────────
AnalyticsClient (packages/sdk)               Order confirmed ($0 or verified payment)
 ├─ GTM dataLayer  (if GTM configured)        └─ AnalyticsService.trackPurchase()
 ├─ gtag GA4 / Ads (if no GTM)                     ├─ AnalyticsEvent  (internal, unique event id)
 ├─ Meta Pixel     (eventID shared)                └─ queue 'analytics.deliver'
 └─ POST /v1/analytics/collect                          ├─ GA4 Measurement Protocol
    (page_view, view_item, add_to_cart,                 └─ Meta Conversions API
     remove_from_cart, begin_checkout)
```

- **Purchases, refunds and sign-ups are server events.** The API stores them once (the event id
  is unique) and delivers them to GA4 and Meta CAPI in the background, with retries. The browser
  may echo a purchase to the Meta Pixel and dataLayer only after the server confirmed it, with the
  same event id, and only once per browser.
- **Analytics can never break a sale.** Every tracking call catches its own errors. Provider
  deliveries run in the job queue; failures are recorded (Admin → Analytics → Events) and retried
  (5 attempts, plus a manual Retry button).
- **Providers are pluggable.** `apps/api/src/analytics/providers.ts` defines `AnalyticsProvider`
  (`configured`, `skipReason`, `send`); GA4 and Meta CAPI are the two implementations. TikTok,
  LinkedIn etc. would be one more entry, with no change to orders or payments.

## Event taxonomy

| Event                          | Where it's recorded      | GA4             | Meta                                | Event id                     |
| ------------------------------ | ------------------------ | --------------- | ----------------------------------- | ---------------------------- |
| page_view                      | browser → internal       | browser         | PageView                            | random                       |
| view_item                      | browser → internal       | browser         | ViewContent                         | random                       |
| add_to_cart / remove_from_cart | browser → internal       | browser         | AddToCart                           | random                       |
| begin_checkout                 | browser → internal       | browser         | InitiateCheckout                    | random                       |
| sign_up                        | server                   | server (MP)     | CompleteRegistration (CAPI + Pixel) | `signup_<customerId>`        |
| login, email_verified          | server, internal only    | browser (login) | –                                   | –                            |
| purchase                       | server (order confirmed) | server (MP)     | Purchase (CAPI + Pixel)             | `purchase_<orderId>`         |
| refund                         | server (refund recorded) | server (MP)     | – (Meta has no refund event)        | `refund_<orderId>`           |
| download                       | server, internal         | browser         | –                                   | random                       |
| github_access_granted          | server, internal         | browser         | –                                   | `github_access_<deliveryId>` |
| support_ticket_created         | server, internal         | browser         | –                                   | `support_ticket_<ticketId>`  |

$0 orders (free products, 100% coupons) are purchases with value 0 in every destination.
Admin-created orders are recorded internally but never sent to marketing platforms.

## Attribution

- The browser keeps first-party cookies: `sx_aid` (anonymous id), `sx_sid` (30-minute session),
  `sx_ft` (first touch), `sx_lt` (last touch), `sx_consent`. No personal data, no secrets.
- **First touch** is the first known marketing source (a direct first visit is provisional until a
  campaign arrives) and is never overwritten. **Last touch** is the most recent UTM campaign,
  ad click (gclid/fbclid) or external referral; direct visits don't replace it.
- Sign-up stores the first touch on the customer and links their anonymous history. Checkout
  stores first + last touch, landing page and referrer on the order. A returning customer's first
  touch always comes from their account.
- Admin reports support first-touch and last-touch models.

## Consent

With "Ask visitors before analytics and marketing tags run" on (the default), nothing optional
loads until the visitor chooses. Analytics consent covers GA4 and internal page/product stats;
marketing consent covers Meta Pixel, Meta CAPI and Google Ads. Server-side events respect the
same choice (recorded with the checkout). Checkout and orders never depend on consent. The IP
address and user agent are kept only with marketing consent and are removed from the event once
it has been delivered.

## Setup

Public IDs are set in **Admin → Settings → Analytics & Tracking** (env vars are defaults).
Secrets are env-only in `apps/api/.env` and are never returned by the API.

1. **GA4**: create a web data stream → copy the Measurement ID (`G-…`). For server-side
   purchases/refunds, create a Measurement Protocol API secret (Admin → Data streams → the stream
   → Measurement Protocol API secrets) and set `GA4_API_SECRET`. Mark `purchase` as a key event.
2. **GTM** (optional): set the container ID. GTM then replaces the direct GA4/Ads tags; build
   your tags from the dataLayer events above. Purchase events carry `event_id` and
   `server_tracked: true` (GA4 already receives them server-side; use `event_id` for Meta).
3. **Meta**: set the Pixel ID. For the Conversions API, generate an access token in Events Manager
   (Settings → Conversions API) and set `META_ACCESS_TOKEN` (optionally `META_API_VERSION`,
   `META_TEST_EVENT_CODE` while testing). Use "Test Meta CAPI" in admin settings.
4. **Google Ads** (optional): conversion ID (`AW-…`) and label.
5. Production cookies: set `NEXT_PUBLIC_COOKIE_DOMAIN=.shimanto.xyz` and
   `NEXT_PUBLIC_OWN_HOSTS=shimanto.xyz,my.shimanto.xyz` in the web and portal apps so attribution
   carries from the store into the portal.

## Admin

- **Analytics → Overview**: revenue, net revenue, orders (paid / free), AOV, refunds, new
  customers, visitors, sessions, conversion rate; products (views → add to cart → checkouts →
  orders → revenue); sources and campaigns (first- or last-touch). Date range: today, 7, 30,
  90 days or custom.
- **Analytics → Events**: recent events with each provider delivery (sent / failed / skipped and
  why), and Retry for failures.
- **Orders / Customers**: each order shows first and last touch; each customer their first touch.
