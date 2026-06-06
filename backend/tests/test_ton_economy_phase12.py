"""Backend tests for Chronicles of TON — Phase 1 (Deposits) + Phase 2 (Packs & VIP).

Focus areas (per review request):
- /api/deposit/init, /api/deposit/status/{id}, /api/deposits/{wallet}
- /api/balance/{wallet}
- /api/pack/catalog, /api/pack/buy
- /api/vip/catalog, /api/vip/buy
- Audit logs in pack_purchases / vip_purchases collections

Players' internal ton_balance is credited directly via Mongo (per test_credentials.md)
since the on-chain poller cannot be exercised end-to-end in this preview env.
"""
import os
import uuid
import math
from datetime import datetime, timezone, timedelta

import pytest
import requests
from pymongo import MongoClient

# ------- Config -------
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if not BASE_URL:
    fe_env = '/app/frontend/.env'
    if os.path.exists(fe_env):
        with open(fe_env) as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    BASE_URL = line.split('=', 1)[1].strip().strip('"')
                    break
BASE_URL = (BASE_URL or '').rstrip('/')
API = f"{BASE_URL}/api"

# Read mongo creds from backend/.env
MONGO_URL = None
DB_NAME = None
with open('/app/backend/.env') as f:
    for line in f:
        if line.startswith('MONGO_URL='):
            MONGO_URL = line.split('=', 1)[1].strip().strip('"')
        elif line.startswith('DB_NAME='):
            DB_NAME = line.split('=', 1)[1].strip().strip('"')

EXPECTED_TREASURY = "UQCO5ujJsobYdfFjQQ9DGFZThUFXty21_14HkDnPHOMgM79P"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="module")
def mongo():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


def _new_wallet(prefix="TEST_econ"):
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


def _credit(mongo, wallet, amount_ton):
    """Create/credit a player directly via Mongo."""
    # Ensure player exists first via API to get full default doc, then credit.
    requests.get(f"{API}/player/{wallet}")
    mongo.players.update_one({"wallet": wallet}, {"$set": {"ton_balance": float(amount_ton)}})


# =================== Deposits (Phase 1) ===================
class TestDepositInit:
    def test_deposit_init_creates_pending_doc(self, s, mongo):
        w = _new_wallet("TEST_dep")
        r = s.post(f"{API}/deposit/init", json={"wallet": w, "amount_ton": 2.5})
        assert r.status_code == 200, r.text
        d = r.json()
        assert "deposit_id" in d and isinstance(d["deposit_id"], str) and len(d["deposit_id"]) > 0
        assert d["treasury_address"] == EXPECTED_TREASURY
        assert d["amount_ton"] == 2.5
        assert d["amount_nano"] == int(round(2.5 * 1e9))
        assert d["comment"].startswith("dep_") and len(d["comment"]) >= 8
        assert d["expires_in_sec"] == 1800
        assert d["network"] == "mainnet"

        # Persisted in Mongo with status=pending
        doc = mongo.deposits.find_one({"id": d["deposit_id"]}, {"_id": 0})
        assert doc is not None
        assert doc["status"] == "pending"
        assert doc["wallet"] == w
        assert doc["comment"] == d["comment"]

    def test_deposit_init_invalid_amount(self, s):
        r = s.post(f"{API}/deposit/init", json={"wallet": "x", "amount_ton": 0})
        assert r.status_code == 422
        r2 = s.post(f"{API}/deposit/init", json={"wallet": "x", "amount_ton": -1})
        assert r2.status_code == 422

    def test_deposit_init_unique_comments(self, s):
        comments = set()
        for _ in range(5):
            r = s.post(f"{API}/deposit/init", json={"wallet": _new_wallet(), "amount_ton": 1.0})
            assert r.status_code == 200
            comments.add(r.json()["comment"])
        assert len(comments) == 5


class TestDepositStatusAndHistory:
    def test_status_returns_pending_for_new(self, s):
        w = _new_wallet()
        r = s.post(f"{API}/deposit/init", json={"wallet": w, "amount_ton": 1.0})
        dep_id = r.json()["deposit_id"]
        r2 = s.get(f"{API}/deposit/status/{dep_id}")
        assert r2.status_code == 200
        d = r2.json()
        assert d["id"] == dep_id
        assert d["status"] == "pending"
        assert d["wallet"] == w
        assert "_id" not in d

    def test_status_404_for_unknown(self, s):
        r = s.get(f"{API}/deposit/status/does-not-exist-xyz")
        assert r.status_code == 404

    def test_history_lists_deposits(self, s):
        w = _new_wallet("TEST_hist")
        for amt in (1.0, 2.0, 3.0):
            s.post(f"{API}/deposit/init", json={"wallet": w, "amount_ton": amt})
        r = s.get(f"{API}/deposits/{w}")
        assert r.status_code == 200
        lst = r.json()
        assert isinstance(lst, list)
        assert len(lst) == 3
        amounts = sorted(d["amount_ton"] for d in lst)
        assert amounts == [1.0, 2.0, 3.0]
        # newest-first ordering
        ts = [d["created_at"] for d in lst]
        assert ts == sorted(ts, reverse=True)
        for d in lst:
            assert "_id" not in d


