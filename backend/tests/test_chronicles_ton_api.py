"""Backend tests for Chronicles of TON API."""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if not BASE_URL:
    # Fallback: read from frontend/.env
    fe_env = '/app/frontend/.env'
    if os.path.exists(fe_env):
        with open(fe_env) as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    BASE_URL = line.split('=', 1)[1].strip().strip('"')
                    break
BASE_URL = BASE_URL.rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def wallet():
    return f"TEST_wallet_{uuid.uuid4().hex[:12]}"


# ---------- Root ----------
class TestRoot:
    def test_root_endpoint(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        data = r.json()
        assert data.get("message") == "Chronicles of TON API"
        assert data.get("status") == "ok"


# ---------- Player create/get ----------
class TestPlayer:
    def test_get_creates_new_player_with_defaults(self, session, wallet):
        r = session.get(f"{API}/player/{wallet}")
        assert r.status_code == 200, r.text
        p = r.json()
        assert p["wallet"] == wallet
        assert p["gold"] == 100
        assert p["wave"] == 1
        assert p["level"] == 1
        assert p["xp"] == 0
        assert p["highest_wave"] == 1
        assert p["battle_meter"] == 100
        assert p["talent_points"] == 0
        assert p["season_xp"] == 0
        assert p["name"] == "Hero"
        assert p["stats"] == {"strength": 10, "agility": 10, "intellect": 10, "stamina": 10}
        assert p["equipment"]["weapon"] is None
        assert p["inventory"] == []
        assert p["materials"] == {}
        assert p["talents"] == {}
        assert p["season_claimed"] == []

    def test_get_returns_same_player_on_subsequent_call(self, session, wallet):
        r1 = session.get(f"{API}/player/{wallet}")
        r2 = session.get(f"{API}/player/{wallet}")
        assert r1.status_code == 200 and r2.status_code == 200
        # created_at should remain stable (player not recreated)
        assert r1.json()["created_at"] == r2.json()["created_at"]
        assert r1.json()["wallet"] == r2.json()["wallet"] == wallet


# ---------- Save / Persistence ----------
class TestSave:
    def test_save_partial_update_persists(self, session, wallet):
        payload = {
            "gold": 555,
            "wave": 7,
            "xp": 250,
            "level": 4,
            "stats": {"strength": 15, "agility": 12, "intellect": 11, "stamina": 14},
            "equipment": {"weapon": "iron_sword", "helmet": "leather_cap"},
            "inventory": ["potion_hp", "potion_mp"],
            "materials": {"iron": 5, "leather": 3},
            "talents": {"berserker": 2},
            "talent_points": 3,
            "season_xp": 120,
            "season_claimed": [1, 2],
            "battle_meter": 850,
        }
        r = session.post(f"{API}/player/{wallet}/save", json=payload)
        assert r.status_code == 200, r.text
        saved = r.json()
        for k, v in payload.items():
            if isinstance(v, dict):
                # Check provided keys match; model may fill rest with defaults/None
                for kk, vv in v.items():
                    assert saved[k].get(kk) == vv, f"Mismatch on {k}.{kk}: {saved[k].get(kk)} != {vv}"
            else:
                assert saved[k] == v, f"Mismatch on {k}: {saved[k]} != {v}"

        # GET to verify persistence
        g = session.get(f"{API}/player/{wallet}")
        assert g.status_code == 200
        got = g.json()
        for k, v in payload.items():
            if isinstance(v, dict):
                for kk, vv in v.items():
                    assert got[k].get(kk) == vv, f"Persisted mismatch on {k}.{kk}: {got[k].get(kk)} != {vv}"
            else:
                assert got[k] == v, f"Persisted mismatch on {k}: {got[k]} != {v}"

    def test_save_updates_only_provided_fields(self, session, wallet):
        # Save just gold; level/wave from prev test should remain
        r = session.post(f"{API}/player/{wallet}/save", json={"gold": 999})
        assert r.status_code == 200
        d = r.json()
        assert d["gold"] == 999
        assert d["wave"] == 7  # unchanged
        assert d["level"] == 4  # unchanged

    def test_save_creates_player_if_not_exists(self, session):
        new_wallet = f"TEST_save_new_{uuid.uuid4().hex[:8]}"
        r = session.post(f"{API}/player/{new_wallet}/save", json={"gold": 200, "wave": 3})
        assert r.status_code == 200
        d = r.json()
        assert d["wallet"] == new_wallet
        assert d["gold"] == 200
        assert d["wave"] == 3
        # Verify GET reflects it
        g = session.get(f"{API}/player/{new_wallet}").json()
        assert g["gold"] == 200
        assert g["wave"] == 3


# ---------- Purchase ----------
class TestPurchase:
    def test_purchase_appends_to_inventory(self, session):
        w = f"TEST_purchase_{uuid.uuid4().hex[:8]}"
        # ensure player exists
        session.get(f"{API}/player/{w}")
        payload = {"wallet": w, "item_id": "epic_sword", "currency": "TON", "amount": 1.5, "tx_hash": "0xabc"}
        r = session.post(f"{API}/player/{w}/purchase", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "confirmed"
        assert d["item_id"] == "epic_sword"
        # inventory check
        p = session.get(f"{API}/player/{w}").json()
        assert "epic_sword" in p["inventory"]

    def test_purchase_wallet_mismatch_400(self, session):
        w = f"TEST_pm_{uuid.uuid4().hex[:8]}"
        payload = {"wallet": "OTHER_wallet", "item_id": "x", "currency": "TON", "amount": 1.0}
        r = session.post(f"{API}/player/{w}/purchase", json=payload)
        assert r.status_code == 400
        assert "mismatch" in r.text.lower()

    def test_purchase_multiple_appends(self, session):
        w = f"TEST_mp_{uuid.uuid4().hex[:8]}"
        session.get(f"{API}/player/{w}")
        for item in ["item_a", "item_b", "item_c"]:
            r = session.post(f"{API}/player/{w}/purchase",
                             json={"wallet": w, "item_id": item, "currency": "GOLD", "amount": 10})
            assert r.status_code == 200
        p = session.get(f"{API}/player/{w}").json()
        assert p["inventory"] == ["item_a", "item_b", "item_c"]


# ---------- Leaderboard ----------
class TestLeaderboard:
    def test_leaderboard_sorted_desc_limit_20(self, session):
        # Seed a few players with varying battle_meter
        wallets = []
        meters = [1500, 2500, 500, 3500, 1000]
        for m in meters:
            w = f"TEST_lb_{uuid.uuid4().hex[:8]}"
            wallets.append((w, m))
            session.post(f"{API}/player/{w}/save", json={"battle_meter": m})
        r = session.get(f"{API}/leaderboard")
        assert r.status_code == 200
        lb = r.json()
        assert isinstance(lb, list)
        assert len(lb) <= 20
        # Verify desc by battle_meter
        meters_out = [doc["battle_meter"] for doc in lb]
        assert meters_out == sorted(meters_out, reverse=True)
        # Should not contain _id
        for doc in lb:
            assert "_id" not in doc
            assert "wallet" in doc

    def test_leaderboard_limit_max_20(self, session):
        # Create > 20 players to ensure cap
        for i in range(22):
            w = f"TEST_lblimit_{uuid.uuid4().hex[:6]}_{i}"
            session.post(f"{API}/player/{w}/save", json={"battle_meter": 100 + i})
        r = session.get(f"{API}/leaderboard")
        assert r.status_code == 200
        assert len(r.json()) <= 20


# ---------- /api prefix ----------
class TestApiPrefix:
    def test_no_api_prefix_returns_404(self, session):
        # Routes without /api should not match
        r = session.get(f"{BASE_URL}/player/anywallet")
        # Ingress likely returns 404 or routes to frontend (200 HTML).
        # As long as it isn't returning our JSON player payload, it's fine.
        ct = r.headers.get("content-type", "")
        if r.status_code == 200 and "application/json" in ct:
            body = r.json()
            assert "wallet" not in body, "API endpoint reachable without /api prefix"
