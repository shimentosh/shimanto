# syntax=docker/dockerfile:1
# One image recipe for every Next.js app (web, admin, portal). Build from repo root:
#   docker build -f infra/docker/next.Dockerfile --build-arg APP=web    -t shimanto-web .
#   docker build -f infra/docker/next.Dockerfile --build-arg APP=admin  -t shimanto-admin .
#   docker build -f infra/docker/next.Dockerfile --build-arg APP=portal -t shimanto-portal .
# NEXT_PUBLIC_* values are inlined into the browser bundle at build time, so they are build args,
# not runtime env. Changing one means rebuilding the image.
ARG APP=web

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

# Prune the monorepo to just this app and its workspace deps for a lean, cacheable build.
FROM base AS pruner
ARG APP
COPY . .
RUN pnpm dlx turbo@2 prune @shimanto/${APP} --docker

FROM base AS builder
ARG APP
COPY --from=pruner /repo/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ .
ARG NEXT_PUBLIC_SITE_URL=https://shimanto.xyz
ARG NEXT_PUBLIC_API_URL=https://api.shimanto.xyz
ARG NEXT_PUBLIC_PORTAL_URL=https://my.shimanto.xyz
ARG NEXT_PUBLIC_COOKIE_DOMAIN=
ARG NEXT_PUBLIC_OWN_HOSTS=
ARG NEXT_PUBLIC_CONTACT_EMAIL=
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=
ARG NEXT_PUBLIC_GA4_MEASUREMENT_ID=
ARG NEXT_PUBLIC_GTM_CONTAINER_ID=
ARG NEXT_PUBLIC_META_PIXEL_ID=
ARG NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID=
ARG NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL=
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_PORTAL_URL=$NEXT_PUBLIC_PORTAL_URL \
    NEXT_PUBLIC_COOKIE_DOMAIN=$NEXT_PUBLIC_COOKIE_DOMAIN \
    NEXT_PUBLIC_OWN_HOSTS=$NEXT_PUBLIC_OWN_HOSTS \
    NEXT_PUBLIC_CONTACT_EMAIL=$NEXT_PUBLIC_CONTACT_EMAIL \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY \
    NEXT_PUBLIC_GA4_MEASUREMENT_ID=$NEXT_PUBLIC_GA4_MEASUREMENT_ID \
    NEXT_PUBLIC_GTM_CONTAINER_ID=$NEXT_PUBLIC_GTM_CONTAINER_ID \
    NEXT_PUBLIC_META_PIXEL_ID=$NEXT_PUBLIC_META_PIXEL_ID \
    NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID=$NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID \
    NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL=$NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL
RUN pnpm turbo run build --filter=@shimanto/${APP} && mkdir -p apps/${APP}/public

FROM node:24-alpine AS runner
ARG APP
# Path probed by the healthcheck. The reverse proxy only routes to healthy containers.
ARG HEALTH_PATH=/api/health
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 \
    APP=${APP} HEALTH_PATH=${HEALTH_PATH}
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
# Next "standalone" output keeps the monorepo layout: the server lives at apps/<app>/server.js.
COPY --from=builder --chown=app:app /repo/apps/${APP}/.next/standalone ./
COPY --from=builder --chown=app:app /repo/apps/${APP}/.next/static ./apps/${APP}/.next/static
# Only web ships a public/ folder; the builder creates an empty one for admin and portal.
COPY --from=builder --chown=app:app /repo/apps/${APP}/public ./apps/${APP}/public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD wget -qO /dev/null "http://127.0.0.1:3000${HEALTH_PATH}" || exit 1
CMD ["sh", "-c", "exec node apps/${APP}/server.js"]
