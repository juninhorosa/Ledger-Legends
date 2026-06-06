from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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
