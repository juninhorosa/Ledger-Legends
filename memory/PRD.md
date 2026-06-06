# Chronicles of TON — Product Requirements

## Original Problem Statement
TON-based economy & gameplay for Chronicles of TON (FastAPI + React + MongoDB) inside Telegram Mini App.

**Configuration:**
- Network: TON Mainnet
- Treasury: `UQCO5ujJsobYdfFjQQ9DGFZThUFXty21_14HkDnPHOMgM79P`
- Admin Telegram IDs: `6170049742`
- Language: Portuguese (pt-BR) + English (en)

**Rules:**
- Deposits open for any amount, credited automatically by mainnet poller.
- Withdrawals must be manually approved by Admin.
- Packs: Starter (5 TON, one-time, +5k gold + rare item + 24h XP) & XP (1.5 TON, 2× XP / 7d, stackable).
- VIP 1–30 cumulative, with benefits: +XP, +Gold, +DMG, +Slots, market-tax 20%→10%→8%@20→5%@30.
- Market: server-authoritative item sell prices; tax curve = vip_benefits(level).market_tax_pct.
- Combat: top-down 2D pixel-art arena, WASD/mouse movement, auto-attack in range, waves with kill counter.

## Architecture
- Backend: FastAPI + Motor + asyncio TonCenter poller.
- Frontend: React 19 + Tailwind + TonConnect + zustand + framer-motion. Webpack polyfills `Buffer` for `@ton/core`.
- Mongo `chronicles_of_ton` collections: players, deposits, pack_purchases, vip_purchases, withdrawals, market_sales, purchases.

## Implemented (Feb 2026)

### Phase 1 — Deposits ✅
- `/api/deposit/init`, `/api/deposit/status/{id}`, `/api/deposits/{wallet}`, `/api/balance/{wallet}` + mainnet poller.

### Phase 2 — Packs & VIP ✅
- `/api/pack/catalog|buy`, `/api/vip/catalog|buy` with atomic conditional debits + audit logs.

### Phase 3 — Market Taxes ✅
- `POST /api/market/sell` removes item from inventory and credits gold using SERVER-SIDE `ITEM_SELL_VALUES` (anti gold-mint). Tax pct from `vip_benefits(level)`.

### Phase 4 — Withdrawals + Admin ✅
- `POST /api/withdraw/request` atomically debits ton_balance and stores pending row.
- `GET /api/withdrawals/{wallet}` history.
- `GET /api/admin/check/{id}` introspection.
- `GET /api/admin/withdrawals?admin_id&status` list (admin gated).
- `POST /api/admin/withdrawals/{wid}/approve|reject` with `_resolve_admin_id(body)` — prefers signed Telegram `init_data`, falls back to `admin_id` for dev. Reject flips status atomically BEFORE refund (no double-refund race).
- Hidden `AdminPanel` tab in `GamePanel` shown only when `/api/admin/check/{tgId}` returns true.

### Visual / UX ✅
- `BattleArena` = pixel-art top-down forest map (`ForestMap.jsx` — grass + trees + bushes + rocks + mushrooms + flowers).
- 2D SVG hero (`PixelHero`) with walk frames + facing direction + idle/attack/cast/victory states.
- 2D SVG monster sprites (`MonsterSprite`) per type: wolf, goblin, skeleton, orc, wraith, troll, lich, dragon.
- Kill counter (X/Y kills) in arena top-right (Pixlands-style).
- VIP/XP-pack buffs surfaced in combat: `gameStore.computeDerived` applies `damage_bonus_pct`, `gold_drop_bonus_pct`, `xp_gain_bonus_pct` and 2× XP pack multiplier. `EconomyShop` calls `setEconomyBuffs()` on every balance refresh.

### Tests
- `/app/backend/tests/test_ton_economy_phase12.py` — 20/20 passing.
- `/app/backend/tests/test_ton_economy_phase34.py` — 21/21 passing.

## Backlog
### P0
- Require Telegram `initData` on `/api/withdraw/request`, `/api/market/sell`, `/api/withdrawals/{wallet}` (anti wallet-spoof). Mirror the `_resolve_admin_id` pattern with a generic `_resolve_user_id(body, allow_legacy_wallet=False)` helper.
- Validate `to_address` checksum on withdrawals (avoid lost funds on typos).
- Dungeons: separate biomes (cave/desert/volcano) as new routes/maps.

### P1
- Per-pack `purchased_packs: List[str]` instead of single `start_pack_purchased` flag.
- Mongo indexes: pack_purchases/vip_purchases/withdrawals/market_sales on (wallet, created_at), deposits on (comment) unique.
- Expose `window.useGame` in dev for E2E testability of admin/withdraw flows.
- Frontend: send `init_data` to admin endpoints when running inside Telegram.

### P2
- Bottom-bar nav (Pixlands-style) instead of top-right tabs.
- Hire pixel-art artist or replace SVG sprites with proper sprite sheets.
- Boss spawn cinematics every 10 waves with guaranteed epic drop.

## Files of Reference
- `/app/backend/server.py` — all endpoints + poller.
- `/app/frontend/src/components/game/BattleArena.jsx` — combat scene.
- `/app/frontend/src/components/game/PixelSprites.jsx` — 2D pixel sprites.
- `/app/frontend/src/components/game/ForestMap.jsx` — forest tilemap.
- `/app/frontend/src/components/game/AdminPanel.jsx` — hidden admin tab.
- `/app/frontend/src/components/wallet/WithdrawDialog.jsx`.
- `/app/frontend/src/store/gameStore.js` — VIP/XP buff calculus.
- `/app/memory/test_credentials.md` — testing notes.
