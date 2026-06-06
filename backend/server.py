from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import hmac
import hashlib
import json
import asyncio
import secrets
import uuid
from urllib.parse import unquote, parse_qsl
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_WEBHOOK_SECRET = os.environ.get('TELEGRAM_WEBHOOK_SECRET', 'secret')
APP_URL = os.environ.get('APP_URL', '')
TG_API = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"

# ---- TON Economy ----
TREASURY_WALLET = os.environ.get('TREASURY_WALLET', '')
ADMIN_TELEGRAM_IDS = set(
    int(x.strip()) for x in os.environ.get('ADMIN_TELEGRAM_IDS', '').split(',') if x.strip().isdigit()
)
TON_CENTER_API_KEY = os.environ.get('TON_CENTER_API_KEY', '')
TON_NETWORK = os.environ.get('TON_NETWORK', 'mainnet')
TON_CENTER_BASE = (
    "https://toncenter.com/api/v2" if TON_NETWORK == 'mainnet'
    else "https://testnet.toncenter.com/api/v2"
)
DEPOSIT_POLL_INTERVAL = int(os.environ.get('DEPOSIT_POLL_INTERVAL', '30'))

app = FastAPI(title="Chronicles of TON API")
api_router = APIRouter(prefix="/api")


# ---------- Models ----------
class PlayerStats(BaseModel):
    strength: int = 10
    agility: int = 10
    intellect: int = 10
    stamina: int = 10

class Equipment(BaseModel):
    weapon: Optional[str] = None
    helmet: Optional[str] = None
    chest: Optional[str] = None
    boots: Optional[str] = None
    ring: Optional[str] = None
    amulet: Optional[str] = None

class Player(BaseModel):
    model_config = ConfigDict(extra="ignore")
    wallet: str
    name: str = "Hero"
    level: int = 1
    xp: int = 0
    gold: int = 100
    wave: int = 1
    highest_wave: int = 1
    stats: PlayerStats = Field(default_factory=PlayerStats)
    equipment: Equipment = Field(default_factory=Equipment)
    inventory: List[str] = Field(default_factory=list)
    materials: Dict[str, int] = Field(default_factory=dict)
    talents: Dict[str, int] = Field(default_factory=dict)
    talent_points: int = 0
    season_xp: int = 0
    season_claimed: List[int] = Field(default_factory=list)
    battle_meter: int = 100
    # ---- TON Economy ----
    ton_balance: float = 0.0  # internal balance (deposited & not yet withdrawn/spent)
    vip_level: int = 0
    vip_purchased_levels: List[int] = Field(default_factory=list)
    xp_pack_expires_at: Optional[str] = None
    start_pack_purchased: bool = False
    telegram_id: Optional[int] = None
    telegram_username: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SaveRequest(BaseModel):
    name: Optional[str] = None
    level: Optional[int] = None
    xp: Optional[int] = None
    gold: Optional[int] = None
    wave: Optional[int] = None
    highest_wave: Optional[int] = None
    stats: Optional[PlayerStats] = None
    equipment: Optional[Equipment] = None
    inventory: Optional[List[str]] = None
    materials: Optional[Dict[str, int]] = None
    talents: Optional[Dict[str, int]] = None
    talent_points: Optional[int] = None
    season_xp: Optional[int] = None
    season_claimed: Optional[List[int]] = None
    battle_meter: Optional[int] = None

class PurchaseRequest(BaseModel):
    wallet: str
    item_id: str
    currency: str  # "TON" | "USDT" | "GOLD"
    amount: float
    tx_hash: Optional[str] = None

class Purchase(BaseModel):
    wallet: str
    item_id: str
    currency: str
    amount: float
    tx_hash: Optional[str] = None
    status: str = "pending"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "Chronicles of TON API", "status": "ok"}

@api_router.get("/player/{wallet}", response_model=Player)
async def get_or_create_player(wallet: str):
    doc = await db.players.find_one({"wallet": wallet}, {"_id": 0})
    if doc:
        return Player(**doc)
    new_player = Player(wallet=wallet)
    await db.players.insert_one(new_player.model_dump())
    return new_player

