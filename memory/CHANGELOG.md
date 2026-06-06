# CHANGELOG — Chronicles of TON

## 2026-06-06

### Phase 1+2 backend & UI — TON Economy
- POST `/api/deposit/init`, `/api/deposit/status/{id}`, `/api/deposits/{wallet}`, `/api/balance/{wallet}` + TonCenter mainnet poller.
- POST `/api/pack/buy` (Starter 5 TON one-time / XP 1.5 TON × 7 days extendable) with atomic conditional debit + audit logs in `pack_purchases`.
- POST `/api/vip/buy` (Lv1..30 cumulative pricing & benefits) with atomic conditional debit + audit logs in `vip_purchases`.
- Frontend: `EconomyShop.jsx` + bilingual (pt-BR/en) copy + `DepositDialog` wired into `WalletPanel`.
- Fixed pre-existing bugs: `useGameStore` → `useGame`, `savePlayer` URL, `@ton/core` peer + Buffer polyfill (craco webpack ProvidePlugin).
- 20/20 backend tests passing (`test_ton_economy_phase12.py`).

### Pixel-art forest arena
- New `ForestMap.jsx` SVG/CSS forest tilemap (trees, rocks, bushes, mushrooms, flowers) — Pixlands-inspired.
- Bigger arena (520px min height; CombatScreen 720px).
- `data-testid="kill-counter"` (X/Y kills) added to top-right of arena.
- `image-rendering: pixelated` applied to hero & monster sprites.
- Dungeons (caves/desert/volcano) intentionally deferred per user — wave arena stays forest-only.
