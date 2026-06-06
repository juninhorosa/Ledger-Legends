from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import hmac
import hashlib
import json
from urllib.parse import unquote, parse_qsl
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_WEBHOOK_SECRET = os.environ.get('TELEGRAM_WEBHOOK_SECRET', 'secret')
APP_URL = os.environ.get('APP_URL', '')
TG_API = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"

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
def verify_telegram_init_data(init_data: str) -> Optional[dict]:
    """Validate Telegram WebApp initData using HMAC-SHA256.
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
        user_raw = parsed.get("user")
        if user_raw:
            parsed["user"] = json.loads(user_raw)
        return parsed
    except Exception as e:
        logging.exception("Telegram initData verification failed: %s", e)
        return None


class TelegramAuthRequest(BaseModel):
    init_data: str

@api_router.post("/telegram/auth")
async def telegram_auth(body: TelegramAuthRequest):
    parsed = verify_telegram_init_data(body.init_data)
    if not parsed:
        raise HTTPException(status_code=401, detail="Invalid Telegram initData")
    user = parsed.get("user", {})
    tg_id = user.get("id")
    if not tg_id:
        raise HTTPException(status_code=400, detail="No user in initData")
    wallet_key = f"tg:{tg_id}"
    existing = await db.players.find_one({"wallet": wallet_key}, {"_id": 0})
    if not existing:
        first = user.get("first_name") or "Hero"
        new_player = Player(wallet=wallet_key, name=first[:24])
        doc = new_player.model_dump()
        doc["telegram_id"] = tg_id
        doc["telegram_username"] = user.get("username")
        await db.players.insert_one(doc)
        existing = doc
    return {
        "wallet": wallet_key,
        "telegram_id": tg_id,
        "telegram_username": user.get("username"),
        "first_name": user.get("first_name"),
        "player": {k: v for k, v in existing.items() if k != "_id"},
    }


class NotifyRequest(BaseModel):
    telegram_id: int
    text: str
    parse_mode: Optional[str] = "HTML"

@api_router.post("/telegram/notify")
async def telegram_notify(body: NotifyRequest):
    if not TELEGRAM_BOT_TOKEN:
        raise HTTPException(status_code=500, detail="Bot token not configured")
    async with httpx.AsyncClient(timeout=10.0) as cx:
        r = await cx.post(f"{TG_API}/sendMessage", json={
            "chat_id": body.telegram_id,
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
        await _tg_send(chat_id,
            "<b>⚔️ Chronicles of TON</b>\n\nEmbark on an epic incremental RPG adventure! Hunt monsters, collect legendary loot, and master the talent tree.\n\n<i>Tap the button below to enter the realm.</i>",
            reply_markup={
                "inline_keyboard": [[{"text": "🛡️ Play Now", "web_app": {"url": APP_URL}}]]
            },
        )
    elif text.startswith("/help"):
        await _tg_send(chat_id, "Use /start to open the game. Notifications are sent automatically when bosses appear or rewards are ready.")
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
                {"command": "help", "description": "How to play"},
            ]
        })
        results["setMyCommands"] = r3.json()
    return results


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
