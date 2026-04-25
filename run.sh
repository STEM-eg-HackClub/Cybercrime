#!/usr/bin/env bash
# Start API + Vite shell for local development. Ctrl+C stops both.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$ROOT/apps/api"
WEB_DIR="$ROOT/apps/web"
API_PORT="${PORT:-3001}"

cleanup() {
  if [[ -n "${API_PID:-}" ]] && kill -0 "$API_PID" 2>/dev/null; then
    echo ""
    echo "Stopping API (pid $API_PID)…"
    kill "$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

cd "$ROOT"

if [[ ! -f "$API_DIR/.env" ]]; then
  if [[ -f "$API_DIR/.env.example" ]]; then
    cp "$API_DIR/.env.example" "$API_DIR/.env"
    echo "Created $API_DIR/.env from .env.example (edit ADMIN_TOKEN if needed)."
  fi
fi

echo "Installing dependencies (if missing)…"
(cd "$API_DIR" && npm install)
(cd "$WEB_DIR" && npm install)

if [[ -f "$ROOT/scripts/sync-game-to-public.sh" ]]; then
  echo "Syncing Web export to apps/web/public/game/ (if files exist)…"
  "$ROOT/scripts/sync-game-to-public.sh" || true
fi

export ADMIN_TOKEN="${ADMIN_TOKEN:-dev-local-admin}"
export WEB_ORIGINS="${WEB_ORIGINS:-http://127.0.0.1:5173,http://localhost:5173}"
export PORT="$API_PORT"

echo "Starting API on http://127.0.0.1:$API_PORT …"
(cd "$API_DIR" && npm run dev) &
API_PID=$!

echo "Waiting for API health…"
for _ in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:$API_PORT/health" >/dev/null; then
    break
  fi
  sleep 0.25
done
if ! curl -sf "http://127.0.0.1:$API_PORT/health" >/dev/null; then
  echo "API did not become healthy; check $API_DIR logs above."
  exit 1
fi

echo ""
echo "Shell:  http://127.0.0.1:5173/"
echo "Admin:  http://127.0.0.1:5173/admin.html  (token: $ADMIN_TOKEN)"
echo "API:    http://127.0.0.1:$API_PORT/health"
echo ""

(cd "$WEB_DIR" && npm run dev)
