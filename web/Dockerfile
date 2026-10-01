# syntax=docker/dockerfile:1

# =============================================================================
# MHANDISI MAKINI — web app image
#
# PROVISIONAL — added in Slice 2.7 (document rendering, ADR 0005) so the
# Chromium runtime dependencies live in code from the moment the feature does.
# The full deployment pipeline (base-image pinning, non-root hardening, a
# healthcheck, the data volume, image slimming) is owned by the later
# deployment-shape slice, which will revisit this file. `next.config.ts` already
# sets `output: "standalone"`.
#
# Container memory floor: ~1 GB (≈300 MB Chromium + browser working set), per
# ADR 0005. The base image MUST carry `fonts-dejavu-core` — a missing font
# package is a silent brand-fidelity regression, not an error.
# =============================================================================

ARG NODE_IMAGE=node:22-bookworm-slim

# Chromium's shared-library dependencies + the brand font. Shared by the deps
# stage (so `npm ci`'s Chromium download is usable) and the runner.
FROM ${NODE_IMAGE} AS chromium-base
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      fonts-dejavu-core \
      fonts-liberation \
      libasound2 \
      libatk-bridge2.0-0 \
      libatk1.0-0 \
      libcairo2 \
      libcups2 \
      libdbus-1-3 \
      libdrm2 \
      libexpat1 \
      libgbm1 \
      libglib2.0-0 \
      libnspr4 \
      libnss3 \
      libpango-1.0-0 \
      libx11-6 \
      libxcb1 \
      libxcomposite1 \
      libxdamage1 \
      libxext6 \
      libxfixes3 \
      libxkbcommon0 \
      libxrandr2 \
    && rm -rf /var/lib/apt/lists/*

# --- deps: install node_modules, including puppeteer's bundled Chromium --------
FROM chromium-base AS deps
WORKDIR /app
ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer
COPY package.json package-lock.json* ./
RUN npm ci

# --- build: compile the Next standalone output ------------------------------
FROM deps AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build

# --- runner: the shipped image ---------------------------------------------
FROM chromium-base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer

# Next standalone bundle + static assets.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# `puppeteer` is kept out of the server bundle (serverExternalPackages), so its
# dependency tree and downloaded Chromium are copied in explicitly. The
# deployment slice can slim this to just the traced subtree.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.cache/puppeteer ./.cache/puppeteer

# Fly's `release_command` (`node scripts/migrate.mjs`, fly.toml) runs in this
# image before new machines start, so it needs the migrations and the runner.
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts/migrate.mjs ./scripts/migrate.mjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
