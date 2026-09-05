# Progress Status — boba-shop

> Last updated: 2026-09-05 · Branch: `main` · Status: **Phase 1 delivered** (customer ordering flow live; V1 stack stopped after session; restart with `./deploy/local.sh`)

## Overview

Multi-tenant boba-shop platform. Backend: Django 5 + DRF + Channels (daphne) + Postgres 16 + Redis 7 + MinIO, hexagonal layout. Frontend: Angular 17 (obsidian design language, mobile-first 390px). The **owner/admin portal** is functional and the **full customer ordering flow is now live** — menu → cart → checkout (mock PSP) → receipt → tracking → pickup-code confirm. **v0.1.0** is released; Phase 1 of `docs/IMPLEMENTATION_PLAN.md` is complete.

## Release

- **v0.1.0** published (tag + GitHub release): https://github.com/syndicat-labs/boba-shop/releases/tag/v0.1.0
- Release workflow `.github/workflows/release.yml` — on `v*` tags: test gate (pytest ≥80%), frontend build artifact (`frontend-dist.tar.gz`), backend Docker image → `ghcr.io/syndicat-labs/boba-shop`, GitHub release with generated notes.
- Branch tree on remote: `main`, `release/v0.1.0`, `feature/production-foundation` (all in sync), plus tag `v0.1.0`.
- PRs #1–#5 merged with merge commits (no squash): release→main, feature→main, main→release, and CI-fix propagation.

## CI

