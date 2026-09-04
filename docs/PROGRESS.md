# Progress Status — boba-shop

> Last updated: 2026-09-04 · Branch: `feature/production-foundation` · Status: active development, dev-deployed at http://localhost/

## Overview

Multi-tenant boba-shop platform. Backend: Django 5 + DRF + Channels (daphne) + Postgres 16 + Redis 7 + MinIO, hexagonal layout. Frontend: Angular 17 (obsidian design language, mobile-first 390px). The **owner/admin portal** is functional and running; the **customer menu** is still the static prototype and is the next major build.

## What is done

### Backend (`backend/`)
- **Foundation** — `manage.py`, `Dockerfile`, app packages + migrations for `tenants/users/orders/banners/catalog/payments/scheduling`, `INSTALLED_APPS`, `.env.example`/`.env.prod.example`, exception envelope handler (`{category,code,message,context,retryable,requestId}`), `TenantAwareMiddleware`, `TenantBackend` (tenant-scoped email auth).
- **Error taxonomy** — 7 categories (`VALIDATION/AUTHENTICATION/AUTHORIZATION/NOT_FOUND/EXTERNAL_DEPENDENCY/INTERNAL/RATE_LIMITED`) mapped to HTTP via `api/exceptions.py`.
- **Catalog + pricing** — `Product` CRUD (OWNER), `card_image_key` (inline thumbnail), positive-price validation, `+₵0.80` oat modifier domain, soft-delete, `ProductEvent` audit.
- **Orders** — state machine `SENT→RECEIVED→PROCESSING→READY→AWAITING_PICKUP→COMPLETED`, 4-digit pickup code (30m TTL), `PATCH /orders/{id}/status`, throttled `pickup_verify`, `receipt` (Pillow+qrcode PNG).
- **Payments** — `Payment` model + `PspPort` (MockPsp dev-only, prod-guarded).
- **Banners** — CRUD + real WS publish (group names fixed to use `.` separator), sort-slot collision → clean `400 BANNER_SORT_TAKEN`.
- **Staff/RBAC** — `IsOwner`/`IsOwnerOrStaff`/zero-trust `TenantMixin` (cross-tenant access → 403), `POST /staff/invite`.
- **Analytics** — revenue/orders/top-SKUs aggregation (owner).
- **Uploads** — `POST /uploads/image` (owner), validates + re-encodes to **WebP**.
- **Menu QR** — `GET /menu/qr/?url=…` renders QR PNG.
- **Auth** — session login/logout/me (`/auth/*`), `me` returns 200 `{authenticated:false}` when anonymous.
- **Seed** — `seed_demo` (tenant + owner + 6 SKUs + banner + 3 demo orders), idempotent.

### Frontend (`frontend/`, Angular 17)
- Full scaffold (`angular.json`, `tsconfig`, tokens imported via `styles.css`, obsidian `data-theme`).
- Auth service (session, signal-based), `TenantInterceptor` (`X-Tenant-Slug`), `CsrfInterceptor`, `authGuard`.
- Admin shell + 6 pages: **Queue** (live stepper + merged pickup verification), **Catalog** (customer-style menu rows with faded bg image + add/edit modals + upload cards + auto SKU), **Banners** (live video preview + sort selector), **Menu QR**, **Staff**, **Analytics**.
- Reusable components: `boba-modal`, `boba-upload-card`.

### Deployment (`deploy/`, `nginx/`, `docker-compose*.yml`)
- `deploy/local.sh` (dev), `deploy/tunnel.sh` (Cloudflare quick tunnel for phone testing), `deploy/prod.sh` (prod + optional named tunnel).
- `docker-compose.dev.yml` (postgres/redis/minio/web/nginx), `docker-compose.yml` (prod), `docker-compose.tunnel.yml`.
- `nginx.dev.conf` / `nginx.prod.conf` (SPA + `/api` + `/ws` + `/assets` + `/media`).
- Prod settings: `TRUST_PROXY` gate for `SECURE_PROXY_SSL_HEADER`, `CSRF_TRUSTED_ORIGINS`, mock forbidden.

## Verification status (all green)

| Gate | Result |
|---|---|
| `ruff check backend` | ✅ clean |
| `mypy backend --ignore-missing-imports` | ✅ clean (89 files) |
| `pytest --cov=core --cov-fail-under=80` | ✅ **52 passed, 85.6% coverage** |
| `ng build` | ✅ clean |
| Live smoke (curl) | ✅ login, staff, analytics, orders, upload→webp, menu QR, receipt PNG, banner sort collision |

## Known gaps (→ see `docs/IMPLEMENTATION_PLAN.md`)

- **Customer menu not in Angular yet** (static `prototypes/obsidian/menu.html` only).
- **No `POST /orders`** — orders only exist via seed (checkout not wired).
- **Mock PSP only** — no real payment adapter.
- **Session auth** — OAuth2.1 + Passkeys not implemented (CSRF-exempt login is `PROD-FLAG`ged).
- **Receipts** — generated in-memory/FS, not S3/MinIO.
- **Queue live updates** — frontend polls; WS group publish works but the SPA doesn't subscribe yet.
- **Observability** — structured logging configured, no OTEL/metrics/alerting.
- **Celery beat** — no pickup-code expiry job (installed but unused).
