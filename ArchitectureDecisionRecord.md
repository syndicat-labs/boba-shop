# ArchitectureDecisionRecord.md — boba-shop

## Part 1 · Non-technical / business concerns

### 1. Document control
- ADR-002 · Status: accepted · Date: 2026-09-04 · Supersedes: ADR-001
- Deciders: Project lead + Muse Spark
- Consulted: Machine standards (`/home/work/Claude files/CLAUDE.md`), `design-language-protocol v1.0.0`, `assets/receipt1.jpg`, `assets/tracking2.jpg`
- Informed: Customer + Admin users, PSP future vendor
- Review date: 2026-10-04

### 2. Project context
Production boba shop platform, **multi-tenant**, mobile-first admin + fully mobile customer, 6 SKUs locked: Brown Sugar Boba, Matcha Boba, Taro Boba, Coffee Boba, Hong Kong Boba, Strawberry Boba (images `assets/boba/*.jpeg`, price `₵5.20-5.90`, currency `₵`), obsidian is sole active language (`boba-obsidian` from `prototypes/obsidian/menu.html:1`). Checkout modal → payment (dev-mock engine, PSP deferred) → tracking timeline (order sent→awaiting pickup) with toasts, 4-digit pickup code, receipt image download. Hosting deferred → `cloudflared/nginx` dev tunnel; compliance deferred; one main admin who creates staff.

### 3. Problem statement
Deliver zero-technical-debt, stable, reliable, multi-tenant backend for both portals with live order processing (customer places live, admin processes live, customer tracks live), plugin-able PSP boundary (dev mock now, real later without domain change), receipt + tracking UX derived from `receipt1.jpg`/`tracking2.jpg` but translated to obsidian, and dev-tunnel testability.

### 4. Decision drivers
- Business: single shop now, multi-tenant foundation for future stores; live flow must be reliable; receipt/tracking refs are inspiration not copy.
- Technical: Python+Django gives RBAC, migrations, admin, ORMs; Channels+Redis for WebSocket; Postgres for audit; Angular for typed SPA; hexagonal ports keep debt zero.
- People: small team, one owner + staff; ops via `cloudflared` for quick phone testing.
- Constraints: PSP deferred → mock isolated to dev profile; hosting/compliance deferred logged as Accepted Risks; `WCAG 2.2 AA` still law.

### 5. Considered options
| Option | Pros | Cons | Risk (tech/sched/org) |
|--------|------|------|------------------------|
| A: Django+DRF+Channels+PG+Redis+Angular (chosen) | Machine default web layer, RBAC/ORM/admin, hexagonal, easy mock isolation, multi-tenant RLS | Heavier than static | Low/Med/Low |
| B: Rust Axum + PG + Angular | Performance headroom | Over-engineering, hiring, slower to staff CRUD | Med/High/Med |
| C: Keep static + BroadcastChannel + localStorage | Fastest | No multi-tenant, no audit, no real cross-device live, tech debt | High/ Low/High |

### 6. Stakeholder impact
- Owner: creates staff via `POST /api/v1/admin/staff` (OWNER only), manages queue mobile-first.
- Staff: confirm transitions via admin queue.
- Customer: modal checkout → receipt → tracker with toasts + pickup code → download → back to menu.
- Training: admin guide for 5-step flow + pickup code handling.

### 7. Cost & resource implications
- Infra dev: `docker-compose.dev.yml` (`postgres:16`, `redis:7`, `web:8000`, `nginx:80`, `cloudflared` tunnel token via env). Prod `docker-compose.yml` ready for TLS swap. S3-compatible (MinIO dev, AWS prod) for receipts.
- PSP fees deferred; mock has zero cost. Reversal: swap adapter, no domain change.

### 8. Compliance & regulatory concerns
- Deferred: Ghana Data Protection + PCI via PSP only (no card store). Mitigation: audit `OrderEvent` from day 1, PII minimization (phone optional), secrets via env, `gitleaks` gate, reopen ticket for audit before prod launch. Enforcement: CI `N/A` logged, reopen review 2026-10-04.

### 9. Risk register
| Risk | L | I | Mitigation | Owner |
|------|---|---|-----------|-------|
| Cross-device live without real backend | H | H | Channels+Redis prod path now, not BroadcastChannel | Backend |
| Mock leaks to prod | H | H | `DEV_MOCK_PSP` flag + prod image excludes `adapters/psp/mock` + CI import guard | Backend |
| Pickup brute force | M | M | 4-digit + 3 attempts + 30m TTL + rate limit | Security |
| Receipt canvas OOM mobile | M | M | Server Pillow render fallback, 200KB cap | Frontend |
| Multi-tenant leak | M | H | `tenant_id` FK + RLS + `TenantAware` middleware tests | Backend |

