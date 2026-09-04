#!/usr/bin/env bash
# Production deploy — prod settings, real secrets, daphne (ASGI) + nginx.
# TLS: set CLOUDFLARE_TUNNEL_TOKEN to a Cloudflare named tunnel, or front port 80
# with your own TLS-terminating proxy (nginx+certbot / load balancer).
set -euo pipefail
source "$(dirname "$0")/lib.sh"

cd "$ROOT"
require docker npm curl

ENV_FILE="$ROOT/backend/.env.prod"
ensure_env "$ENV_FILE" "$ROOT/backend/.env.prod.example"

# Fail loudly on insecure or incomplete production config.
grep -qE '^DJANGO_SECRET_KEY=.+' "$ENV_FILE" \
  || err ".env.prod: DJANGO_SECRET_KEY must be set (generate: python -c \"import secrets; print(secrets.token_urlsafe(50))\")"
grep -qE '^DJANGO_SECRET_KEY=dev-only' "$ENV_FILE" && err ".env.prod: do not use the dev secret key"
grep -qE '^ALLOWED_HOSTS=.+' "$ENV_FILE" || err ".env.prod: ALLOWED_HOSTS must be set"
grep -qE '^POSTGRES_PASSWORD=.+' "$ENV_FILE" || err ".env.prod: POSTGRES_PASSWORD must be set"
grep -qE '^PSP_ACTIVE=mock' "$ENV_FILE" && err ".env.prod: PSP_ACTIVE=mock is forbidden in production"
[ -z "${CLOUDFLARE_TUNNEL_TOKEN:-}" ] && grep -qE '^TRUST_PROXY=1' "$ENV_FILE" \
  && warn "TRUST_PROXY=1 but no CLOUDFLARE_TUNNEL_TOKEN — ensure an edge proxy terminates TLS"

build_frontend

log "starting production stack (postgres + redis + web + nginx)…"
docker compose "${PROD_COMPOSE[@]}" up -d --build

log "waiting for the API to come up…"
wait_for_url "http://localhost/" || err "stack did not become ready — check: docker compose -f docker-compose.yml logs web"

if [ -n "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]; then
  log "starting Cloudflare named tunnel (TLS at the edge)…"
  CLOUDFLARE_TUNNEL_TOKEN="$CLOUDFLARE_TUNNEL_TOKEN" \
    docker compose "${PROD_COMPOSE[@]}" --profile tunnel up -d cloudflared
fi

ok "production deploy complete."
printf '\n  Health:   http://localhost/ (or your Cloudflare origin)\n'
printf '  Teardown: docker compose -f docker-compose.yml [--profile tunnel] down\n\n'