- `.github/workflows/ci.yml` — `lint-type-audit` (ruff + mypy + gitleaks), `test` (pytest + Postgres/Redis), `frontend` (ng build), `prod-guard` (mock isolation).
- gitleaks-action v2 now requires `GITHUB_TOKEN` (passes for PR scans) and `fetch-depth: 0` — both wired in.
- **Dev-tunnel CSRF fix (2026-09-05)** — admin sessions over the Cloudflare tunnel got `403 Origin checking failed` on every POST (advance/verify buttons "did nothing"). Cause: cloudflared terminates TLS but `nginx.dev.conf` did not forward `X-Forwarded-Proto`, and `dev.py` did not trust it, so Django's DRF session-CSRF origin check compared the browser's `https://…` Origin against an `http://…` expected origin. Fixed by forwarding `X-Forwarded-Proto` in `nginx.dev.conf` (`/api/` + `/ws/`) and setting `SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")` in `config/settings/dev.py` (prod path unchanged — `nginx.prod.conf`/`prod.py` already handle it behind `TRUST_PROXY=1`). Anonymous customer flow was unaffected (DRF exempts it).
- **Banner carousel (2026-09-05)** — live video watcher muted and replaced by an admin-uploaded image carousel. `Banner.media_url` changed `URLField → CharField(512)` (migration `banners.0003`) so it accepts `/media/<slug>/<hex>.webp` upload URLs; admin Banners page got `boba-upload-card` image upload + image-only preview; customer banner is now a rotating image carousel from active banners; banner WS stream (`BannerConsumer`, route, `group_send`) removed. Gates: ruff/mypy clean, 80 passed @ 88%, `ng build` green; full loop verified live over the tunnel (upload 201 → create 201 → public list shows `media_url` → delete 204).
- **Upload 413 fix (2026-09-05)** — real phone photos (>1 MB) failed with "image upload failed" while tiny fixtures passed. Cause: nginx has no `client_max_body_size`, so its implicit 1 MB cap rejected ~2.5 MB uploads with `413` before Django's app-level 5 MB check (`UPLOAD_TOO_LARGE`) could run; the frontend's catch surfaced only the generic message. Fix: `client_max_body_size 6m` on `/api/` in both `nginx.dev.conf` and `nginx.prod.conf`; nginx reloaded. Verified over the tunnel: 2.9 MB upload → 201, 5.7 MB upload → `400 UPLOAD_TOO_LARGE` envelope.
- **Single-banner carousel container (2026-09-05)** — structural redesign: one `Banner` per tenant is now a *container* (no content columns), content lives in a many-to-many `BannerSlide` (image_url, kicker, title, announcement 280, position, is_active) so a carousel is "not limited to only one [promo]" while the admin maintains a single carousel. Migration `banners.0004` (`atomic = False` — Postgres "pending trigger events" otherwise blocks `ALTER` after `RunPython`) drops 7 content columns + `uniq_tenant_sort_active`, folds existing rows into slides (seed + 2 uploaded images preserved), deletes old container rows. API: `BANNER_EXISTS` 400 guard on second create; PATCH replaces the slide set wholesale; list returns all slides (customer filters `is_active`). Admin Banners page → single slide editor (`boba-upload-card` per slide, announcement textarea, add/remove, Save carousel → PATCH); customer carousel renders `slides[0].slides` incl announcement (2-line clamp) with the existing auto-swipe/arrows/dots/fallback. Gates: ruff/mypy clean, 81 passed @ 87% (rewritten banner tests), `ng build` green; verified live over the tunnel (public list 200 + 3 slides → PATCH replaces slides + announcement 200 → second POST → `400 BANNER_EXISTS` → restored original 3-slide state).
- **Admin crop/edit-to-spec (2026-09-05)** — every image upload (`boba-upload-card`) now opens a Cropper.js editor before emitting: image must be confirmed to the required ratio. Specs per surface: banner slides 16:9 (max 1280), product hero 16:9 (max 1600), card thumbnail 1:1 (max 800). UI: modal overlay (drag to position, scroll/pinch to zoom, Escape to cancel, "Crop & use" exports WebP @0.85 via canvas → existing `UploadViewSet` re-encodes unchanged). Dependency `cropperjs@1.6.2` (MIT, pinned; classic stable API; the 2025 v2 Web-Components rewrite explicitly rejected as unproven) — see ADR §12; `allowedCommonJsDependencies` in `angular.json`. Gates: `ng build` green (no new budget warnings; CJS bailout silenced), bundle verified (cropper chunk + crop overlay + cropper.min.css emitted, wrong-ratio uploads no longer possible). Backend unchanged.
- **Upload size cap raised 5 MB → 10 MB (2026-09-05)** — phone photos (~5–6 MB) hit the backend's hard 5 MB app cap (`400 UPLOAD_TOO_LARGE` at 5.9 MB; >6 MB additionally 413'd at nginx's 6m). Raised `views_uploads.MAX_SIZE` → 10 MB (message "max 10MB") and `client_max_body_size 12m` in `nginx.dev.conf` + `nginx.prod.conf` (multipart overhead headroom); card label now "up to 10 MB". Placement gotcha: after only `nginx -s reload`, the ~6 m bind-mounted config stayed stale (the container still served `6m` at 8 MB) — nginx had to be **recreated** (`up --force-recreate nginx`) to remount the file. Vendor JPEG `UploadViewSet.re-encode` is CPU-bound — a 2000px 9.8 MB JPEG takes >3 min to convert (client-side crop export caps ⩽1600 px, so production uploads are far smaller). Added boundary test `test_upload_rejects_over_10mb`. Gates: ruff/mypy clean, 82 passed @ 87.37%; live re-verified over the tunnel (5.8 MB → 201, 8 MB → 201); pre-existing banner images intact; only this session's 7 test webp orphans cleaned.
- **Carousel CTA removed (2026-09-05)** — banner slides are informational only (image, kicker, title, announcement; no button). First removed the `sku` CTA type (migration `banners.0005` + data fix `banners.0006`, serializer `ChoiceField url|anchor`, admin/`customer.service`/`banner.component` union narrowed, API rejects `sku`), then — per owner decision — the entire CTA field set: `cta_label`/`cta_type`/`cta_value` dropped from `BannerSlide` (migration `banners.0007`, column data dropped), serializer fields removed, seed simplified, admin Banners form CTA inputs removed, customer carousel `onCta`/`.banner-cta` button removed. Live gotcha: a stale admin tab re-saved `sku` slides after `0005` (batch-created 13:35) — normalized again via `0006`; a stale-tab save can no longer sneak past the new serializer/UI. Gates: ruff/mypy clean, 82 passed @ 87.46%, `ng build` green; verified live (API slide keys = `announcement/id/image_url/is_active/kicker/position/title`, 6 slides intact).