## Part 2 · Technical concerns

### 10. Decision
Build production hexagonal platform: Django+DRF+Channels (WebSocket) + PG + Redis + Celery, Angular 21, multi-tenant `tenant_id` on every table, dev-mock PSP behind `PspPort` (dev-only), `cloudflared/nginx` dev tunnel, obsidian tokens migrated, receipt/tracking derived from `receipt1.jpg`/`tracking2.jpg` translated to obsidian.

Confidence: high.

### 11. Architecture pattern
Hexagonal: `core` (pure Python, no Django) → `adapters` (db, psp/mock, realtime, storage) → `api` (DRF v1) → `web` (Angular). `core` never imports framework. Ports allow PSP/hosting swap with zero debt.

### 12. Technology stack
- Backend: `Python 3.12`, `Django 5`, `DRF`, `Channels 4 + daphne`, `PostgreSQL 16`, `Redis 7`, `Celery`, `Pillow` (receipt PNG) + `qrcode`, `gunicorn` prod, `uv` for deps.
- Frontend: `Angular 21`, `TypeScript strict`, `SCSS` with own `boba-obsidian` contract (`boba-obsidian.css:1` → `styles/tokens/_contract.scss`), `Vitest` + `Playwright`, `cropperjs@1.6.2` (MIT) — admin image crop/edit before upload.
- **Dependency rationale — `cropperjs`:** required for admin crop-to-spec on product + banner-slide uploads (browser `object-fit: cover` cannot be admin-controlled without it). Choice of **1.6.2**: the classic stable API (`new Cropper(img, opts)` + `getCroppedCanvas`) with a decade of production use and zero open CVEs; **v2.x (2025 Web-Components rewrite) explicitly rejected** as less battle-tested. Client-side canvas crop → existing `UploadViewSet` re-encodes to WebP unchanged. Vetted 2026-09-05: MIT license, active use, no advisories; pinned exact version.
- Tooling: `uv`, `ruff`, `mypy --strict`, `gitleaks`, `Syft` SBOM, `cloudflared`, `nginx:alpine`, `docker-compose`.
- Deferrals: PSP provider not chosen, compliance audit deferred per §8.

### 13. Module / service boundaries
- `core/orders` — `Order`, `OrderItem`, `OrderStatus` enum `SENT→RECEIVED→PROCESSING→READY→AWAITING_PICKUP→COMPLETED`, `pickupCode` gen, totals. Owns state guards.
- `core/payments` — `PspPort {create_payment(tenant,order)->PaymentIntent, verify_webhook}`. `MockPsp` dev-only.
- `core/realtime` — `RealtimePort {publish, subscribe}`.
- `core/tenants` + `core/users` — `Tenant`, `User {role OWNER|STAFF}`, RBAC.
- `adapters/db` — Django models with `tenant_id` indexed FK, `OrderEvent` audit append.
- `adapters/psp/mock` — dev-only, behind `settings.PSP_ACTIVE=='mock'` and `DEV_MOCK_PSP=1`.
- `adapters/realtime` — Channels Redis.
- `adapters/storage` — S3 (MinIO dev) for receipt PNG.
- `api` — DRF v1 viewsets, `TenantAware` mixin, `IsOwnerOrStaff`.
- `web` — `features/menu` (obsidian `prototypes/obsidian/menu.html:1` migrated), `features/checkout` (modal), `features/tracking` (stepper), `features/admin-queue`.
- Each owns its UI/data; `core` never owns HTTP/ORM.

### 14. Data model principles
- `UUIDv7` PKs (time-ordered), `tenant_id UUID FK` on every table with `INDEX` + RLS policy.
- `Order {id, tenantId, status, items JSONB, subtotal, fees, total, currency='GHS', customerId?, pickupCode CHAR(4) nullable unique partial WHERE status=AWAITING_PICKUP, pickupExpiresAt, receiptS3Key, createdAt, updatedAt, completedAt}` no soft-delete (audit).
- `Payment {id, tenantId, orderId, psp, pspTxId unique, amount, state PENDING|SUCCESS|FAILED, createdAt}`.
- `OrderEvent {id, tenantId, orderId, from, to, actorId, at}` append-only.
- `User {id, tenantId, email, role, passkeyCredential, isActive}` 1 OWNER seeds, creates STAFF.
- Migrations additive-only, `CREATE INDEX CONCURRENTLY`, rollback docs.

