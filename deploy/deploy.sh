#!/usr/bin/env bash
# =============================================================================
# deploy/deploy.sh — Build and install C404-blog onto the VPS.
#
# Run as root on the VPS. Idempotent: re-run after every git pull.
#
# Pre-conditions (the script will fail fast if missing):
#   - PostgreSQL 16 + pgvector installed (see deploy/POSTGRES_SETUP.md)
#   - The deploy host has Go 1.25+, Node 22+, pnpm 10+, uv installed system-wide
#   - $APP_DIR/apps/backend/.env exists, with JWT_SECRET, DATABASE_URL, POSTGRES_DSN set
#   - $APP_DIR/apps/ai-service/.env exists with GOOGLE_CLOUD_API_KEY + GRAPH_DATABASE_URL
#   - deploy/.env.deploy exists (copied from deploy/.env.deploy.example)
#
# What it does NOT do:
#   - Print any secret to stdout / logs
#   - Create the admin account (run apps/backend/bin/tools/create_admin manually)
#   - Modify .env files in place
#   - Open firewall ports
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ---------- Load deploy-time config ----------
DEPLOY_ENV_FILE="$SCRIPT_DIR/.env.deploy"
if [[ ! -r "$DEPLOY_ENV_FILE" ]]; then
  echo "ERROR: $DEPLOY_ENV_FILE missing. Copy from .env.deploy.example and edit." >&2
  exit 1
fi
# shellcheck disable=SC1090
set -a
source "$DEPLOY_ENV_FILE"
set +a

# Defaults if .env.deploy didn't set them
DEPLOY_USER="${DEPLOY_USER:-www-data}"
APP_DIR="${APP_DIR:-/var/www/blog}"
BACKEND_DIR="${BACKEND_DIR:-$APP_DIR/apps/backend}"
FRONTEND_DIR="${FRONTEND_DIR:-$APP_DIR/dist}"
AI_SERVICE_DIR="${AI_SERVICE_DIR:-$APP_DIR/apps/ai-service}"
PUBLIC_API_BASE_URL="${PUBLIC_API_BASE_URL:?PUBLIC_API_BASE_URL must be set in .env.deploy}"
REBUILD_AI_VENV="${REBUILD_AI_VENV:-true}"

# ---------- Sanity ----------
if [[ "$EUID" -ne 0 ]]; then
  echo "Please run as root (e.g. sudo $0)" >&2
  exit 2
fi

require_cmd() { command -v "$1" >/dev/null 2>&1 || { echo "ERROR: $1 not found on PATH" >&2; exit 3; }; }
require_cmd go
require_cmd pnpm
require_cmd uv
require_cmd nginx
require_cmd systemctl

# ---------- Pre-flight: per-app .env presence (do NOT read contents) ----------
for f in "$BACKEND_DIR/.env" "$AI_SERVICE_DIR/.env"; do
  if [[ ! -r "$f" ]]; then
    echo "ERROR: missing $f. Provision the per-app .env file before deploying." >&2
    exit 4
  fi
  # Ensure restrictive perms on every deploy
  chmod 600 "$f"
  chown "$DEPLOY_USER:$DEPLOY_USER" "$f" || true
done

# ---------- Step 1: prepare directories ----------
echo "==> Preparing directories under $APP_DIR"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 0755 "$APP_DIR" "$BACKEND_DIR" "$FRONTEND_DIR" "$AI_SERVICE_DIR"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 0775 \
  "$BACKEND_DIR/bin" "$BACKEND_DIR/bin/tools" "$BACKEND_DIR/uploads" "$BACKEND_DIR/logs" "$BACKEND_DIR/data" \
  "$AI_SERVICE_DIR/logs"

# ---------- Step 2: build backend ----------
echo "==> Building backend (go build, tags: sqlite_fts5,fts5)"
pushd "$REPO_ROOT/apps/backend" >/dev/null
sudo -u "$DEPLOY_USER" go mod download
sudo -u "$DEPLOY_USER" go build -tags 'sqlite_fts5 fts5' -trimpath \
  -ldflags='-s -w' -o "$BACKEND_DIR/bin/server.next" main.go
sudo -u "$DEPLOY_USER" go build -trimpath -o "$BACKEND_DIR/bin/tools/create_admin.next" cmd/create_admin/main.go
popd >/dev/null

# ---------- Step 3: stop services, swap binaries, restart ----------
echo "==> Stopping services for binary swap"
systemctl stop blog-backend 2>/dev/null || true

mv "$BACKEND_DIR/bin/server.next" "$BACKEND_DIR/bin/server"
mv "$BACKEND_DIR/bin/tools/create_admin.next" "$BACKEND_DIR/bin/tools/create_admin"
chown "$DEPLOY_USER:$DEPLOY_USER" "$BACKEND_DIR/bin/server" "$BACKEND_DIR/bin/tools/create_admin"
chmod 0755 "$BACKEND_DIR/bin/server" "$BACKEND_DIR/bin/tools/create_admin"

