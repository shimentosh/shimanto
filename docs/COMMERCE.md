# Store, customer portal and admin

How the digital-product store works, and how to set up its integrations. For the reasons behind
each choice, see `DECISIONS.md` (D-025 onwards).

## Apps

| App           | URL (dev)             | Who              | What                                                                           |
| ------------- | --------------------- | ---------------- | ------------------------------------------------------------------------------ |
| `apps/web`    | http://localhost:3100 | Visitors         | Sales pages and `/checkout` (cart quote, coupon, guest or signed-in checkout)  |
| `apps/portal` | http://localhost:3102 | Customers        | Orders, products, downloads, GitHub access, support, account                   |
| `apps/admin`  | http://localhost:3101 | Team             | Dashboard, orders, products, customers, files, coupons, support, settings, log |
| `apps/api`    | http://localhost:4000 | All of the above | NestJS API (`/docs` for OpenAPI)                                               |

The portal and admin render in the browser and call the API with httpOnly session cookies
(`sx_cs` for customers, `sx_at`/`sx_rt` for admins). Nothing sensitive is stored in JavaScript.
In production set `COOKIE_DOMAIN=.shimanto.xyz` and put every app origin in `CORS_ORIGINS`.

## The order pipeline

```
checkout ($0 or paid)  ─┐
admin "New order"      ─┼─► Order (PENDING) ─► confirm ─► fulfillment.run ─► Deliveries
Stripe webhook (paid)  ─┘                      │            ├─ R2 files      → READY
                                               │            └─ GitHub repo   → ACTION_REQUIRED /
                                               │                               INVITATION_SENT / ACCEPTED
                                               └─ emails (idempotent EmailEvents)
```

- **Order = purchase.** One `Order` with `OrderItem` snapshots (name, slug, type, unit price,
  discount, total). There is no separate purchase, licence or entitlement table: a customer owns
  a product while an order for it is `PAID`, `PROCESSING` or `COMPLETED`.
- **$0 orders use the same path.** Free products, 100% coupons and admin gifts create a normal
  order with `paymentStatus: NOT_REQUIRED` and `provider: FREE`, then confirm and fulfil.
- **Payment status comes only from verified webhooks or an admin.** The success page never
  marks anything paid. The webhook checks the signature, processes each event id once, and
  refuses to fulfil when the charged amount or currency differs from the order.
- **Statuses.** Order: `PENDING → PAID → PROCESSING → COMPLETED`, or `CANCELLED` / `REFUNDED`.
  Payment: `PENDING, PAID, FAILED, REFUNDED, NOT_REQUIRED`. Fulfillment is computed from the
  deliveries: `COMPLETED` when every delivery is `READY`/`ACCEPTED`, `DELIVERED` when the rest are
  invitations waiting to be accepted, `PARTIALLY_DELIVERED`, `PROCESSING` or `FAILED`.
- **Idempotency everywhere.** One delivery per order item and method (unique index), work on a
  delivery is claimed with an optimistic lock, GitHub invitations are re-used, and every email has
  an idempotency key (`order:<id>:paymentSuccessful`, `delivery:<id>:invited:<invitationId>` …).
- **Refunds and cancellations** revoke access: R2 downloads stop at once; GitHub invitations are
  cancelled or collaborators removed, unless another active order grants the same repository.

## Emails

All transactional email goes through `EmailService` (`apps/api/src/mail`): a template key plus
data → branded HTML + text → an `EmailEvent` row (`QUEUED`) → the job queue → Resend (or SMTP in
development) → `SENT` or `FAILED` with the reason. Duplicate keys send nothing. The admin email
log (Settings → Emails) shows every event.

Templates: welcome, verify email, sign-in link, password reset, password changed, new sign-in,
order confirmation, free order confirmation, payment successful, payment failed, order
cancelled/refunded, download available, GitHub access required, GitHub invitation sent, GitHub
access ready, GitHub invitation failed, ticket created, ticket reply, ticket resolved, admin
ticket notification, test email.

## Setting up the integrations

Integrations are configured with environment variables in `apps/api/.env` (see
`apps/api/.env.example`). The admin Settings page shows what is configured and can test each
connection; it never shows secret values.

### Resend (email)

1. Add and verify your sending domain at https://resend.com/domains.
2. Create an API key (sending access) and set `RESEND_API_KEY=re_…`.
3. Set `MAIL_FROM` to an address on the verified domain, e.g. `Shimanto <hello@shimanto.xyz>`.
4. Optionally set `MAIL_REPLY_TO`, and the store's support email in Admin → Settings → General.
5. Send a test from Admin → Settings → Emails.

