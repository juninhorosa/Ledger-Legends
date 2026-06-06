# Chronicles of TON — Product Requirements

## Original Problem Statement
TON-based economy for the Chronicles of TON RPG (FastAPI + React + MongoDB).

**Configuration (production):**
- Network: TON Mainnet
- Treasury wallet: `UQCO5ujJsobYdfFjQQ9DGFZThUFXty21_14HkDnPHOMgM79P`
- Telegram bot token: stored in `/app/backend/.env`
- Admin Telegram ID (withdrawals + admin panel): `6170049742`
- User-facing language: Portuguese (pt-BR) + English (en)

**Rules:**
- Deposits: open for any amount; credited automatically via on-chain poller.
- Withdrawals: every withdrawal must be manually approved by Admin (Phase 4).
- Packs:
  - Starter Pack — 5 TON, one-time, gives +5,000 gold + 1 rare item (`rune_blade`) + 24h XP boost.
  - XP Pack — 1.5 TON, 2× XP for 7 days. Re-buying extends the timer.
- VIP — 30 levels, must be bought sequentially. Cumulative benefits: +XP, +Gold drop, +Damage, +Inventory slots, lower market tax (20% → 10% → 8% @ Lv20 → 5% @ Lv30), badge tier (bronze/silver/gold).
- Market taxes: 20% if no VIP, 10% if VIP ≥ 1 (Phase 3 — not yet wired into market endpoints).

## Architecture
- Backend: FastAPI + Motor (MongoDB). Background `_ton_poller_loop` polls TonCenter `getTransactions` every 30s, matches `dep_XXXX` comments, credits `ton_balance`, expires pending deposits older than 1h.
- Frontend: React 19 + Tailwind + TonConnect UI + zustand store. Webpack polyfills `Buffer` for `@ton/core`.
- Mongo DB: `chronicles_of_ton` — collections: `players`, `deposits`, `pack_purchases`, `vip_purchases`, `purchases`.

## What's Implemented (as of Jun 6, 2026)
### Phase 1 — Deposits ✅
- POST `/api/deposit/init` — generates unique `dep_XXXX` comment, returns BoC payload params. Expiry aligned to 3600s.
- GET `/api/deposit/status/{id}` — returns deposit doc (pending/confirmed/expired).
- GET `/api/deposits/{wallet}` — paginated history.
- GET `/api/balance/{wallet}` — `ton_balance`, `vip_level`, `gold`, `xp_pack_active`, `start_pack_purchased`, `vip_benefits`.
- Background poller credits `ton_balance` once on-chain tx with matching `comment` is detected (≥ amount – 1k nano tolerance).
- Frontend: `WalletPanel` shows in-game balance + Deposit button; `DepositDialog` builds BoC payload via `@ton/core`, polls status every 10s.

### Phase 2 — Packs & VIP ✅
- GET `/api/pack/catalog`, POST `/api/pack/buy` (start/xp).
- GET `/api/vip/catalog`, POST `/api/vip/buy` (cumulative).
- **Atomic conditional updates** prevent race-double-debit.
- Audit logs to `pack_purchases` and `vip_purchases`.
- Frontend: `EconomyShop.jsx` (Packs + VIP tabs) integrated into `GamePanel` as a new tab.

### Tests
- `/app/backend/tests/test_ton_economy_phase12.py` — 20 tests, all passing (iteration_4.json).

## Backlog
### P0 — Next
- **Phase 3 — Market Taxes**: apply 10%/20% tax in market sell endpoint (needs review of existing market routes).
- **Phase 4 — Withdrawals**: `POST /api/withdraw/request`, admin approve/reject endpoints (Telegram ID gate).
- **Phase 4.1 — Hidden Admin Panel**: React route revealed only for Telegram ID 6170049742 to list & action pending withdrawals.

### P1
- Refactor `start_pack_purchased` to per-pack `purchased_packs: List[str]` to support future one-time packs.
- Add Mongo indexes: `pack_purchases (wallet, created_at)`, `vip_purchases (wallet, created_at)`, `deposits (wallet, created_at)`, `deposits (comment)`.
- Require Telegram `initData` (or session token) on pack/vip/withdraw endpoints for spoofing protection.
- VIP row layout polish (cramped on ≤1280px).

### P2
- Localized number formatting (pt-BR uses `.` for thousands, `,` for decimals).
- Pack/VIP purchase notifications via Telegram already wired but best-effort; harden retry.
- Surface XP pack/VIP buffs in combat formulas (current store ignores `xp_pack_active` & `vip_benefits.xp_gain_bonus_pct`).

## Files of Reference
- `/app/backend/server.py` — all endpoints + poller.
- `/app/frontend/src/components/game/EconomyShop.jsx` — Phase 2 UI.
- `/app/frontend/src/components/wallet/DepositDialog.jsx` — Phase 1 UI.
- `/app/frontend/src/lib/api.js`, `ton.js`.
- `/app/memory/test_credentials.md` — testing notes.
