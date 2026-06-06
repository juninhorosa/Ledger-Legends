# Chronicles of TON — PRD

## Problem Statement
Build a browser-based incremental RPG with TON blockchain economy. World of Warcraft-inspired visuals: chunky, vibrant, epic armors, glowing rune weapons, fantasy enemies (orcs, undead, elves).

## Tech Stack
- Frontend: React (CRA), Tailwind, shadcn/ui primitives, Zustand state, Sonner toasts, lucide-react icons
- Backend: FastAPI + MongoDB
- Blockchain: @tonconnect/ui-react SDK (real TON wallet integration)

## User Choices
- **TonConnect**: Real SDK integration (Tonkeeper / MyTonWallet)
- **Persistence**: MongoDB via FastAPI
- **Scope**: Full MVP — Combat, Inventory, Crafting, Talent Tree, Season Pass, Wallet, Shop
- **Visuals**: WoW-style imagery (Unsplash fantasy assets)
- **Language**: Bilingual (EN + PT, toggleable)

## Architecture
- Backend routes (prefixed `/api`):
  - `GET /player/{wallet}` — get or create player
  - `POST /player/{wallet}/save` — save game state
  - `POST /player/{wallet}/purchase` — record TON/USDT purchase
  - `GET /leaderboard` — top players by Battle Meter
- Frontend modules:
  - `/store/gameStore.js` — Zustand store with derived stats (DPS, BM, max HP, defense)
  - `/i18n/` — EN/PT translation context
  - `/components/game/` — CharacterPanel, CombatScreen, InventoryPanel, TalentTree, Crafting, SeasonPass, Shop, GamePanel
  - `/components/wallet/WalletPanel.jsx` — TonConnect UI + balance fetcher
- TonConnect manifest at `public/tonconnect-manifest.json`

## Core Gameplay Loop
- Auto-attack DPS combat with wave progression (every 10th wave = boss)
- Monster scaling per wave; gold/XP/material/loot drops
- Loot rarity tiers (common → legendary) with color-coded slots
- Level-up grants talent points; talent tree has 3 branches (Strength / Agility / Intellect)
- Crafting consumes materials + gold to forge weapons/armor
- Season pass with 20 tiers (gold & legendary item rewards)
- Shop with TON / USDT / Gold payment options; TON purchases use `tonConnectUI.sendTransaction`

## Implemented (June 2026)
- ✅ Full backend (5 endpoints) with auto-create player & save
- ✅ Zustand store with all game systems (combat, inventory, crafting, talents, season, shop)
- ✅ WoW-themed UI with Cinzel + Outfit + JetBrains Mono fonts
- ✅ TonConnect integration (real wallet, real `sendTransaction`)
- ✅ Bilingual (EN/PT) toggle with persistence
- ✅ Auto-save every 15s + manual save button
- ✅ Damage numbers, crit, boss waves, monster sprites
- ✅ Equipment slots with rarity glow
- ✅ Talent tree with 9 nodes & prerequisites
- ✅ Season pass with 20 tiers

## Iteration 2 (Telegram + Animations)
- ✅ Telegram Bot integration (token configured in .env)
- ✅ Webhook + Mini App menu button + `/start` `/help` commands set
- ✅ `/api/telegram/auth` validates HMAC-SHA256 initData → auto-creates/loads player
- ✅ `/api/telegram/notify` proxies to Bot API sendMessage
- ✅ Frontend auto-detects Telegram WebApp env, auto-logs user (no wallet required in TG)
- ✅ Framer Motion animated hero (idle/attack/cast/victory states)
- ✅ Framer Motion animated monster (idle float, hit shake, death fade, boss glow)
- ✅ 3 active skills with cooldowns: Power Strike (3× dmg, 8s), Fireball (5× dmg, 15s), Holy Light (skip + gold, 20s)
- ✅ Inline Lottie VFX for fire/slash/heal effects
- ✅ Haptic feedback in Telegram via HapticFeedback API
- ✅ 26/26 backend tests passing including HMAC validation

## Backlog / Next Tasks
- P1: Server-side payment verification (TON Center polling treasury wallet)
- P1: USDT Jetton transfer implementation
- P1: Auth-gate /api/telegram/notify (anyone can spam any chat_id today)
- P1: Add auth_date freshness check to initData verification (<24h)
- P2: Leaderboard UI
- P2: PvP arena & guilds
- P2: Sound effects & background music
- P2: Replace inline Lottie VFX with high-quality animations from LottieFiles
- P2: Migrate webhook secret to X-Telegram-Bot-Api-Secret-Token header
