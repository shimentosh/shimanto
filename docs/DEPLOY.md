# Deploy (Dokploy)

Production runs on a VPS managed by [Dokploy](https://dokploy.com), as one **Docker Compose** project
built from [`docker-compose.prod.yml`](../docker-compose.prod.yml). Postgres and Redis are separate
Dokploy database services; file storage is Cloudflare R2.

```
                     Traefik (Dokploy, HTTPS)
   shimanto.xyz   admin.shimanto.xyz   my.shimanto.xyz   api.shimanto.xyz
        │                 │                   │                 │
      web:3000        admin:3000         portal:3000        api:4000 ──► Postgres, Redis (Dokploy)
        └───────── server-side calls ──────────────────────────►│ ──► Cloudflare R2, Resend, Stripe
```

## Domains and ports

Point each record (A, or CNAME to the VPS) at the server, then add it in Dokploy → Domains:

| Domain               | Service                                          | Container port | Path | HTTPS                    |
| -------------------- | ------------------------------------------------ | -------------- | ---- | ------------------------ |
| `shimanto.xyz`       | `web`                                            | 3000           | `/`  | on, Let's Encrypt        |
| `www.shimanto.xyz`   | `web`                                            | 3000           | `/`  | on (or redirect to apex) |
| `api.shimanto.xyz`   | `api`                                            | 4000           | `/`  | on, Let's Encrypt        |
| `admin.shimanto.xyz` | `admin`                                          | 3000           | `/`  | on, Let's Encrypt        |
| `my.shimanto.xyz`    | `portal`                                         | 3000           | `/`  | on, Let's Encrypt        |
| `media.shimanto.xyz` | none: R2 bucket custom domain, set in Cloudflare |                |      |                          |

If the DNS is on Cloudflare, use **DNS only** (grey cloud) until the certificates are issued, or set
SSL mode to Full (strict).

## Steps

1. **Databases.** In the Dokploy project, create a **PostgreSQL** service (database `shimanto`, image
   `postgres:17-alpine`) and a **Redis** service (image `redis:8-alpine`). Postgres 18 (used in dev)
   works too, but its image refuses a volume mounted at `/var/lib/postgresql/data`, which is where
   Dokploy mounts it. Copy each one's _Internal Connection URL_. Don't expose them publicly.
2. **Compose app.** Create → **Compose** → type _Docker Compose_. Source: this Git repository, branch
   `main`, **Compose Path `./docker-compose.prod.yml`**.
3. **Environment.** Paste [`infra/dokploy.env.example`](../infra/dokploy.env.example) into the
   Environment tab and fill in at least the REQUIRED block. Append `?schema=public` to the Postgres
   URL.
4. **Domains.** Add the domains from the table above (service name + port).
5. **Deploy.** The first build takes a few minutes (4 images). On start the API applies migrations
   and creates the super admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Sign in at
   `https://admin.shimanto.xyz`.
6. **Auto-deploy (optional).** Enable the Git webhook / auto-deploy in Dokploy so pushes to `main`
   redeploy.

Checks: `https://api.shimanto.xyz/health` and `https://shimanto.xyz/api/health` return `ok`.

## Environment variables

Read from the Dokploy Environment tab by `docker-compose.prod.yml`. The deploy stops with a clear
message when a required one is missing.

**Required**

| Variable                                     | Value                                              |
| -------------------------------------------- | -------------------------------------------------- |
| `DATABASE_URL`                               | Dokploy Postgres internal URL + `?schema=public`   |
| `REDIS_URL`                                  | Dokploy Redis internal URL                         |
| `JWT_ACCESS_SECRET`, `REVALIDATE_SECRET`     | Two different `openssl rand -base64 48` values     |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile site for `shimanto.xyz`       |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`              | First super admin (password ≥ 12 chars), used once |

**Optional** (defaults in [`infra/dokploy.env.example`](../infra/dokploy.env.example)):
storage, needed for image and product-file uploads (`S3_ENDPOINT`, `S3_ACCESS_KEY`,
`S3_SECRET_KEY` from Cloudflare R2, see [COMMERCE.md](COMMERCE.md#cloudflare-r2-private-files); `S3_REGION`, `S3_BUCKET`, `S3_FORCE_PATH_STYLE`, `MEDIA_PUBLIC_URL`, `FILE_UPLOAD_MAX_MB`),
email (`RESEND_API_KEY`, `MAIL_FROM`, `MAIL_REPLY_TO`, `NOTIFY_EMAIL`, `CONTACT_EMAIL`), Stripe
(`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`), analytics (`GA4_*`, `GTM_CONTAINER_ID`, `META_*`,
`GOOGLE_ADS_*`), GitHub delivery (`GITHUB_*`), and the domains (`SITE_URL`, `API_PUBLIC_URL`,
`ADMIN_URL`, `PORTAL_URL`, `COOKIE_DOMAIN`, `OWN_HOSTS`).

Set by the compose file, not by you: `NODE_ENV=production`, `TRUST_PROXY=true`, `CORS_ORIGINS`
(built from the domains), `API_URL` / `WEB_REVALIDATE_URL` (in-stack addresses), `JOBS_DRIVER`.

## Good to know

- `NEXT_PUBLIC_*` values (API URL, Turnstile site key, analytics IDs, contact email) are baked into
  the web, admin and portal bundles at build time. After changing one, **redeploy** (rebuild), not
  just restart.
- Without `RESEND_API_KEY`, emails (sign-in links, receipts) are only written to the API log.
- Webhook URLs for Stripe and the GitHub App use `https://api.shimanto.xyz` (see
  [COMMERCE.md](COMMERCE.md)).
- Backups: enable scheduled backups on the Dokploy Postgres service (S3/R2 destination).
