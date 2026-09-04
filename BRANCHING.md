# BRANCHING.md — boba-shop

## Branch Tree
- `main` — protected, PR-only, tag-triggered deploys
- `feature/*` — feature work (`feature/prototype-menus`, `feature/admin-portal`, `feature/customer-portal`)
- `fix/*` — bug fixes
- `release/vX.Y` — late-cut, frozen, cherry-pick-only

## Current Base
Pre-main phase: `main` is base. `feature/prototype-menus` branches from `main`.

## Conventions
- Branch naming: `feature/<scope>-<slug>` (e.g. `feature/prototype-menus`)
- Commit scope derived from path: `prototypes/*` → `feat(prototypes)`, `tokens/*` → `feat(tokens)`
- No direct pushes to `main` — PR required
- Rebase before PR if >10 commits behind base