# =================== Balance ===================
class TestBalance:
    def test_balance_non_existent_wallet_returns_zeros(self, s):
        w = f"TEST_nonexistent_{uuid.uuid4().hex[:8]}"
        r = s.get(f"{API}/balance/{w}")
        assert r.status_code == 200
        d = r.json()
        assert d["ton_balance"] == 0.0
        assert d["vip_level"] == 0
        assert d["gold"] == 0
        assert d["xp_pack_active"] is False
        assert d["xp_pack_expires_at"] is None
        assert d["start_pack_purchased"] is False
        b = d["vip_benefits"]
        assert b["market_tax_pct"] == 20
        assert b["gold_drop_bonus_pct"] == 0
        assert b["damage_bonus_pct"] == 0
        assert b["badge"] is None

    def test_balance_after_credit(self, s, mongo):
        w = _new_wallet("TEST_bal")
        _credit(mongo, w, 12.5)
        d = s.get(f"{API}/balance/{w}").json()
        assert d["ton_balance"] == 12.5
        assert d["vip_level"] == 0


# =================== Pack Catalog ===================
class TestPackCatalog:
    def test_pack_catalog_two_items(self, s):
        r = s.get(f"{API}/pack/catalog")
        assert r.status_code == 200
        data = r.json()
        assert "items" in data
        items = data["items"]
        assert len(items) == 2
        by_id = {it["id"]: it for it in items}
        assert set(by_id.keys()) == {"start", "xp"}
        # bilingual & prices
        start = by_id["start"]
        assert start["price_ton"] == 5.0
        assert "en" in start["name"] and "pt" in start["name"]
        assert "en" in start["description"] and "pt" in start["description"]
        xp = by_id["xp"]
        assert xp["price_ton"] == 1.5
        assert "en" in xp["name"] and "pt" in xp["name"]


# =================== VIP Catalog ===================
class TestVipCatalog:
    def test_vip_catalog_30_levels(self, s):
        r = s.get(f"{API}/vip/catalog")
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) == 30
        levels = [it["level"] for it in items]
        assert levels == list(range(1, 31))
        # Spot check level 1
        it1 = items[0]
        assert it1["price_ton"] == round(1 * 1.5 + 1 * 0.1, 2)  # 1.6
        b = it1["benefits"]
        for key in ("market_tax_pct", "gold_drop_bonus_pct", "xp_gain_bonus_pct", "damage_bonus_pct", "badge"):
            assert key in b
        # Spot check level 30
        it30 = items[-1]
        assert it30["price_ton"] == round(30 * 1.5 + 900 * 0.1, 2)  # 135.0
        assert it30["benefits"]["badge"] == "gold"
        assert it30["benefits"]["market_tax_pct"] == 5


