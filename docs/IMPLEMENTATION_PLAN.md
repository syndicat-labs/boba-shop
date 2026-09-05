# Implementation Plan — next phases

> Companion to `docs/PROGRESS.md`. Ordered by dependency (each phase builds on the previous). The customer menu (Phase 1) unblocks the rest of the ordering flow.

## Phase 1 — Customer menu (Angular) + order creation

> ✅ **Complete** — 2026-09-05 (see `docs/PROGRESS.md` "Phase 1 delivered"). The static prototype customer experience is now a live Angular app wired to the backend, verified end-to-end against the running server.

- [x] `frontend` customer routes (`/menu`): menu list (reads `GET /products?active=1`), cart builder, image banner carousel (CTA-free since 2026-09-05).
- [x] Backend `POST /tenants/{tid}/orders` — create an order in `SENT` from cart items; validate `MIN_ORDER_GHS` (₵8) + `pricing.domain` line totals; emit `OrderEvent` + publish to `tenant_{tid}.orders`.
- [x] Checkout modal → `PspPort.create_payment` (MockPsp in dev) → payment webhook → `RECEIVED`.
- [x] Tracking page (5-step stepper) subscribing to `ws/tenants/{tid}/orders/{id}`; pickup-code entry for the customer.
- [x] Split the SPA shell so `/` serves the customer app and `/admin` the owner portal (route guard already exists).

## Phase 2 — Auth upgrade (OAuth2.1 + Passkeys)

> Ordered ahead of payments: real money cannot run on the current CSRF-exempt session bridge (`PROD-FLAG[NO-API-VERSION]` on login). Auth is the gate for Phases 3–4.

- [ ] WebAuthn passkeys for OWNER/STAFF login (replaces session bridge); JWT refresh in `HttpOnly; Secure; SameSite=Strict` cookies.
- [ ] Remove `@method_decorator(csrf_exempt)` on auth (retired `PROD-FLAG`).
- [ ] CSRF via the existing `CsrfInterceptor` transition; then OAuth2.1 (PKCE) for the SPA.
- [ ] Security-adversarial tests: passkey replay, cookie theft/CSRF, cross-tenant session.

## Phase 3 — Real payments (provider deferred)

> PSP choice (Paystack vs Flutterwave for GHS) deferred to live decision; plan is adapter-shaped so either drops in behind `PSP_ACTIVE`.

- [ ] Implement a real `PspPort` adapter (Paystack or Flutterwave for GHS) behind `PSP_ACTIVE`; both vendors evaluated for banking/mobile-money coverage before deciding.
- [ ] HMAC webhook verification + idempotent `Payment` state (`PENDING→SUCCESS/FAILED`), webhook replay protection.
- [ ] Payment-determined order completion; failure → explicit `PAYMENT_FAILED` state with safe retry; no money moves until Phases 2+3 audits pass.

## Phase 4 — Receipt storage (S3/MinIO)

- [ ] `adapters/storage` S3 client (boto3) + presigned URLs; upload receipt PNGs to MinIO (dev) / S3 (prod); 24h signed `GET /receipt → 302`.
- [ ] Reuse for product image uploads (move `/media` off the local Docker volume to MinIO).

## Phase 5 — Live queue + realtime hardening

- [ ] Frontend `OrdersService` subscribing to `ws/tenants/{tid}/orders` (replace 10s polling in the queue page).
- [ ] WS auth on `connect` (reject anonymous/foreign tenant), presence + reconnect.

## Phase 6 — Scheduling + lifecycle jobs (Celery)

- [ ] Celery app + beat: expire pickup codes after 30m, auto-cancel stale orders.
- [ ] Batch slots (`BatchSlot`) surfaced in the admin portal; product availability windows.

## Phase 7 — Inventory + pricing modifiers

- [ ] `Stock`/`StockMovement` per SKU; decrement on order, low-stock alerts.
- [ ] Size/sugar/ice modifiers and toppings as first-class `pricing` rules (currently only `oat +₵0.80`).

## Phase 8 — Observability + E2E + CI hardening

- [ ] OpenTelemetry traces (API→DB→PSP→WS), metrics (`order_create_latency p95`, `payment_success_rate`, `ws_connections`), alert thresholds.
- [ ] Playwright E2E (menu → cart → checkout → tracking → pickup → receipt) at 320/375/390 + axe WCAG AA; replace the CI `playwright pending` stub.
- [ ] Integration tests against real Postgres/Redis/MinIO (already in CI services); tenant-leak adversarial tests.

## Phase 9 — Production cutover

- [x] Release pipeline: `.github/workflows/release.yml` (test gate + frontend artifact + ghcr image + GitHub release) and **v0.1.0** released.
- [ ] Real PSP + S3 + passkeys in place; `TRUST_PROXY=1` behind Cloudflare named tunnel; `deploy/prod.sh` end-to-end.
- [ ] Data migration for existing tenants; backup/restore runbook; rollback plan for every migration (ADR §19).

## Ordering note

Phases 1–4 are the critical path to a real money-capable, customer-usable product (auth first, then payments, then durable receipt storage). Phases 5–9 are hardening/scale. Each phase is independently deployable behind the existing versioned `v1` API (no breaking changes without a deprecation window).