### 15. API design
- Versioned `v1` from day 1, cursor pagination, envelope `{category,code,message,context,retryable,requestId}`.
- **Customer (anonymous, public):**
  - `GET /api/v1/tenants/{slug}/products/?active=1` → product list (public, no auth)
  - `GET /api/v1/tenants/{slug}/banners/?active=1` → active banners (public)
  - `POST /api/v1/tenants/{slug}/orders/ {items:[{sku,qty}]}` → `{order, payment:{id,psp,amount,currency,client_secret,psp_tx_id}}` — server calls PSP internally; creates `SENT`
  - `GET /api/v1/tenants/{slug}/orders/{oid}/` → order status + pickup code (public, tenant-isolated)
  - `POST /api/v1/tenants/{slug}/orders/{oid}/confirm_pickup/ {code}` → `{verified, order}` (public; only succeeds from `AWAITING_PICKUP` with matching code)
  - `GET /api/v1/tenants/{slug}/orders/{oid}/receipt/` → receipt PNG download (public; only when order has `receipt_s3_key`; cross-tenant 404)
  - `POST /api/v1/webhooks/psp/{psp}` — PSP callback (HMAC `X-PSP-Signature`; dev `mock-sig`; transitions `SENT→RECEIVED`)
- **Staff/Owner (session-authenticated):**
  - `POST /api/v1/auth/login/` / `POST /api/v1/auth/logout/` / `GET /api/v1/auth/me/`
  - `POST /api/v1/tenants/{slug}/orders/` → owner creates order on behalf (session auth)
  - `PATCH /api/v1/tenants/{slug}/orders/{id}/status/ {to}` → guarded transition (OWNER|STAFF)
  - `POST /api/v1/tenants/{slug}/admin/staff/` → owner only, staff invite
  - Catalog CRUD, banner CRUD, uploads, analytics (owner only)
- **Realtime (WebSocket):**
  - `ws/{hostname}/ws/tenants/{slug}/banners/` — banner push events (anon, tenant-scoped)
  - `ws/{hostname}/ws/tenants/{slug}/orders/{oid}/` — per-order status stream (anon, tenant-scoped)
- Customer-facing tenant identifier is `slug` (not UUID); `TenantInterceptor` auto-injects `X-Tenant-Slug` header.

### 16. Security model
- **AuthN:** Owner/staff: session-based login (`/auth/login/`), CSRF cookie on session POSTs; `HttpOnly; Secure; SameSite=Strict` cookies; never `localStorage` for secrets. Customer: fully anonymous — no login, no token; **order ID + 4-digit pickup code serve as the capability tokens** for track/confirm_pickup/receipt.
- **AuthZ:** `IsOwner` / `IsOwnerOrStaff` / `IsPublic` (customer endpoints); RBAC OWNER vs STAFF. Per-object `tenant_id==request.tenant.id` check enforced by `TenantAwareMiddleware` + cross-tenant queries return 404.
- **Tenant isolation:** `X-Tenant-Slug` header required on every request (auto-injected by `TenantInterceptor`); every data-access query scoped to `tenant_id`. Cross-tenant receipt download / track / confirm_pickup return 404, never leaking row existence.
- **Validation at boundary:** DRF serializers + domain-level rules; `MIN_ORDER_GHS=₵8` enforced server-side; `MAX_ITEM_QTY=99` per line item.
- **Secrets via `env`/`Vault`**, `gitleaks` pre-commit + CI, `eval`/`shell` banned.
- **Rate limit:** `throttling` on `payments`/`pickup_verify`/`webhooks`.
- **WebSocket:** anonymous connections accepted; groups scoped as `tenant_{uuid}.banners`, `tenant_{uuid}.orders`, `tenant_{uuid}.orders.{oid}` — foreign-tenant slug yields an empty group (no cross-tenant leak).

### 17. Error taxonomy
`VALIDATION|AUTHENTICATION|AUTHORIZATION|NOT_FOUND|EXTERNAL_DEPENDENCY|INTERNAL|RATE_LIMITED` with `{code,message,context,retryable,layer}`. Every external call (PSP/mock, PG, Redis, S3) has explicit handling, no bare `except`. Resolved at boundary (API maps domain errors to HTTP).