@api_router.post("/player/{wallet}/save", response_model=Player)
async def save_player(wallet: str, body: SaveRequest):
    existing = await db.players.find_one({"wallet": wallet}, {"_id": 0})
    if not existing:
        existing = Player(wallet=wallet).model_dump()
    update = body.model_dump(exclude_none=True)
    if "stats" in update and update["stats"] is not None:
        update["stats"] = update["stats"] if isinstance(update["stats"], dict) else update["stats"].model_dump()
    if "equipment" in update and update["equipment"] is not None:
        update["equipment"] = update["equipment"] if isinstance(update["equipment"], dict) else update["equipment"].model_dump()
    existing.update(update)
    existing["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.players.update_one({"wallet": wallet}, {"$set": existing}, upsert=True)
    return Player(**existing)

@api_router.post("/player/{wallet}/purchase")
async def purchase_item(wallet: str, body: PurchaseRequest):
    if body.wallet != wallet:
        raise HTTPException(status_code=400, detail="Wallet mismatch")
    purchase = Purchase(**body.model_dump(), status="confirmed")
    await db.purchases.insert_one(purchase.model_dump())
    # Append to player inventory
    await db.players.update_one(
        {"wallet": wallet},
        {"$push": {"inventory": body.item_id}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"status": "confirmed", "item_id": body.item_id}

@api_router.get("/leaderboard")
async def leaderboard():
    cursor = db.players.find({}, {"_id": 0, "wallet": 1, "name": 1, "highest_wave": 1, "battle_meter": 1, "level": 1})
    docs = await cursor.sort("battle_meter", -1).limit(20).to_list(20)
    return docs


# ---------- Telegram Mini App Integration ----------
def verify_telegram_init_data(init_data: str, max_age_sec: int = 86400) -> Optional[dict]:
    """Validate Telegram WebApp initData using HMAC-SHA256 and check auth_date freshness.
    Returns parsed user dict if valid, None otherwise."""
    if not TELEGRAM_BOT_TOKEN or not init_data:
        return None
    try:
        parsed = dict(parse_qsl(init_data, keep_blank_values=True))
        received_hash = parsed.pop("hash", None)
        if not received_hash:
            return None
        data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed.items()))
        secret_key = hmac.new(b"WebAppData", TELEGRAM_BOT_TOKEN.encode(), hashlib.sha256).digest()
        computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(computed_hash, received_hash):
            return None
        # Freshness check (replay protection)
        auth_date = parsed.get("auth_date")
        if auth_date:
            try:
                age = int(datetime.now(timezone.utc).timestamp()) - int(auth_date)
                if age > max_age_sec:
                    return None
            except (TypeError, ValueError):
                return None
        user_raw = parsed.get("user")
        if user_raw:
            parsed["user"] = json.loads(user_raw)
        return parsed
    except Exception as e:
        logging.exception("Telegram initData verification failed: %s", e)
        return None


class TelegramAuthRequest(BaseModel):
    init_data: str
    referred_by: Optional[int] = None  # Telegram user id of the inviter

