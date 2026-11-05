# syntax=docker/dockerfile:1
# Production image for apps/app (Next.js standalone output).
# Built from the repository root by .github/workflows/deploy.yml:
#   docker build -f apps/app/Dockerfile .

FROM node:24-alpine AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 NEXT_TELEMETRY_DISABLED=1
RUN corepack enable pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/app/package.json apps/app/
COPY apps/api/package.json apps/api/
COPY packages/api-client/package.json packages/api-client/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm config set store-dir /pnpm-store && \
    pnpm install --frozen-lockfile --filter "@workspace/app..."
COPY . .
# Public (browser) variables are baked in at build time.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=""
ARG NEXT_PUBLIC_GOOGLE_SIGN_IN=false
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY NEXT_PUBLIC_GOOGLE_SIGN_IN=$NEXT_PUBLIC_GOOGLE_SIGN_IN \
    NEXT_OUTPUT=standalone
# The typed API client is generated from apps/api/openapi.json; the API itself isn't built here.
RUN pnpm --filter @workspace/shared --filter @workspace/api-client build && \
    pnpm --filter @workspace/app build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
# In a monorepo the standalone output mirrors the repository layout (apps/app/server.js).
COPY --from=build --chown=nextjs:nodejs /app/apps/app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/app/.next/static ./apps/app/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/app/public ./apps/app/public
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "apps/app/server.js"]
