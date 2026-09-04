# Boba Shop — Mobile Prototypes

Three distinct visual prototypes for a boba shop mobile website. Each prototype contains:
1. **Admin portal** (mobile-first) — manage shop + live orders
2. **Customer portal** (fully mobile) — menu, cart, payment, delivery optional, live order tracking

## Phase 1 — Visual Prototyping (current)
Purely visual. No backend. Three `menu.html` files for confirmation:
- `prototypes/obsidian/menu.html` — `boba-obsidian` (restraint, monochrome, border)
- `prototypes/mochi/menu.html` — `boba-mochi` (kawaii pastel pop, bubble)
- `prototypes/terroir/menu.html` — `boba-terroir` (artisanal earth, editorial)

Each is standalone static HTML + CSS, mobile viewport 390×844, semantic tokens only.

## Phase 2 — Live Ordering (next)
Dual portals + live sync (BroadcastChannel / SSE + in-memory store), cart builder (sugar/ice/size/toppings), payment mock, order-timeline.

## Tokens
- `tokens/semantic.css` — shared contract (role-named tokens)
- `tokens/themes/boba-*.css` — private primitives mapped to contract

## Design Languages
All answer 18 protocol slots + philosophy schema. See `ArchitectureDecisionRecord.md`.

## Running Prototypes
Open any `prototypes/*/menu.html` directly in a browser. No build step.

## Tech Defaults
- Phase 1: static HTML/CSS (flagged PROD-FLAG[STACK-OVERRIDE])
- Phase 2: Angular 21 (machine default), lightweight realtime
