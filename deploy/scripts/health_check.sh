#!/usr/bin/env bash
# =============================================================================
# deploy/scripts/health_check.sh
# Cron-friendly health check. Exits non-zero on failure so monitoring tools
# (cron-mailto / Uptime Kuma / etc.) can trigger alerts.
#
# Env:
#   PUBLIC_URL          public base URL (e.g. https://blog.example.com)
#   AI_SERVICE_URL      default http://127.0.0.1:8000
#   BACKEND_PORT        default 11451
# =============================================================================

set -uo pipefail

PUBLIC_URL="${PUBLIC_URL:-http://127.0.0.1}"
AI_SERVICE_URL="${AI_SERVICE_URL:-http://127.0.0.1:8000}"
BACKEND_PORT="${BACKEND_PORT:-11451}"

red() { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }

FAILED=0
fail() { red "✘ $*"; FAILED=$((FAILED+1)); }
ok()   { green "✓ $*"; }

check_systemd() {
  local svc="$1"
  if systemctl is-active --quiet "$svc"; then ok "$svc active"
  else fail "$svc inactive"; fi
}

check_http() {
  local url="$1" expected="$2" name="$3"
  local code
  code=$(curl -ksS -o /dev/null -w '%{http_code}' --max-time 10 "$url" || echo "000")
  if [[ "$code" == "$expected" ]]; then ok "$name ($url) → $code"
  else fail "$name ($url) → $code (expected $expected)"; fi
}

echo "===================== System ====================="
df -h / | awk 'NR==2 {print "  disk: " $3 " / " $2 " (" $5 ")"}'
free -h | awk '/^Mem:/ {print "  mem:  " $3 " / " $2}'
uptime -p | sed 's/^/  /'

echo "===================== Services ==================="
for svc in blog-backend blog-ai-service nginx postgresql; do
  check_systemd "$svc"
done

echo "===================== Endpoints =================="
check_http "${PUBLIC_URL}/health/ping"    "200" "frontend → backend ping"
check_http "${PUBLIC_URL}/health/db"      "200" "backend → main DB"
check_http "${PUBLIC_URL}/health/graphql" "200" "backend → GraphQL ready"
check_http "${AI_SERVICE_URL}/health"     "200" "AI service /health"

echo "===================== Errors (recent) ============"
echo "  blog-backend (last 5 errors):"
sudo journalctl -u blog-backend -p err -n 5 --no-pager 2>/dev/null | sed 's/^/    /' || true
echo "  blog-ai-service (last 5 errors):"
sudo journalctl -u blog-ai-service -p err -n 5 --no-pager 2>/dev/null | sed 's/^/    /' || true
echo "  nginx (last 5 lines of error log):"
sudo tail -n 5 /var/log/nginx/blog_error.log 2>/dev/null | sed 's/^/    /' || true

echo "==================================================="
if [[ $FAILED -eq 0 ]]; then green "All checks passed."; exit 0;
else red "$FAILED check(s) failed."; exit 1; fi
