# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This is a **pnpm + Turbo monorepo** with five apps under `apps/`. Per-app CLAUDE.md files exist for `apps/ai-service/` and `apps/mobile/` — read those before touching Python or React Native code. This root file covers the cross-cutting layout, the Go backend, the React (Vite + Tauri) web client, the desktop shell, and the workflows that span more than one app.

| App | Stack | Default port |
|---|---|---|
| `apps/backend` | Go 1.25, Gin, GORM, gqlgen | `11451` |
| `apps/frontend` | React 19, Vite 7, Apollo, Ant Design 5, Tailwind 4 | `5173` |
| `apps/ai-service` | Python 3.12+, FastAPI, asyncpg + pgvector | `8000` |
| `apps/desktop` | Rust + Tauri 2 (wraps the frontend; spawns the Go binary as a sidecar) | — |
| `apps/mobile` | Expo / React Native 0.81 (New Arch), Apollo | Metro defaults |

Toolchain: Node 22+, pnpm 10+, Go 1.25, Python 3.12+ (managed via `uv`), Rust 1.75+ for desktop builds.

## Commands

### Root (Turbo) — runs across all apps
```bash
pnpm dev               # turbo dev — frontend + backend + ai-service concurrently
pnpm dev:frontend      # individual app via --filter
pnpm dev:backend
pnpm dev:ai
pnpm dev:mobile        # turbo start --filter=mobile (Expo)
pnpm build             # turbo build — runs codegen/generate first, then per-app build
pnpm lint              # turbo lint (frontend + mobile + ai-service)
pnpm test              # turbo test (Vitest + go test + pytest)
pnpm codegen           # turbo codegen (frontend + mobile regenerate GraphQL types)
pnpm tauri:dev         # apps/desktop in dev (auto-runs frontend dev)
pnpm tauri:build       # bundles the desktop app
```

`turbo.json` declares `build` depends on `^build`, `codegen`, `generate`, so a top-level `pnpm build` will codegen before bundling. After editing `apps/backend/graph/schema.graphql`, both `pnpm codegen` (frontend + mobile) and `pnpm -C apps/backend generate` (gqlgen) need to run; Turbo only chains them through `build`.

### Backend (`apps/backend`)
```bash
go run main.go                                # dev server on :11451
go test ./...                                 # all tests
go test ./services -run TestBlogService_Create   # single test
go generate ./...                             # gqlgen → graph/generated.go + models_gen.go
go build -tags sqlite_fts5 -o bin/server main.go
```
The Go module is named **`repair-platform`** for legacy reasons — internal imports use that prefix; do not rename without a coordinated migration. SQLite needs the `sqlite_fts5` build tag (used by `scripts/build-sidecar.sh`).

### Frontend (`apps/frontend`)
```bash
pnpm dev                # Vite (host enabled — phones on the LAN can hit it)
pnpm build              # standard SPA build → dist/
pnpm build:static       # static-site export → dist-static/, also writes CNAME=xloudmax.cc
pnpm test / test:run    # Vitest (jsdom)
pnpm codegen            # graphql-codegen reads ../backend/graph/schema.graphql
pnpm type-check         # tsc --noEmit
pnpm lint / lint:fix    # ESLint flat config (eslint.config.cjs)
```
Two Vite configs coexist: `vite.config.ts` (SPA + Tauri target) and `vite.static.config.ts` (GitHub Pages export — uses `HashRouter`, gated by `VITE_STATIC_EXPORT=true`). The frontend is dual-target: it runs both as a browser SPA and inside Tauri; checks `window.__TAURI_INTERNALS__` (`src/utils/platform.ts`) and routes API URL + token storage through `src/utils/config.ts` and `src/utils/tokenStorage.ts` (keyring under Tauri, localStorage on web).

### AI service (`apps/ai-service`)
See `apps/ai-service/CLAUDE.md`. **`package.json` is a task runner for `uv` scripts** — prefer `pnpm dev` / `pnpm test` / `pnpm benchmark:*` over invoking `uv` directly so env vars are wired correctly.

### Mobile (`apps/mobile`)
See `apps/mobile/CLAUDE.md`. Tests use `node:test` (no Jest/Vitest); GraphQL ops live under `src/graphql/` and codegen reads `../backend/graph/schema.graphql`.