Without `RESEND_API_KEY`, email goes to `SMTP_URL` (Mailpit at http://localhost:8025 locally).

### Cloudflare R2 (private files)

1. Create a bucket (e.g. `shimanto-media`). Keep it **private**. For public cover images, connect
   a custom domain and allow public reads for the `media/` prefix only.
2. Create an R2 API token with Object Read & Write on that bucket.
3. Set:
   ```
   S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   S3_REGION=auto
   S3_BUCKET=shimanto-media
   S3_ACCESS_KEY=…
   S3_SECRET_KEY=…
   S3_FORCE_PATH_STYLE=true
   MEDIA_PUBLIC_URL=https://media.shimanto.xyz
   FILE_UPLOAD_MAX_MB=250
   ```
4. Admin → Settings → Storage → "Test storage connection".

Product files live under `private/files/…` (older uploads under `private/<year>/…`), support
attachments under `private/support/…`. Uploads stream through the API (admin → API → R2).
Customers only ever get 5-minute signed URLs, created after checking the delivery belongs to them,
is `READY`, and its order is active.

### Stripe (payments)

1. Set `STRIPE_SECRET_KEY` (test key first).
2. Add a webhook endpoint `https://api.shimanto.xyz/v1/webhooks/stripe` with the events
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`.
3. Set `STRIPE_WEBHOOK_SECRET=whsec_…`.
4. Locally: `stripe listen --forward-to localhost:4000/v1/webhooks/stripe`.

Without Stripe keys, paid checkout is disabled (free products and $0 orders still work).

### GitHub App (repository delivery)

1. GitHub → Settings → Developer settings → GitHub Apps → New GitHub App.
   - Callback URL: `https://api.shimanto.xyz/v1/github/callback`
   - Webhook URL: `https://api.shimanto.xyz/v1/webhooks/github`, with a random secret.
   - Repository permissions: **Administration: Read & write** (to invite collaborators),
     Metadata: Read.
   - Subscribe to the **Member** event.
   - Account permissions: none (the OAuth step only reads the user's id and login).
2. Generate a private key and note the App ID, Client ID and a Client secret.
3. Install the App on the account or organisation that owns the repositories you sell (only
   those repositories).
4. Set:
   ```
   GITHUB_APP_ID=123456
   GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n…\n-----END RSA PRIVATE KEY-----\n"
   GITHUB_CLIENT_ID=Iv1.…
   GITHUB_CLIENT_SECRET=…
   GITHUB_WEBHOOK_SECRET=…
   ```
5. In each product, tick "GitHub repository access", set owner and repository, and use "Check
   access". Customers never choose the repository.

Flow: after purchase, a customer without a connected GitHub account gets `ACTION_REQUIRED` and an
email. Connecting GitHub in the portal (`/account/github`) sends the invitation automatically
(`INVITATION_SENT`). Accepting it is detected by the `member` webhook, by "I've accepted it" in the
portal, by admin "Sync status", or when the portal next loads (at most every 2 minutes). Expired
or failed invitations can be retried by the customer or an admin; admins can also revoke.

Fallback: without an App, `GITHUB_TOKEN` (a fine-grained PAT with Administration read & write on
the repositories) is used for invitations. Customers still need OAuth credentials to connect.

## Security notes

- Customer passwords are argon2id hashes. Password reset / change bumps `sessionVersion`, which
  ends every older session; disabling a customer does too.
- Emailed tokens (sign-in, verify, reset) are random, stored as SHA-256, single use, short-lived,
  and a new one voids the previous one of the same kind.
- Every portal query is scoped by the session's customer id; ids in URLs are never trusted alone
  (e2e tests cover cross-customer access).
- Admin endpoints require the admin cookie; store settings need a super admin. Every privileged
  change is in the audit log.
- Rate limits on sign-up, sign-in, reset, checkout, uploads and support.
- Secrets stay server-side: the App private key, client secret, tokens and API keys are never
  returned by any endpoint or written to logs.

## Tests

- API unit tests (`pnpm --filter @shimanto/api test`): pricing, templates, payment webhook parsing.
- API e2e (`pnpm --filter @shimanto/api test:e2e`, needs Postgres): customer auth, $0 / 100% coupon
  / paid checkout, webhooks (signature, idempotency, amount mismatch, failure, refund), downloads
  and IDOR, admin orders, files, GitHub (connect, invite, idempotency, already a collaborator,
  failure + retry, expiry, revoke, webhook, forged state), support tickets, email idempotency,
  settings.
- UI (`packages/ui`) and SDK unit tests.