@api_router.post("/telegram/auth")
async def telegram_auth(body: TelegramAuthRequest):
    parsed = verify_telegram_init_data(body.init_data)
    if not parsed:
        raise HTTPException(status_code=401, detail="Invalid Telegram initData")
    user = parsed.get("user", {})
    tg_id = user.get("id")
    if not tg_id:
        raise HTTPException(status_code=400, detail="No user in initData")
    # Also accept start_param "ref_<userId>" for referrals via deep link
    ref_id = body.referred_by
    start_param = parsed.get("start_param")
    if not ref_id and start_param and start_param.startswith("ref_"):
        try:
            ref_id = int(start_param[4:])
        except ValueError:
            ref_id = None
    if ref_id and ref_id == tg_id:
        ref_id = None  # can't refer yourself

    wallet_key = f"tg:{tg_id}"
    existing = await db.players.find_one({"wallet": wallet_key}, {"_id": 0})
    bonus_granted = False
    if not existing:
        first = user.get("first_name") or "Hero"
        new_player = Player(wallet=wallet_key, name=first[:24])
        doc = new_player.model_dump()
        doc["telegram_id"] = tg_id
        doc["telegram_username"] = user.get("username")
        # Apply referral bonus
        if ref_id:
            inviter_wallet = f"tg:{ref_id}"
            inviter = await db.players.find_one({"wallet": inviter_wallet}, {"_id": 0})
            if inviter:
                # New player gets a starter epic item + 200 gold
                doc["inventory"] = (doc.get("inventory") or []) + ["rune_blade"]
                doc["gold"] = (doc.get("gold") or 100) + 200
                doc["referred_by"] = ref_id
                # Inviter gets 500 gold + 1 referral counted
                await db.players.update_one(
                    {"wallet": inviter_wallet},
                    {
                        "$inc": {"gold": 500, "referrals_count": 1},
                        "$push": {"referred_users": tg_id},
                        "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
                    },
                )
                bonus_granted = True
                # Notify inviter (best-effort)
                try:
                    await _tg_send(ref_id, f"🎉 <b>{user.get('first_name', 'A friend')}</b> joined Chronicles of TON via your link! You received <b>+500 gold</b>.")
                except Exception:
                    pass
        await db.players.insert_one(doc)
        existing = doc
    return {
        "wallet": wallet_key,
        "telegram_id": tg_id,
        "telegram_username": user.get("username"),
        "first_name": user.get("first_name"),
        "referral_bonus_granted": bonus_granted,
        "player": {k: v for k, v in existing.items() if k != "_id"},
    }


class NotifyRequest(BaseModel):
    init_data: str  # caller must prove they are a valid Telegram user
    text: str
    parse_mode: Optional[str] = "HTML"

@api_router.post("/telegram/notify")
async def telegram_notify(body: NotifyRequest):
    """Send a notification to the caller's own Telegram chat.
    The caller must include a valid initData; we only send to that verified user's chat_id."""
    if not TELEGRAM_BOT_TOKEN:
        raise HTTPException(status_code=500, detail="Bot token not configured")
    parsed = verify_telegram_init_data(body.init_data)
    if not parsed:
        raise HTTPException(status_code=401, detail="Invalid Telegram initData")
    user = parsed.get("user", {})
    tg_id = user.get("id")
    if not tg_id:
        raise HTTPException(status_code=400, detail="No user in initData")
    async with httpx.AsyncClient(timeout=10.0) as cx:
        r = await cx.post(f"{TG_API}/sendMessage", json={
            "chat_id": tg_id,
            "text": body.text,
            "parse_mode": body.parse_mode,
        })
        return r.json()