### Desktop (`apps/desktop`)
The desktop app spawns the Go backend as a Tauri **sidecar binary**: `apps/desktop/c404-backend-<target-triple>` (declared in `tauri.conf.json::bundle.externalBin`). Build it with `scripts/build-sidecar.sh` before `pnpm tauri:build` — it invokes `go build -tags sqlite_fts5` and writes the binary into `apps/desktop/`. iOS troubleshooting recipe: `scripts/fix-ios-blackscreen.sh` (clears `target/` and `gen/apple/`, rebuilds for release).

## Cross-cutting workflows

### GraphQL (single-source-of-truth schema)
- **Schema**: `apps/backend/graph/schema.graphql` is the only schema file. Every consumer reads from this path.
- **Backend** (`apps/backend/gqlgen.yml`): generates `graph/generated.go` + `graph/models_gen.go`; resolvers in `graph/schema.resolvers.go`. The `MechanismNode` type is mapped to `repair-platform/models.MechanismNode` so it stays consistent with the AI-service contract.
- **Frontend** (`apps/frontend/codegen.yml`): outputs `src/generated/graphql.ts` (hooks + types). `documents` globs both `src/graphql/**` and inline `gql\`` in `src/api/graphql/*.ts`.
- **Mobile** (`apps/mobile/codegen.yml`): outputs `src/generated/graphql.ts`.
- **Required after schema changes**: `pnpm -C apps/backend generate` AND `pnpm codegen` at root (or in each app). Failing to do both creates wire-format drift.
- The single GraphQL endpoint is `POST /graphql` (also `GET /graphql` for the playground in non-prod). Authentication is JWT Bearer, optional on most operations and enforced inside resolvers.

### Backend ↔ AI service contract
The Go backend acts as a thin proxy in front of the FastAPI service for GraphRAG features. `apps/backend/services/ai_service.go` calls `${AI_SERVICE_URL}/generate/mechanism-tree`, `/global-search`, `/embedding`, `/build-communities`, etc. (default `AI_SERVICE_URL=http://localhost:8000`, timeout 150 s). When the AI service is unreachable, `GenerateMechanismTree` falls back to `getFallbackMockData` so the GraphQL endpoint still returns a valid shape — preserve this fallback. REST routes that proxy to the AI service: `POST /graph/search`, `/graph/global-search`, `/graph/build-communities`, `/graph/stream`.

### Two databases
- **Main DB** (`DB_TYPE`/`DATABASE_URL`): SQLite by default (`apps/backend/blog_platform.db`), PostgreSQL in production. Holds blog posts, users, comments, files. Migrations run automatically (`apps/backend/database/migrations.go`).
- **GraphRAG DB** (`InitGraphRAGDB`): a separate PostgreSQL connection for pgvector knowledge graph data. The AI service writes here directly via asyncpg; the Go backend reads through `services/graph_rag.go` for `LocalSearch`. If this connection fails, GraphRAG features degrade gracefully but the rest of the backend keeps working.

### Static export pipeline
`pnpm build:static` builds the SPA in static-export mode, then runs `apps/backend/cmd/export_static/main.go` to dump the DB content into the static bundle (so the resulting site works without a backend). Output goes to `apps/frontend/dist-static/`, which is also published to `xloudmax.cc` via the written `CNAME`. `run_pipeline.sh` is an unrelated research script (AI-service benchmarks → LaTeX thesis rebuild) — don't confuse the two.

### First-run admin account
`apps/backend/main.go::ensureAdminAccount` creates `admin / admin123456` on first boot if no `admin` user exists. This default is checked into the code path — production deployments must rotate it immediately.

## Environment & ports

Backend reads `apps/backend/.env` (see `apps/backend/CONFIG.md` for the full list):
- `PORT=11451`, `GIN_MODE`, `LOG_LEVEL`
- `DB_TYPE` (`sqlite`|`postgres`), `DATABASE_URL`
- `JWT_SECRET` (defaults to `JNU_technicians_club` — must override in prod), `BCRYPT_COST`, `SESSION_TIMEOUT`, `REFRESH_TOKEN_TIMEOUT`
- `ALLOWED_ORIGINS` (CORS), `RATE_LIMIT_ENABLED`, `CACHE_ENABLED`
- `AI_SERVICE_URL`, `AI_SERVICE_TIMEOUT`
- `POSTGRES_DSN` / GraphRAG DSN for the pgvector store
- `GITHUB_CLIENT_ID/SECRET`, `NOTION_TOKEN`, SMTP vars, optional `REDIS_HOST/PORT/PASS/DB`
- `ENABLE_PPROF=true` exposes `/debug/pprof` on `:6060`