### 18. Logging & observability strategy
- Structured JSON logs (`requestId`, `tenantId`, `orderId`, `status`, no PII), `OpenTelemetry` traces `API→DB→PSP→WS`, `OTEL` collector.
- Metrics: `order_create_latency p95`, `payment_success_rate`, `ws_connections`, `pickup_verify_failures`; alerts `payment <99%` or `p95>500ms` 5m.
- Dashboards per `features`.

### 19. Testing strategy
- Unit ≥80% business logic: state machine error paths, totals, pickup TTL, RBAC.
- Integration real deps only: `PostgreSQL` (testcontainers), `Redis` Channels, `MinIO` S3 — no mocks at boundaries except `MockPsp` dev-only behind flag + contract test double in unit.
- Security: matrix `OWNER` vs `STAFF` vs anon, webhook HMAC replay, pickup brute-force.
- E2E Playwright: `menu → + → Checkout modal (details) → MockPay → receipt QR (from receipt1.jpg ref) → WS tracking 5 steps (from tracking2.jpg Timeline/In Progress) → pickup code → verify → download png → redirect /menu`, mobile `390/375/320` overflow audit (previous fix retained).

### 20. Build & delivery order
1. Foundation: error taxonomy + `Tenant`/`User` + token contract (`semantic.css` → SCSS) → tested.
2. `orders` state machine + `OrderEvent` audit + PG migrations.
3. `payments` `PspPort` + `MockPsp` dev-only (behind flag) + contract tests.
4. `realtime` Channels + `WS`.
5. `menu` Angular migration (obsidian, `₵`, 80px thumbs, 86% faded `menu-bg:115` `opacity:0.58`).
6. `checkout` modal (payment details → MockPsp → receipt from `receipt1.jpg` ref, QR `qrcode`, S3).
7. `tracking` page (stepper from `tracking2.jpg` translated to obsidian border-rule + mono) + toasts.
8. `admin-queue` mobile-first + `OWNER` staff invite.
9. Pickup code `4-digit` + TTL + `verify` + `completed` → receipt download → redirect.
10. `cloudflared/nginx` dev tunnel + CI gates (lint/type/audit/unit/integration/e2e/SBOM) → `v0.1.0-dev` tag.

## Part 3 · Review concerns

### 21. Consequences
Positive: zero-debt hexagonal, multi-tenant from day 1, PSP swap with one adapter, live reliable, obsidian consistent. Trade-offs: Django heavier than static but justified; mock isolated so prod image has no debt; compliance/hosting deferred are explicit risks.

### 22. Validation & review
- Gates: lint (`ruff`/`eslint`), type (`mypy --strict`/`tsc`), secrets (`gitleaks`), unit `≥80%`, integration real PG/Redis, Playwright at `320/375/390`, axe `WCAG AA`.
- Success: `POST /orders` → `SENT` → `PATCH status RECEIVED` emits WS, customer sees toast, `READY` → code visible both, `verify` → `COMPLETED` → receipt download `200` and redirect.
- Failure signals: `MockPsp` appears in prod image (CI import guard fails), `tenant_id` leak (integration fails), `ws` lag >1s.

### 23. References
- Machine: `/home/work/Claude files/CLAUDE.md`, `/home/work/Claude files/design-language-protocol.md` (18 slots)
- Tokens: `software-rdk/src/styles/tokens/_contract.scss` (inspiration, not copy)
- Refs: `assets/receipt1.jpg` (ticket QR/Platform:3), `assets/tracking2.jpg` (Timeline/In Progress dashed stepper), `prototypes/obsidian/menu.html:1`

---
## Accepted Risks Register
| Date | Standard overridden | Overriding party | Rationale | Compensating control |
|------|--------------------|------------------|-----------|---------------------|
| 2026-09-04 | PROD-FLAG[STACK-OVERRIDE] static | Lead | Visual speed | Migrated to Angular, contract preserved |
| 2026-09-04 | PROD-FLAG[NO-TESTS] phase 1 | Lead | Visual only | Gates in production |
| 2026-09-04 | PROD-FLAG[MOCK-AT-BOUNDARY] `MockPsp` dev-only | Lead | PSP deferred | `DEV_MOCK_PSP=1` + prod exclude + contract tests |
| 2026-09-04 | PROD-FLAG[ADR-OVERRIDE] compliance deferred | Lead | Early stage | Audit log day 1, reopen 2026-10-04 |
| 2026-09-04 | PROD-FLAG[ADR-OVERRIDE] hosting deferred | Lead | Dev tunnel sufficient | `cloudflared/nginx` dev, prod compose ready |