## Phase 1 delivered (customer ordering flow)

- **Customer routes** — `/menu/:slug`, `/tracking/:slug/:oid` added to `app.routes.ts`; `/` and `/**` now redirect to `/menu/boba-obsidian` (admin routes unchanged).
- **`customer.service.ts`** — bootstrap (`slug` → tenant UUID for WS), `listProducts`/`listBanners` (`?active=1`), `createOrder`, `track`, `confirmPickup`, `receiptUrl`, `fireMockWebhook` (dev), `assetUrl`.
- **`cart.service.ts`** — signal cart + favorites (`localStorage boba:favorites`), `MIN_ORDER_GHS=8`, `MAX_ITEM_QTY=99`.
- **`menu.page.ts`** — sticky header with live cart price + Checkout CTA, `<boba-banner>`, badge derivation from description keywords (Signature/Oat), featured = `brown-sugar`, favorites filter, bottom nav, last-order tracking link.
- **`checkout.modal.ts`** — pay phase → `createOrder` → mock latency → `fireMockWebhook` → receipt phase (download `/receipt`); min-order lock; retry webhook only on failure.
- **`tracking.page.ts`** — 5-step timeline from `created_at`/`completed_at`, WS per-order stream + 3s poll fallback, pickup-code entry → `confirm_pickup`, receipt download, completed box.
- **`banner.component.ts`** — image carousel (2026-09-05, slides from 2026-09-05 redesign): slides = active slides of the single tenant banner (array), image = `assetUrl(image_url)` falling back to `brownsugar.jpeg`; announcement shown under title (2-line clamp); auto-rotate 5 s (paused on hover / `prefers-reduced-motion`), arrows + dots. Informational only since 2026-09-05 (CTA removed). Live video watcher muted: no video element, no LIVE badge, no WS banner stream.
- **`live.service.ts`** — kept only `orderStream(uuid, oid)` for tracking; banner WS/subscription machinery removed (backend `BannerConsumer` + `/ws/tenants/<tid>/banners` route + admin `group_send` also removed).
- **Toast UI** — `toast.service.ts` + `toast-stack.component.ts` (`boba-toasts`).
- **Menu QR** — admin QR URL now points at the live customer menu (`/#/menu/<slug>`).
- **Assets** — `assets/boba/*` (products, video, logo, receipts) bundled under `frontend/src/assets/boba/` → `/assets/boba/…`.
- **Tokens** — added `--boba-color-danger`, `--boba-color-border-inverse*`, `--boba-shadow-overlay`, `--boba-media-fade*` to `tokens/semantic.css` + `boba-obsidian` answers; components consume `--boba-*` only.
- **Shared CSS** — `features/customer/customer.shared.css` (`.page`, `.btn*`, `.badge*`, `.state-note*`) imported by menu/tracking/checkout to keep each component under the 8 kB build budget.
- **Anonymous receipt** — `_CUSTOMER_ACTIONS` includes `"receipt"` (`views_orders.py`); anonymous download works cross-tenant-isolated.

### What is done

