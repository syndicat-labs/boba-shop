#!/usr/bin/env bash
# Shared helpers for boba-shop deploy scripts. Source from the deploy scripts.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DEV_COMPOSE=(-f docker-compose.dev.yml)
PROD_COMPOSE=(-f docker-compose.yml)

log() { printf '\033[1;34m[deploy]\033[0m %s\n' "$*"; }
ok() { printf '\033[1;32m[deploy]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[deploy]\033[0m %s\n' "$*"; }
err() { printf '\033[1;31m[deploy] ERROR:\033[0m %s\n' "$*" >&2; exit 1; }

require() {
  for c in "$@"; do
    command -v "$c" >/dev/null 2>&1 || err "missing required command: $c"
  done
}

# Copy an env example to the real file if it doesn't exist yet.
ensure_env() {
  local file="$1" example="$2"
  if [ ! -f "$file" ]; then
    log "creating $file from $example"
    cp "$example" "$file"
  fi
}

# Build the Angular SPA into frontend/dist/boba-shop/browser (mounted by nginx).
build_frontend() {
  log "building frontend…"
  (
    cd "$ROOT/frontend"
    [ -d node_modules ] || npm ci --no-audit --no-fund
    npm run build
  )
}

# Poll a URL until it returns 2xx/3xx, or fail.
wait_for_url() {
  local url="$1" tries="${2:-40}" i
  for i in $(seq 1 "$tries"); do
    if curl -sf -o /dev/null "$url"; then return 0; fi
    sleep 1
  done
  return 1
}

# Pull the public *.trycloudflare.com URL out of the cloudflared container logs.
discover_tunnel_url() {
  local compose_args=("$@") url="" i
  for i in $(seq 1 40); do
    url="$(docker compose "${compose_args[@]}" logs cloudflared 2>/dev/null \
      | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | head -1 || true)"
    if [ -n "$url" ]; then printf '%s' "$url"; return 0; fi
    sleep 2
  done
  return 1
}
