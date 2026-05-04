#!/usr/bin/env bash
# =============================================================================
# deploy/scripts/restore_db.sh <backup-dir-or-timestamp>
# Restores both DBs and uploads/ from a backup created by backup_db.sh.
# Refuses to overwrite without --force.
# =============================================================================

set -euo pipefail

usage() {
  cat <<EOF
Usage: $0 [--force] <backup-dir|timestamp>

Examples:
  $0 /var/backups/blog/20260501-021500
  $0 20260501-021500          # resolved against \$BACKUP_ROOT
  $0 --force latest           # symlink target /var/backups/blog/latest

Env:
  BACKUP_ROOT   default /var/backups/blog
  APP_DIR       default /var/www/blog
EOF
  exit 1
}

FORCE=0
if [[ "${1:-}" == "--force" ]]; then
  FORCE=1
  shift
fi
[[ $# -eq 1 ]] || usage

BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/blog}"
APP_DIR="${APP_DIR:-/var/www/blog}"
UPLOADS_DIR="${UPLOADS_DIR:-$APP_DIR/apps/backend/uploads}"
ENV_FILE="${ENV_FILE:-$APP_DIR/apps/backend/.env}"

ARG="$1"
if [[ -d "$ARG" ]]; then
  SRC="$ARG"
else
  SRC="$BACKUP_ROOT/$ARG"
fi

if [[ ! -d "$SRC" ]]; then
  echo "ERROR: backup directory not found: $SRC" >&2
  exit 2
fi

[[ -r "$ENV_FILE" ]] || { echo "ERROR: cannot read $ENV_FILE" >&2; exit 3; }

get_var() {
  local key="$1"
  awk -F= -v k="$key" '$1==k {sub(/^[^=]*=/,""); sub(/[ \t]*#.*$/,""); gsub(/^"|"$|^'"'"'|'"'"'$/,""); print; exit}' "$ENV_FILE"
}
MAIN_DSN="$(get_var DATABASE_URL)"
GRAPH_DSN="$(get_var POSTGRES_DSN)"
[[ -n "$MAIN_DSN" ]] || { echo "ERROR: DATABASE_URL empty" >&2; exit 4; }

if [[ "$FORCE" -ne 1 ]]; then
  echo "About to OVERWRITE the live databases with $SRC."
  read -r -p "Type 'yes' to continue: " confirm
  [[ "$confirm" == "yes" ]] || { echo "aborted"; exit 0; }
fi

# Stop the backend so it can't write during restore.
if systemctl --quiet is-active blog-backend; then
  echo "==> Stopping blog-backend"
  sudo systemctl stop blog-backend
  RESTART_BACKEND=1
else
  RESTART_BACKEND=0
fi

if systemctl --quiet is-active blog-ai-service; then
  echo "==> Stopping blog-ai-service"
  sudo systemctl stop blog-ai-service
  RESTART_AI=1
else
  RESTART_AI=0
fi

echo "==> Restoring main database"
pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname="$MAIN_DSN" \
  "$SRC/main.dump"

if [[ -n "$GRAPH_DSN" && -f "$SRC/graph.dump" ]]; then
  echo "==> Restoring graph database"
  pg_restore --clean --if-exists --no-owner --no-privileges \
    --dbname="$GRAPH_DSN" \
    "$SRC/graph.dump"
fi

if [[ -f "$SRC/uploads.tar.gz" ]]; then
  echo "==> Restoring uploads/"
  rm -rf "$UPLOADS_DIR.restoring"
  mkdir -p "$UPLOADS_DIR.restoring"
  tar -C "$UPLOADS_DIR.restoring" -xzf "$SRC/uploads.tar.gz"
  rm -rf "$UPLOADS_DIR"
  mv "$UPLOADS_DIR.restoring/$(basename "$UPLOADS_DIR")" "$UPLOADS_DIR"
  rmdir "$UPLOADS_DIR.restoring"
fi

[[ "$RESTART_BACKEND" -eq 1 ]] && sudo systemctl start blog-backend
[[ "$RESTART_AI" -eq 1 ]] && sudo systemctl start blog-ai-service

echo "==> Restore complete from $SRC"
