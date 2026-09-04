#!/usr/bin/env bash
# Live test deploy — dev stack plus a Cloudflare quick tunnel, so the portal is
# reachable from a phone / any device at a public *.trycloudflare.com URL.
# Dev-only: mock PSP, seeded demo data, ALLOWED_HOSTS=*. Do not use for production.
set -euo pipefail
source "$(dirname "$0")/lib.sh"

cd "$ROOT"
require docker npm curl

ensure_env "$ROOT/backend/.env" "$ROOT/backend/.env.example"
build_frontend

log "starting dev stack + cloudflared tunnel…"
docker compose "${DEV_COMPOSE[@]}" -f docker-compose.tunnel.yml up -d --build

log "waiting for the public URL (this can take ~30s on first run)…"
URL="$(discover_tunnel_url "${DEV_COMPOSE[@]}" -f docker-compose.tunnel.yml)" || {
  warn "could not auto-detect the URL yet — run:"
  warn "  docker compose -f docker-compose.dev.yml -f docker-compose.tunnel.yml logs cloudflared"
  exit 1
}

ok "live tunnel ready."
printf '\n  Public URL: %s\n' "$URL"
printf '  Sign in:    tenant boba-obsidian · owner@etown.com / boba-dev-2026\n'
printf '  Teardown:   docker compose -f docker-compose.dev.yml -f docker-compose.tunnel.yml down\n\n'
