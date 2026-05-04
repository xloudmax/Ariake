#!/usr/bin/env bash
# =============================================================================
# deploy/scripts/rotate-secrets.sh
# Walk-through helper for rotating JWT_SECRET and the Postgres password
# without dropping requests. Does NOT auto-rotate — it generates new values,
# tells you exactly what to paste where, and offers to bounce the services.
# =============================================================================

set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/blog}"
BACKEND_ENV="$APP_DIR/apps/backend/.env"
AI_ENV="$APP_DIR/apps/ai-service/.env"

echo "=========================================="
echo " C404 secret rotation walk-through"
echo "=========================================="
echo
echo "This will guide you through rotating:"
echo "  1) JWT_SECRET in $BACKEND_ENV"
echo "  2) The Postgres password (main and graph DBs)"
echo "  3) GOOGLE_CLOUD_API_KEY in $AI_ENV (manual — go to Google Cloud Console)"
echo
echo "It will NOT modify .env in-place. You copy the new values yourself."
echo

# ---------------- JWT ----------------
echo "----- 1. JWT_SECRET -----"
NEW_JWT="$(openssl rand -base64 48 | tr -d '\n')"
echo "Suggested replacement (48 random bytes, base64-encoded):"
echo "  JWT_SECRET=$NEW_JWT"
echo
echo "After updating $BACKEND_ENV with the new value, run:"
echo "  sudo systemctl restart blog-backend"
echo
echo "Note: in-flight refresh tokens become invalid. Users may see a single 401"
echo "and re-authenticate. This is expected."
echo
read -r -p "Press Enter when done with the JWT step (or Ctrl-C to abort)..."

# ---------------- Postgres ----------------
echo
echo "----- 2. Postgres password (main + graph) -----"
NEW_MAIN_PG="$(openssl rand -base64 32 | tr -d '\n=' | head -c 32)"
NEW_GRAPH_PG="$(openssl rand -base64 32 | tr -d '\n=' | head -c 32)"
echo "Suggested values:"
echo "  blog       password: $NEW_MAIN_PG"
echo "  blog_graph password: $NEW_GRAPH_PG"
echo
cat <<EOF
Step-by-step (run each line manually):

  # 2a. Change role passwords in Postgres
  sudo -u postgres psql -c "ALTER ROLE blog       WITH PASSWORD '$NEW_MAIN_PG';"
  sudo -u postgres psql -c "ALTER ROLE blog_graph WITH PASSWORD '$NEW_GRAPH_PG';"

  # 2b. Update DSNs in $BACKEND_ENV:
  #     DATABASE_URL=postgres://blog:<NEW_MAIN>@127.0.0.1:5432/blog?sslmode=verify-full
  #     POSTGRES_DSN=postgres://blog_graph:<NEW_GRAPH>@127.0.0.1:5432/blog_graph?sslmode=verify-full

  # 2c. Update DSN in $AI_ENV:
  #     GRAPH_DATABASE_URL=postgresql://blog_graph:<NEW_GRAPH>@127.0.0.1:5432/blog_graph?sslmode=verify-full

  # 2d. Restart the services that hold connection pools:
  sudo systemctl restart blog-backend blog-ai-service

EOF
read -r -p "Press Enter when Postgres rotation is complete..."

# ---------------- Google API key ----------------
echo
echo "----- 3. GOOGLE_CLOUD_API_KEY / LLM_API_KEY -----"
echo "Manual steps:"
echo "  a. Open https://console.cloud.google.com/apis/credentials"
echo "  b. Delete the old key. Create a new one. Restrict it to Vertex AI APIs only."
echo "  c. Paste the new value into both:"
echo "       $AI_ENV   (GOOGLE_CLOUD_API_KEY=...)"
echo "       (and any operator workstation that runs benchmarks)"
echo "  d. sudo systemctl restart blog-ai-service"
echo
echo "Done. Verify with:"
echo "  curl -fsS http://127.0.0.1:8000/health"