@api_router.post("/telegram/webhook/{secret}")
async def telegram_webhook(secret: str, request: Request):
    if secret != TELEGRAM_WEBHOOK_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")
    update = await request.json()
    msg = update.get("message") or update.get("edited_message") or {}
    text = msg.get("text", "")
    chat = msg.get("chat", {})
    chat_id = chat.get("id")
    if not chat_id:
        return {"ok": True}
    if text.startswith("/start"):
        # Parse referral param from /start ref_<userId>
        parts = text.split(maxsplit=1)
        ref_user_id = None
        if len(parts) > 1 and parts[1].startswith("ref_"):
            try:
                ref_user_id = int(parts[1][4:])
            except ValueError:
                ref_user_id = None
        web_app_url = APP_URL
        if ref_user_id:
            web_app_url = f"{APP_URL}?ref={ref_user_id}"
        await _tg_send(chat_id,
            "<b>⚔️ Chronicles of TON</b>\n\nEmbark on an epic incremental RPG adventure! Hunt monsters, collect legendary loot, and master the talent tree.\n\n<i>Tap the button below to enter the realm.</i>",
            reply_markup={
                "inline_keyboard": [[{"text": "🛡️ Play Now", "web_app": {"url": web_app_url}}]]
            },
        )
    elif text.startswith("/invite"):
        # Provide a referral link
        user_id = msg.get("from", {}).get("id")
        if user_id:
            # Need bot username for t.me link; fall back to getMe
            async with httpx.AsyncClient(timeout=10.0) as cx:
                me = (await cx.get(f"{TG_API}/getMe")).json()
                username = me.get("result", {}).get("username", "")
            link = f"https://t.me/{username}?start=ref_{user_id}"
            await _tg_send(chat_id,
                f"🤝 <b>Invite friends, earn rewards!</b>\n\nShare this link:\n<code>{link}</code>\n\nWhen a friend joins, you both get bonuses:\n• You: <b>+500 gold</b>\n• Friend: <b>+200 gold + Rare weapon</b>")
    elif text.startswith("/help"):
        await _tg_send(chat_id, "Commands:\n/start — Open the game\n/invite — Get your referral link\n\nNotifications are sent automatically when bosses appear or rewards are ready.")
    return {"ok": True}


async def _tg_send(chat_id: int, text: str, reply_markup: Optional[dict] = None):
    if not TELEGRAM_BOT_TOKEN:
        return
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}
    if reply_markup:
        payload["reply_markup"] = reply_markup
    async with httpx.AsyncClient(timeout=10.0) as cx:
        try:
            await cx.post(f"{TG_API}/sendMessage", json=payload)
        except Exception as e:
            logging.warning("Telegram send failed: %s", e)


@api_router.post("/telegram/setup")
async def telegram_setup():
    """Idempotent: configures the bot's menu button and webhook. Run once after deploy."""
    if not TELEGRAM_BOT_TOKEN or not APP_URL:
        raise HTTPException(status_code=500, detail="Bot token or APP_URL missing")
    webhook_url = f"{APP_URL}/api/telegram/webhook/{TELEGRAM_WEBHOOK_SECRET}"
    results = {}
    async with httpx.AsyncClient(timeout=15.0) as cx:
        r1 = await cx.post(f"{TG_API}/setWebhook", json={"url": webhook_url, "drop_pending_updates": True})
        results["setWebhook"] = r1.json()
        r2 = await cx.post(f"{TG_API}/setChatMenuButton", json={
            "menu_button": {"type": "web_app", "text": "⚔️ Play", "web_app": {"url": APP_URL}}
        })
        results["setChatMenuButton"] = r2.json()
        r3 = await cx.post(f"{TG_API}/setMyCommands", json={
            "commands": [
                {"command": "start", "description": "Open Chronicles of TON"},
                {"command": "invite", "description": "Get your referral link"},
                {"command": "help", "description": "How to play"},
            ]
        })
        results["setMyCommands"] = r3.json()
    return results


@api_router.get("/player/{wallet}/referral")
async def get_referral_link(wallet: str):
    """Build a t.me referral link for a player.
    Wallet must be tg:<id> for this to work."""
    if not wallet.startswith("tg:"):
        raise HTTPException(status_code=400, detail="Referral links only work for Telegram users")
    try:
        tg_id = int(wallet.split(":", 1)[1])
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid wallet format")
    async with httpx.AsyncClient(timeout=10.0) as cx:
        me = (await cx.get(f"{TG_API}/getMe")).json()
        username = me.get("result", {}).get("username", "")
    link = f"https://t.me/{username}?start=ref_{tg_id}"
    player = await db.players.find_one({"wallet": wallet}, {"_id": 0, "referrals_count": 1, "referred_users": 1})
    return {
        "link": link,
        "bot_username": username,
        "referrals_count": (player or {}).get("referrals_count", 0),
        "referred_users": (player or {}).get("referred_users", []),
    }


# =====================================================================
# ===================== TON ECONOMY (Phase 1) =========================
# =====================================================================