### Backend (`backend/`)
- **Foundation** — `manage.py`, `Dockerfile`, app packages + migrations for `tenants/users/orders/banners/catalog/payments/scheduling`, `INSTALLED_APPS`, `.env.example`/`.env.prod.example`, exception envelope handler (`{category,code,message,context,retryable,requestId}`), `TenantAwareMiddleware`, `TenantBackend` (tenant-scoped email auth).
- **Error taxonomy** — 7 categories (`VALIDATION/AUTHENTICATION/AUTHORIZATION/NOT_FOUND/EXTERNAL_DEPENDENCY/INTERNAL/RATE_LIMITED`) mapped to HTTP via `api/exceptions.py`.
- **Catalog + pricing** — `Product` CRUD (OWNER), `card_image_key` (inline thumbnail), positive-price validation, `+₵0.80` oat modifier domain, soft-delete, `ProductEvent` audit.
- **Orders** — state machine `SENT→RECEIVED→PROCESSING→READY→AWAITING_PICKUP→COMPLETED`, 4-digit pickup code (30m TTL), `PATCH /orders/{id}/status`, throttled `pickup_verify`, `receipt` (Pillow+qrcode PNG).
- **Payments** — `Payment` model + `PspPort` (MockPsp dev-only, prod-guarded).
- **Banners** — one container per tenant + `BannerSlide` set (2026-09-05 redesign), nested-slide CRUD, one-per-tenant `400 BANNER_EXISTS` guard, `BannerEvent` audit on activation change.
- **Staff/RBAC** — `IsOwner`/`IsOwnerOrStaff`/zero-trust `TenantMixin` (cross-tenant access → 403), `POST /staff/invite`.
- **Analytics** — revenue/orders/top-SKUs aggregation (owner).
- **Uploads** — `POST /uploads/image` (owner), validates + re-encodes to **WebP**.
- **Menu QR** — `GET /menu/qr/?url=…` renders QR PNG.
- **Auth** — session login/logout/me (`/auth/*`), `me` returns 200 `{authenticated:false}` when anonymous.
- **Seed** — `seed_demo` (tenant + owner + 6 SKUs + banner + 3 demo orders), idempotent.

### Frontend (`frontend/`, Angular 17)
- Full scaffold (`angular.json`, `tsconfig`, tokens imported via `styles.css`, obsidian `data-theme`).
- Auth service (session, signal-based), `TenantInterceptor` (`X-Tenant-Slug`), `CsrfInterceptor`, `authGuard`.
- Admin shell + 6 pages: **Queue** (live stepper + merged pickup verification), **Catalog** (customer-style menu rows with faded bg image + add/edit modals + upload cards + auto SKU), **Banners** (single carousel editor: per-slide image/kicker/title/announcement + live toggle + add/remove → PATCH), **Menu QR**, **Staff**, **Analytics**.
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
| `mypy backend --ignore-missing-imports` | ✅ clean |
| `pytest --cov=core --cov-fail-under=80` | ✅ **82 passed, 87.46% coverage** |
| `ng build` | ✅ clean (each component within 8 kB CSS budget) |
| GitHub Actions `ci` (all 4 jobs) | ✅ green on `main`/`release`/`feature` + PR events |
| GitHub Actions `release` (v0.1.0) | ✅ green (test + frontend + image + release) |
| Live smoke (curl) | ✅ bootstrap, products, banners, create order → webhook → RECEIVED, staff transitions → AWAITING_PICKUP, pickup-code confirm → COMPLETED, receipt PNG, negative-path envelope |

## Known gaps (→ see `docs/IMPLEMENTATION_PLAN.md`)

- **Session auth** — OAuth2.1 + Passkeys not implemented (CSRF-exempt login is `PROD-FLAG`ged); pickup code is the customer capability token (Phase 2 — planned first).
- **No real payments** — `MockPsp` only (`PSP_ACTIVE`); no HMAC idempotent `Payment` webhook; provider deferred (Phase 3).
- **Receipts** — generated in-memory/FS, not S3/MinIO (Phase 4).
- **Queue live updates** — admin queue still polls; customer tracking uses WS per-order stream (Phase 5).
- **Observability** — structured logging configured, no OTEL/metrics/alerting (Phase 8).
- **Celery beat** — no pickup-code expiry job (installed but unused); codes never auto-expire yet (Phase 6).
