# syntax=docker/dockerfile:1
# Production image for apps/api. Built from the repository root by .github/workflows/deploy.yml:
#   docker build -f apps/api/Dockerfile .

FROM node:24-alpine AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm config set store-dir /pnpm-store && \
    pnpm install --frozen-lockfile --filter "@workspace/api..."
COPY . .
RUN pnpm --filter "@workspace/api..." build
# Only the API, its production dependencies and the built workspace packages (with migrations).
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm --filter @workspace/api deploy --prod /out

FROM node:24-alpine AS runner
WORKDIR /app
# Certificate authorities of Amazon RDS, so database connections are verified (sslmode=verify-full).
ADD --chmod=644 https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem /etc/ssl/certs/rds-global-bundle.pem
ENV NODE_ENV=production PORT=3001 NODE_EXTRA_CA_CERTS=/etc/ssl/certs/rds-global-bundle.pem
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs api
COPY --from=build --chown=api:nodejs /out ./
USER api
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health || exit 1
# Apply pending database migrations, then start the API with tracing loaded first (src/otel.ts).
CMD ["sh", "-c", "node dist/migrate.js && exec node --import ./dist/otel.js dist/main.js"]
