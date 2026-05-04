#!/usr/bin/env bash
# =============================================================================
# deploy/scripts/backup_db.sh
# Daily backup of both Postgres databases (main + GraphRAG) plus uploads/.
# Cron-friendly: writes to BACKUP_DIR, retains the last $BACKUP_RETAIN days.
# =============================================================================

set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/blog}"
BACKUP_RETAIN="${BACKUP_RETAIN:-14}"
APP_DIR="${APP_DIR:-/var/www/blog}"
UPLOADS_DIR="${UPLOADS_DIR:-$APP_DIR/apps/backend/uploads}"

# Read DSNs from the deployed backend .env (do NOT echo them anywhere).
ENV_FILE="${ENV_FILE:-$APP_DIR/apps/backend/.env}"
if [[ ! -r "$ENV_FILE" ]]; then
  echo "ERROR: cannot read $ENV_FILE" >&2
  exit 1
fi

# Source DATABASE_URL and POSTGRES_DSN without printing them.
# Trim leading 'export ', tolerate inline comments.
get_var() {
  local key="$1"
  awk -F= -v k="$key" 'BEGIN{IGNORECASE=0} \
    $1==k {sub(/^[^=]*=/,""); sub(/[ \t]*#.*$/,""); gsub(/^"|"$|^'"'"'|'"'"'$/,""); print; exit}' \
    "$ENV_FILE"
}

MAIN_DSN="$(get_var DATABASE_URL)"
GRAPH_DSN="$(get_var POSTGRES_DSN)"

if [[ -z "$MAIN_DSN" ]]; then
  echo "ERROR: DATABASE_URL is empty in $ENV_FILE" >&2
  exit 2
fi

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

echo "==> Dumping main database to $BACKUP_DIR/main.dump"
PGPASSWORD_OPTS=()
# pg_dump understands both libpq URI and key=value DSNs.
pg_dump --format=custom --compress=9 --no-owner --no-privileges \
  --file="$BACKUP_DIR/main.dump" \
  "$MAIN_DSN"

if [[ -n "$GRAPH_DSN" ]]; then
  echo "==> Dumping graph database to $BACKUP_DIR/graph.dump"
  pg_dump --format=custom --compress=9 --no-owner --no-privileges \
    --file="$BACKUP_DIR/graph.dump" \
    "$GRAPH_DSN"
else
  echo "==> POSTGRES_DSN unset; skipping graph DB dump."
fi

if [[ -d "$UPLOADS_DIR" ]]; then
  echo "==> Archiving uploads/ to $BACKUP_DIR/uploads.tar.gz"
  tar -C "$(dirname "$UPLOADS_DIR")" -czf "$BACKUP_DIR/uploads.tar.gz" "$(basename "$UPLOADS_DIR")"
fi

# Manifest (does NOT contain secrets — only file sizes and DSN host/db names).
{
  echo "timestamp: $TIMESTAMP"
  echo "host: $(hostname -f)"
  echo "files:"
  ls -lh "$BACKUP_DIR" | awk 'NR>1 {print "  - " $9 " (" $5 ")"}'
} > "$BACKUP_DIR/manifest.txt"

echo "==> Pruning backups older than $BACKUP_RETAIN days from $BACKUP_ROOT"
find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime +"$BACKUP_RETAIN" -print -exec rm -rf {} + || true

echo "==> Backup complete: $BACKUP_DIR"
du -sh "$BACKUP_DIR"