# =================== Pack Buy ===================
class TestPackBuy:
    def test_pack_buy_start_success(self, s, mongo):
        w = _new_wallet("TEST_pkstart")
        _credit(mongo, w, 10.0)
        r = s.post(f"{API}/pack/buy", json={"wallet": w, "pack_id": "start"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "ok"
        assert d["ton_balance"] == pytest.approx(5.0, abs=1e-6)
        assert d["gold"] >= 5000  # base 100 default + 5000
        assert d["start_pack_purchased"] is True
        assert "rune_blade" in d["inventory"]
        # xp_pack_expires_at ~ 24h
        exp = datetime.fromisoformat(d["xp_pack_expires_at"].replace('Z', '+00:00'))
        diff = (exp - datetime.now(timezone.utc)).total_seconds()
        assert 23 * 3600 <= diff <= 25 * 3600

        # Audit log
        log = mongo.pack_purchases.find_one({"wallet": w, "pack_id": "start"})
        assert log is not None
        assert log["price_ton"] == 5.0

    def test_pack_buy_start_already_purchased_400(self, s, mongo):
        w = _new_wallet("TEST_pkstart2")
        _credit(mongo, w, 20.0)
        r1 = s.post(f"{API}/pack/buy", json={"wallet": w, "pack_id": "start"})
        assert r1.status_code == 200
        r2 = s.post(f"{API}/pack/buy", json={"wallet": w, "pack_id": "start"})
        assert r2.status_code == 400
        assert "already purchased" in r2.json().get("detail", "").lower()

    def test_pack_buy_xp_extends(self, s, mongo):
        w = _new_wallet("TEST_pkxp")
        _credit(mongo, w, 10.0)
        r1 = s.post(f"{API}/pack/buy", json={"wallet": w, "pack_id": "xp"})
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        exp1 = datetime.fromisoformat(d1["xp_pack_expires_at"].replace('Z', '+00:00'))
        diff1 = (exp1 - datetime.now(timezone.utc)).total_seconds()
        assert 6.9 * 86400 <= diff1 <= 7.1 * 86400
        assert d1["ton_balance"] == pytest.approx(8.5, abs=1e-6)

        # Buy again — extends by another 7 days
        r2 = s.post(f"{API}/pack/buy", json={"wallet": w, "pack_id": "xp"})
        assert r2.status_code == 200
        d2 = r2.json()
        exp2 = datetime.fromisoformat(d2["xp_pack_expires_at"].replace('Z', '+00:00'))
        # Should extend from previous expiry (not from now)
        delta = (exp2 - exp1).total_seconds()
        assert 6.9 * 86400 <= delta <= 7.1 * 86400
        assert d2["ton_balance"] == pytest.approx(7.0, abs=1e-6)

        # Audit logs (2)
        cnt = mongo.pack_purchases.count_documents({"wallet": w, "pack_id": "xp"})
        assert cnt == 2

    def test_pack_buy_insufficient_balance(self, s, mongo):
        w = _new_wallet("TEST_pkpoor")
        _credit(mongo, w, 0.5)
        r = s.post(f"{API}/pack/buy", json={"wallet": w, "pack_id": "start"})
        assert r.status_code == 400
        assert "insufficient" in r.json()["detail"].lower()

    def test_pack_buy_unknown_pack(self, s, mongo):
        w = _new_wallet("TEST_pkunknown")
        _credit(mongo, w, 100.0)
        r = s.post(f"{API}/pack/buy", json={"wallet": w, "pack_id": "nonexistent"})
        assert r.status_code == 404
        assert "not found" in r.json()["detail"].lower()


# =================== VIP Buy ===================
def _cumulative_vip_price(from_lv, to_lv):
    return round(sum(round(lv * 1.5 + lv * lv * 0.1, 2) for lv in range(from_lv + 1, to_lv + 1)), 4)


class TestVipBuy:
    def test_vip_buy_0_to_3(self, s, mongo):
        w = _new_wallet("TEST_vip3")
        _credit(mongo, w, 50.0)
        expected_price = _cumulative_vip_price(0, 3)  # 1.6 + 2.4 + 3.0 = wait check
        # level 1: 1.5+0.1=1.6; level 2: 3.0+0.4=3.4; level 3: 4.5+0.9=5.4 → total 10.4
        assert math.isclose(expected_price, 10.4, abs_tol=1e-6)

        r = s.post(f"{API}/vip/buy", json={"wallet": w, "target_level": 3})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "ok"
        assert d["from_level"] == 0
        assert d["to_level"] == 3
        assert d["levels_purchased"] == [1, 2, 3]
        assert d["price_ton"] == pytest.approx(10.4, abs=1e-4)
        assert d["vip_level"] == 3
        assert d["ton_balance"] == pytest.approx(50.0 - 10.4, abs=1e-4)
        # Benefits should match vip_benefits(3)
        b = d["benefits"]
        assert b["market_tax_pct"] == 10
        assert b["gold_drop_bonus_pct"] == 3
        assert b["xp_gain_bonus_pct"] == 6
        assert b["damage_bonus_pct"] == 3
        assert b["badge"] == "bronze"

        # Mongo persistence
        p = mongo.players.find_one({"wallet": w}, {"_id": 0})
        assert p["vip_level"] == 3
        assert p["vip_purchased_levels"] == [1, 2, 3]

        # Audit log
        log = mongo.vip_purchases.find_one({"wallet": w, "to_level": 3})
        assert log is not None
        assert log["levels"] == [1, 2, 3]
        assert log["from_level"] == 0

    def test_vip_buy_target_le_current_400(self, s, mongo):
        w = _new_wallet("TEST_viple")
        _credit(mongo, w, 50.0)
        # Go to 2 first
        s.post(f"{API}/vip/buy", json={"wallet": w, "target_level": 2})
        # Try 2 again
        r = s.post(f"{API}/vip/buy", json={"wallet": w, "target_level": 2})
        assert r.status_code == 400
        assert "greater" in r.json()["detail"].lower()
        # Try lower
        r2 = s.post(f"{API}/vip/buy", json={"wallet": w, "target_level": 1})
        assert r2.status_code == 400

    def test_vip_buy_insufficient_balance(self, s, mongo):
        w = _new_wallet("TEST_vippoor")
        _credit(mongo, w, 1.0)
        r = s.post(f"{API}/vip/buy", json={"wallet": w, "target_level": 5})
        assert r.status_code == 400
        assert "insufficient" in r.json()["detail"].lower()

    def test_vip_buy_target_31_returns_422(self, s):
        r = s.post(f"{API}/vip/buy", json={"wallet": "anything", "target_level": 31})
        assert r.status_code == 422

    def test_vip_buy_target_0_returns_422(self, s):
        r = s.post(f"{API}/vip/buy", json={"wallet": "anything", "target_level": 0})
        assert r.status_code == 422


# =================== Cleanup ===================
@pytest.fixture(scope="module", autouse=True)
def _cleanup_test_data(mongo):
    yield
    try:
        mongo.players.delete_many({"wallet": {"$regex": "^TEST_"}})
        mongo.deposits.delete_many({"wallet": {"$regex": "^TEST_"}})
        mongo.pack_purchases.delete_many({"wallet": {"$regex": "^TEST_"}})
        mongo.vip_purchases.delete_many({"wallet": {"$regex": "^TEST_"}})
    except Exception:
        pass
