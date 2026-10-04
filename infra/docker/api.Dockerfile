# syntax=docker/dockerfile:1
# Build from repo root: docker build -f infra/docker/api.Dockerfile -t shimanto-api .
FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /repo

# Prune the monorepo to just the api and its workspace deps for a lean, cacheable build.
FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2 prune @shimanto/api --docker

FROM base AS builder
COPY --from=pruner /repo/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ .
RUN pnpm turbo run build --filter=@shimanto/api
# Self-contained production bundle: api + prod deps + built workspace packages.
RUN pnpm --filter=@shimanto/api deploy --prod --legacy /prod/api

FROM node:24-alpine AS runner
ENV NODE_ENV=production API_PORT=4000
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /prod/api .
USER app
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:4000/health || exit 1
# Applies pending migrations (advisory-locked, safe with several replicas), then starts the API.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main.js"]
