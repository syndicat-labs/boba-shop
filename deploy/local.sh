#!/usr/bin/env bash
# Local development deploy — dev settings, mock PSP, seeded demo data.
# Serves the admin portal at http://localhost/
set -euo pipefail
source "$(dirname "$0")/lib.sh"

cd "$ROOT"
require docker npm curl

ensure_env "$ROOT/backend/.env" "$ROOT/backend/.env.example"
build_frontend

log "starting local dev stack (postgres + redis + minio + web + nginx)…"
docker compose "${DEV_COMPOSE[@]}" up -d --build

log "waiting for http://localhost/ to come up…"
wait_for_url "http://localhost/" || err "stack did not become ready — check: docker compose -f docker-compose.dev.yml logs"

ok "local dev deploy ready."
printf '\n  Portal:   http://localhost/\n'
printf '  Sign in:  tenant boba-obsidian · owner@etown.com / boba-dev-2026\n'
printf '  Teardown: docker compose -f docker-compose.dev.yml down\n\n'