Frontend uses `VITE_API_BASE_URL` (defaults to `http://localhost:11451`); resolution lives in `apps/frontend/src/utils/config.ts` and is platform-aware (web dev / Tauri desktop / iOS).

## Conventions worth knowing

- **Package manager pinned**: `packageManager: pnpm@10.33.2` at the root. The workspace is `apps/*` (`pnpm-workspace.yaml`), `nodeLinker: hoisted`.
- **React 19**: `@ant-design/v5-patch-for-react-19` is imported in `apps/frontend/src/main.tsx` — keep it as the first AntD-related import.
- **Backend logging**: zap via `middleware.GetLogger()`. Log statements in this codebase are mixed Chinese/English — match the surrounding file's language when adding new ones.
- **Per-app sub-CLAUDE.md docs are authoritative** for `apps/ai-service` (corpus/benchmark workflows, LLM routing, asymmetric compute) and `apps/mobile` (Expo Router, Apollo refresh-token flow, NativeWind). Don't duplicate that content here — link to it.

## Production / deploy artifacts

A self-hosted VPS launch is wired up under `deploy/` and the root `Makefile`:

- `deploy/deploy.sh` — idempotent root-level installer. Reads `deploy/.env.deploy` (copy from `.env.deploy.example`), builds backend+frontend+ai-service, swaps binaries, reloads nginx & systemd. **Never echoes secrets to logs.**
- `deploy/POSTGRES_SETUP.md` — install PG 16 + pgvector, provision the two databases (`blog`, `blog_graph`).
- `deploy/systemd/{blog-backend,blog-ai-service}.service` — hardened units (ProtectSystem=strict, SystemCallFilter, etc.).
- `deploy/nginx/blog.conf` — direct-to-VPS TLS config (Let's Encrypt). `deploy/nginx/blog-cloudflare.conf` is the Cloudflare-fronted variant.
- `deploy/scripts/{backup_db,restore_db,health_check,rotate-secrets}.sh` — PG-aware (`pg_dump --format=custom`).
- `docker-compose.yml` brings up the full local stack (`pgvector/pgvector:pg16` → backend → ai-service → frontend) with healthcheck-cascading `depends_on`. `docker-compose.prod.yml` is a production override (drops the frontend container, caps log sizes, binds 127.0.0.1 only).
- `apps/backend/Dockerfile`, `apps/frontend/Dockerfile` (+ `apps/frontend/nginx.conf` for the container) are multi-stage with non-root runtimes and HEALTHCHECKs.
- `scripts/rewrite-history.sh` + `scripts/history-purge-paths.txt` — wraps `git filter-repo` to scrub the leaked `.env` and big binaries from history. **Refuses to run without `--i-have-rotated-secrets`** and creates a mirror backup before rewriting.

Common workflows via `make`:

```bash
make help             # list targets
make dev              # docker compose up -d
make dev-build        # rebuild images
make dev-logs         # tail all services
make dev-down         # stop, keep volumes
make dev-reset        # WIPE pgdata volume (asks first)
make prod-config      # render merged prod compose for validation
make prod-deploy      # ssh to $DEPLOY_HOST and run deploy/deploy.sh
make prod-backup      # ssh + run backup_db.sh
make codegen          # backend gqlgen + frontend/mobile graphql-codegen
make security-rewrite # destructive history rewrite (read it first)
```

### Required env files

| Path | Purpose |
|---|---|
| `apps/backend/.env` | backend config — `JWT_SECRET` (>=32 chars, never the legacy literal `JNU_technicians_club`), `DATABASE_URL`, `POSTGRES_DSN`, etc. Server panics in production if these are missing or weak. |
| `apps/ai-service/.env` | LLM key + `GRAPH_DATABASE_URL` |
| `.env` (root) | compose-only vars (PG password, build args). Copy from `.env.example`. |
| `deploy/.env.deploy` | deploy-time config (public URL, install paths). Copy from `.env.deploy.example`. |

### Initial admin

The server **no longer auto-creates** the legacy `admin / admin123456` account. Provision it explicitly via:

```bash
sudo -u www-data \
  INITIAL_ADMIN_USERNAME=admin \
  INITIAL_ADMIN_PASSWORD='<strong, >=12 chars>' \
  INITIAL_ADMIN_EMAIL=you@example.com \
  /var/www/blog/apps/backend/bin/tools/create_admin
```

Or run `create_admin` with no args for a random password (printed once, never re-shown).