# ---------- Models ----------
class DepositInit(BaseModel):
    wallet: str
    amount_ton: float = Field(gt=0, le=10000)


class Deposit(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    wallet: str
    amount_ton: float
    amount_nano: int
    comment: str
    status: str = "pending"  # pending | confirmed | expired
    tx_hash: Optional[str] = None
    from_address: Optional[str] = None
    received_nano: Optional[int] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    confirmed_at: Optional[str] = None


# ---------- VIP catalogue helper ----------
def vip_price_ton(level: int) -> float:
    """Cost (in TON) to purchase a specific VIP level (cumulative model: must own previous)."""
    if level < 1 or level > 30:
        return 0.0
    # progressive curve: level*1.5 + level^2 * 0.1
    return round(level * 1.5 + (level * level) * 0.1, 2)


def vip_benefits(level: int) -> dict:
    """Cumulative benefits for a given VIP level (1..30)."""
    if level < 1:
        return {
            "market_tax_pct": 20,
            "gold_drop_bonus_pct": 0,
            "xp_gain_bonus_pct": 0,
            "extra_inventory_slots": 0,
            "damage_bonus_pct": 0,
            "badge": None,
        }
    market_tax = 10
    if level >= 20:
        market_tax = 8
    if level >= 30:
        market_tax = 5
    return {
        "market_tax_pct": market_tax,
        "gold_drop_bonus_pct": min(level, 30),                # +1% per level cap 30
        "xp_gain_bonus_pct": min(level * 2, 60),               # up to +60%
        "extra_inventory_slots": (level // 5),                 # +1 slot every 5 levels
        "damage_bonus_pct": min(level, 30),                    # +1% per level
        "badge": "gold" if level >= 30 else ("silver" if level >= 15 else ("bronze" if level >= 1 else None)),
    }


# ---------- Endpoints: Deposits ----------
@api_router.post("/deposit/init")
async def deposit_init(body: DepositInit):
    if not TREASURY_WALLET:
        raise HTTPException(status_code=500, detail="Treasury wallet not configured")
    comment = f"dep_{secrets.token_hex(4)}"
    # Guarantee uniqueness
    while await db.deposits.find_one({"comment": comment}):
        comment = f"dep_{secrets.token_hex(4)}"
    amount_nano = int(round(body.amount_ton * 1e9))
    dep = Deposit(
        wallet=body.wallet,
        amount_ton=body.amount_ton,
        amount_nano=amount_nano,
        comment=comment,
    )
    await db.deposits.insert_one(dep.model_dump())
    return {
        "deposit_id": dep.id,
        "treasury_address": TREASURY_WALLET,
        "amount_ton": body.amount_ton,
        "amount_nano": amount_nano,
        "comment": comment,
        "expires_in_sec": 1800,
        "network": TON_NETWORK,
    }


@api_router.get("/deposit/status/{deposit_id}")
async def deposit_status(deposit_id: str):
    doc = await db.deposits.find_one({"id": deposit_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Deposit not found")
    return doc


@api_router.get("/deposits/{wallet}")
async def deposits_history(wallet: str, limit: int = 20):
    cursor = db.deposits.find({"wallet": wallet}, {"_id": 0}).sort("created_at", -1).limit(limit)
    return await cursor.to_list(limit)


@api_router.get("/balance/{wallet}")
async def get_balance(wallet: str):
    p = await db.players.find_one(
        {"wallet": wallet},
        {"_id": 0, "ton_balance": 1, "vip_level": 1, "xp_pack_expires_at": 1, "gold": 1, "start_pack_purchased": 1},
    )
    if not p:
        return {
            "ton_balance": 0.0,
            "vip_level": 0,
            "gold": 0,
            "xp_pack_active": False,
            "xp_pack_expires_at": None,
            "start_pack_purchased": False,
            "vip_benefits": vip_benefits(0),
        }
    xp_exp = p.get("xp_pack_expires_at")
    active = False
    if xp_exp:
        try:
            active = datetime.fromisoformat(xp_exp.replace('Z', '+00:00')) > datetime.now(timezone.utc)
        except Exception:
            active = False
    level = int(p.get("vip_level") or 0)
    return {
        "ton_balance": float(p.get("ton_balance", 0.0)),
        "vip_level": level,
        "gold": int(p.get("gold", 0)),
        "xp_pack_active": active,
        "xp_pack_expires_at": xp_exp,
        "start_pack_purchased": bool(p.get("start_pack_purchased")),
        "vip_benefits": vip_benefits(level),
    }


@api_router.get("/vip/catalog")
async def vip_catalog():
    """Return the full VIP catalog with prices and cumulative benefits."""
    items = []
    for lvl in range(1, 31):
        items.append({
            "level": lvl,
            "price_ton": vip_price_ton(lvl),
            "benefits": vip_benefits(lvl),
        })
    return {"items": items}


# ---------- Packs catalogue + purchase ----------
PACKS: Dict[str, Dict[str, Any]] = {
    "start": {
        "id": "start",
        "name": {"en": "Starter Pack", "pt": "Pacote Inicial"},
        "description": {
            "en": "+5,000 gold, 1 rare item and 24h XP boost. Once per player.",
            "pt": "+5.000 ouro, 1 item raro e impulso de XP por 24h. Uma vez por jogador.",
        },
        "price_ton": 5.0,
        "one_time": True,
        "rewards": {
            "gold": 5000,
            "item": "rune_blade",
            "xp_boost_hours": 24,
        },
    },
    "xp": {
        "id": "xp",
        "name": {"en": "XP Pack", "pt": "Pacote de XP"},
        "description": {
            "en": "Doubles XP gains for 7 days. Stacks by extending duration.",
            "pt": "Dobra o XP recebido por 7 dias. Compra repetida estende a duração.",
        },
        "price_ton": 1.5,
        "one_time": False,
        "duration_days": 7,
        "xp_multiplier": 2.0,
    },
}


class PackBuyRequest(BaseModel):
    wallet: str
    pack_id: str


@api_router.get("/pack/catalog")
async def pack_catalog():
    return {"items": list(PACKS.values())}


def _extend_xp_pack(current_iso: Optional[str], add_seconds: int) -> str:
    """Return a new ISO timestamp extending an existing xp pack expiry, or starting from now."""
    now = datetime.now(timezone.utc)
    base = now
    if current_iso:
        try:
            existing = datetime.fromisoformat(current_iso.replace('Z', '+00:00'))
            if existing > now:
                base = existing
        except Exception:
            base = now
    return (base + timedelta(seconds=add_seconds)).isoformat()


@api_router.post("/pack/buy")
async def pack_buy(body: PackBuyRequest):
    pack = PACKS.get(body.pack_id)
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")
    player = await db.players.find_one({"wallet": body.wallet}, {"_id": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    price = float(pack["price_ton"])
    if float(player.get("ton_balance", 0.0)) < price - 1e-9:
        raise HTTPException(status_code=400, detail="Insufficient TON balance")
    if pack.get("one_time") and bool(player.get("start_pack_purchased")):
        raise HTTPException(status_code=400, detail="Pack already purchased")

    # ---- Compute updates ----
    inc_fields: Dict[str, Any] = {"ton_balance": -price}
    set_fields: Dict[str, Any] = {"updated_at": datetime.now(timezone.utc).isoformat()}
    push_fields: Dict[str, Any] = {}

    rewards_summary: Dict[str, Any] = {"pack_id": pack["id"], "price_ton": price}

    if body.pack_id == "start":
        rewards = pack["rewards"]
        inc_fields["gold"] = int(rewards.get("gold", 0))
        item_id = rewards.get("item")
        if item_id:
            push_fields["inventory"] = item_id
        boost_hours = int(rewards.get("xp_boost_hours", 0))
        if boost_hours > 0:
            new_exp = _extend_xp_pack(player.get("xp_pack_expires_at"), boost_hours * 3600)
            set_fields["xp_pack_expires_at"] = new_exp
            rewards_summary["xp_pack_expires_at"] = new_exp
        set_fields["start_pack_purchased"] = True
        rewards_summary.update({"gold": int(rewards.get("gold", 0)), "item": item_id})

    elif body.pack_id == "xp":
        days = int(pack.get("duration_days", 7))
        new_exp = _extend_xp_pack(player.get("xp_pack_expires_at"), days * 86400)
        set_fields["xp_pack_expires_at"] = new_exp
        rewards_summary["xp_pack_expires_at"] = new_exp
        rewards_summary["duration_days"] = days

    update_doc: Dict[str, Any] = {"$inc": inc_fields, "$set": set_fields}
    if push_fields:
        update_doc["$push"] = push_fields
    await db.players.update_one({"wallet": body.wallet}, update_doc)

    # Audit log
    await db.pack_purchases.insert_one({
        "id": str(uuid.uuid4()),
        "wallet": body.wallet,
        "pack_id": pack["id"],
        "price_ton": price,
        "rewards": rewards_summary,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    updated = await db.players.find_one(
        {"wallet": body.wallet},
        {"_id": 0, "ton_balance": 1, "gold": 1, "xp_pack_expires_at": 1, "start_pack_purchased": 1, "inventory": 1},
    )

    # Best-effort Telegram notif
    if body.wallet.startswith("tg:"):
        try:
            tg_id = int(body.wallet.split(":", 1)[1])
            label = pack["name"].get("pt", pack["name"]["en"])
            await _tg_send(tg_id, f"<b>{label}</b> ativado!\n-{price:.2f} TON debitado do seu saldo.")
        except Exception:
            pass

    return {
        "status": "ok",
        "rewards": rewards_summary,
        "ton_balance": float(updated.get("ton_balance", 0.0)),
        "gold": int(updated.get("gold", 0)),
        "xp_pack_expires_at": updated.get("xp_pack_expires_at"),
        "start_pack_purchased": bool(updated.get("start_pack_purchased")),
        "inventory": updated.get("inventory", []),
    }


# ---------- VIP purchase ----------
class VipBuyRequest(BaseModel):
    wallet: str
    target_level: int = Field(ge=1, le=30)


@api_router.post("/vip/buy")
async def vip_buy(body: VipBuyRequest):
    player = await db.players.find_one({"wallet": body.wallet}, {"_id": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    current = int(player.get("vip_level") or 0)
    if body.target_level <= current:
        raise HTTPException(status_code=400, detail="Target level must be greater than current VIP level")

    # Cumulative price of levels (current+1) .. target_level
    levels_to_buy = list(range(current + 1, body.target_level + 1))
    total_price = round(sum(vip_price_ton(lv) for lv in levels_to_buy), 4)
    if float(player.get("ton_balance", 0.0)) < total_price - 1e-9:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient TON balance (need {total_price:.4f}, have {float(player.get('ton_balance', 0.0)):.4f})",
        )

    purchased = list(player.get("vip_purchased_levels") or [])
    purchased.extend(levels_to_buy)

    await db.players.update_one(
        {"wallet": body.wallet},
        {
            "$inc": {"ton_balance": -total_price},
            "$set": {
                "vip_level": body.target_level,
                "vip_purchased_levels": purchased,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        },
    )

    # Audit log
    await db.vip_purchases.insert_one({
        "id": str(uuid.uuid4()),
        "wallet": body.wallet,
        "from_level": current,
        "to_level": body.target_level,
        "levels": levels_to_buy,
        "price_ton": total_price,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    updated = await db.players.find_one(
        {"wallet": body.wallet},
        {"_id": 0, "ton_balance": 1, "vip_level": 1},
    )

    if body.wallet.startswith("tg:"):
        try:
            tg_id = int(body.wallet.split(":", 1)[1])
            await _tg_send(
                tg_id,
                f"<b>VIP Lv {body.target_level}</b> ativado!\nCusto total: {total_price:.2f} TON.",
            )
        except Exception:
            pass

    return {
        "status": "ok",
        "from_level": current,
        "to_level": body.target_level,
        "levels_purchased": levels_to_buy,
        "price_ton": total_price,
        "ton_balance": float(updated.get("ton_balance", 0.0)),
        "vip_level": int(updated.get("vip_level", 0)),
        "benefits": vip_benefits(body.target_level),
    }


# ---------- Background TON deposit poller ----------
async def _poll_ton_deposits_once():
    if not TREASURY_WALLET:
        return
    params = {"address": TREASURY_WALLET, "limit": 30, "archival": "true"}
    headers = {}
    if TON_CENTER_API_KEY:
        headers["X-API-Key"] = TON_CENTER_API_KEY
    try:
        async with httpx.AsyncClient(timeout=15.0, headers=headers) as cx:
            r = await cx.get(f"{TON_CENTER_BASE}/getTransactions", params=params)
            data = r.json()
    except Exception as e:
        logger.warning("TON Center fetch failed: %s", e)
        return
    if not data.get("ok"):
        logger.warning("TON Center returned not-ok: %s", data)
        return
    for tx in data.get("result", []):
        in_msg = tx.get("in_msg") or {}
        comment = (in_msg.get("message") or "").strip()
        if not comment or not comment.startswith("dep_"):
            continue
        deposit = await db.deposits.find_one({"comment": comment, "status": "pending"})
        if not deposit:
            continue
        try:
            value_nano = int(in_msg.get("value") or 0)
        except (TypeError, ValueError):
            value_nano = 0
        # Tolerance: accept if user paid >= expected - 1000 nano (network fees rounding)
        if value_nano < (deposit["amount_nano"] - 1000):
            continue
        tx_hash = (tx.get("transaction_id") or {}).get("hash")
        from_addr = in_msg.get("source")
        upd = await db.deposits.update_one(
            {"id": deposit["id"], "status": "pending"},
            {"$set": {
                "status": "confirmed",
                "tx_hash": tx_hash,
                "from_address": from_addr,
                "confirmed_at": datetime.now(timezone.utc).isoformat(),
                "received_nano": value_nano,
            }},
        )
        if upd.modified_count == 0:
            continue
        credit_ton = value_nano / 1e9
        await db.players.update_one(
            {"wallet": deposit["wallet"]},
            {
                "$inc": {"ton_balance": credit_ton},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
            },
            upsert=True,
        )
        logger.info("Deposit confirmed: %s = %s TON (wallet=%s)", deposit["id"], credit_ton, deposit["wallet"])
        # Telegram notification (best-effort)
        if deposit["wallet"].startswith("tg:"):
            try:
                tg_id = int(deposit["wallet"].split(":", 1)[1])
                await _tg_send(
                    tg_id,
                    f"<b>Deposit confirmed</b>\n+{credit_ton:.4f} TON added to your in-game balance."
                )
            except Exception:
                pass


async def _expire_old_deposits():
    """Mark pending deposits older than 1h as expired."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    await db.deposits.update_many(
        {"status": "pending", "created_at": {"$lt": cutoff}},
        {"$set": {"status": "expired"}},
    )


async def _ton_poller_loop():
    await asyncio.sleep(5)
    while True:
        try:
            await _poll_ton_deposits_once()
            await _expire_old_deposits()
        except Exception as e:
            logger.warning("Poller loop iteration error: %s", e)
        await asyncio.sleep(DEPOSIT_POLL_INTERVAL)


@app.on_event("startup")
async def _start_pollers():
    if TREASURY_WALLET:
        asyncio.create_task(_ton_poller_loop())
        logger.info("TON deposit poller started (network=%s, treasury=%s, interval=%ss)",
                    TON_NETWORK, TREASURY_WALLET, DEPOSIT_POLL_INTERVAL)
    else:
        logger.warning("TREASURY_WALLET not configured; TON poller disabled")


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Register the router AFTER all endpoints have been defined above.
app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
