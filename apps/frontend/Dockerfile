# =============================================================================
# Ariake · frontend Dockerfile
# Multi-stage: node:22-alpine (pnpm build) → nginx:1.27-alpine (static serve).
#
# Build args:
#   VITE_API_BASE_URL  baked into the JS bundle. Default points to the
#                      same-origin /graphql via relative URL through nginx.
# =============================================================================

# ----- Build -----
FROM node:22-alpine AS builder
RUN corepack enable

WORKDIR /repo

# Workspace files first for cache layering. We copy the whole workspace because
# pnpm + turbo need the topology to install hoisted deps.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/frontend/package.json apps/frontend/package.json
# Other apps' package.json — needed for `pnpm install` workspace consistency.
COPY apps/backend/package.json    apps/backend/package.json
COPY apps/ai-service/package.json apps/ai-service/package.json
COPY apps/desktop/package.json    apps/desktop/package.json
COPY apps/mobile/package.json     apps/mobile/package.json

# Install just the frontend's deps (and their workspace transitive deps).
RUN pnpm install --frozen-lockfile --filter frontend...

# Now copy the actual frontend source + the schema the codegen reads.
COPY apps/frontend ./apps/frontend
COPY apps/backend/graph/schema.graphql ./apps/backend/graph/schema.graphql

# Codegen + build
ARG VITE_API_BASE_URL=/
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# graphql-codegen relies on the relative path to ../backend/graph/schema.graphql
RUN pnpm -C apps/frontend codegen
RUN pnpm -C apps/frontend build

# ----- Runtime -----
FROM nginx:1.27-alpine AS runtime

# Custom config (SPA fallback, gzip, cache headers).
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Bundle
COPY --from=builder /repo/apps/frontend/dist /usr/share/nginx/html

# nginx:alpine already runs as nginx user when default.conf binds 80; nothing
# else to do. EXPOSE makes the port discoverable to compose.
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:80/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