# Copy schema + GraphQL configs that the binary needs at runtime (gqlgen reads
# graph/schema.graphql for the playground; nothing else from the source tree
# is read at runtime, but graph/ is small).
rsync -a --delete "$REPO_ROOT/apps/backend/graph/schema.graphql" "$BACKEND_DIR/graph/schema.graphql"

# ---------- Step 4: build frontend ----------
echo "==> Building frontend with VITE_API_BASE_URL=$PUBLIC_API_BASE_URL"
pushd "$REPO_ROOT" >/dev/null
sudo -u "$DEPLOY_USER" pnpm install --frozen-lockfile
VITE_API_BASE_URL="$PUBLIC_API_BASE_URL" sudo -u "$DEPLOY_USER" pnpm -C apps/frontend build
popd >/dev/null

echo "==> Syncing frontend bundle to $FRONTEND_DIR"
rsync -a --delete "$REPO_ROOT/apps/frontend/dist/" "$FRONTEND_DIR/"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$FRONTEND_DIR"

# ---------- Step 5: AI service venv ----------
if [[ "$REBUILD_AI_VENV" == "true" ]]; then
  echo "==> (Re)building AI service venv via uv"
  pushd "$REPO_ROOT/apps/ai-service" >/dev/null
  sudo -u blog-ai uv sync --frozen --no-dev
  popd >/dev/null
fi

# Sync ai-service code to the deployed location (excluding caches and venv)
rsync -a --delete \
  --exclude='.venv' --exclude='__pycache__' --exclude='.pytest_cache' \
  --exclude='.embedding_cache.json' --exclude='.gemini_cache.json' \
  --exclude='.gemini_cache.json.bak_*' --exclude='logs/' \
  "$REPO_ROOT/apps/ai-service/" "$AI_SERVICE_DIR/"
# Keep the venv in place if rebuild was skipped
if [[ "$REBUILD_AI_VENV" == "true" ]]; then
  rsync -a "$REPO_ROOT/apps/ai-service/.venv/" "$AI_SERVICE_DIR/.venv/" 2>/dev/null || true
fi
chown -R blog-ai:blog-ai "$AI_SERVICE_DIR" || true

# ---------- Step 6: install / refresh systemd units ----------
echo "==> Installing systemd units"
install -m 0644 "$SCRIPT_DIR/systemd/blog-backend.service"    /etc/systemd/system/blog-backend.service
install -m 0644 "$SCRIPT_DIR/systemd/blog-ai-service.service" /etc/systemd/system/blog-ai-service.service
systemctl daemon-reload
systemctl enable blog-backend blog-ai-service >/dev/null

# ---------- Step 7: nginx ----------
NGINX_FILE="${NGINX_FILE:-blog.conf}"
echo "==> Installing nginx config: $NGINX_FILE"
install -m 0644 "$SCRIPT_DIR/nginx/$NGINX_FILE" /etc/nginx/sites-available/blog
ln -sf /etc/nginx/sites-available/blog /etc/nginx/sites-enabled/blog
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# ---------- Step 8: logrotate ----------
install -m 0644 "$SCRIPT_DIR/logrotate.d/blog-backend" /etc/logrotate.d/blog-backend

# ---------- Step 9: start services ----------
echo "==> Starting services"
systemctl restart blog-backend
systemctl restart blog-ai-service
sleep 2
systemctl --no-pager --quiet status blog-backend     || { echo "blog-backend failed to start"; journalctl -u blog-backend -n 50 --no-pager; exit 5; }
systemctl --no-pager --quiet status blog-ai-service  || { echo "blog-ai-service failed to start"; journalctl -u blog-ai-service -n 50 --no-pager; exit 6; }

# ---------- Step 10: smoke test ----------
echo "==> Smoke testing"
sleep 2
curl -fsS "http://127.0.0.1:11451/health/ping" >/dev/null && echo "  backend ping ok"
curl -fsS "http://127.0.0.1:11451/health/db"   >/dev/null && echo "  backend db ok"
curl -fsS "http://127.0.0.1:8000/health"       >/dev/null && echo "  ai-service health ok" || echo "  WARN: ai-service /health not 200 (may still be warming up)"

cat <<EOF

==============================================================
Deploy complete.

Next steps (manual, only if this is a fresh deploy):

  # First-time admin (will not overwrite an existing admin):
  sudo -u $DEPLOY_USER \\
    INITIAL_ADMIN_USERNAME=admin \\
    INITIAL_ADMIN_PASSWORD='<paste a strong one>' \\
    INITIAL_ADMIN_EMAIL=you@example.com \\
    $BACKEND_DIR/bin/tools/create_admin

  # Or generate a random password:
  sudo -u $DEPLOY_USER $BACKEND_DIR/bin/tools/create_admin

Public URL: $PUBLIC_API_BASE_URL
==============================================================
EOF
