"""Backend tests for Chronicles of TON — Phase 3 (Market) + Phase 4 (Withdrawals + Admin).

Scope (per review_request):
- POST /api/market/sell  (tax tiers based on vip_level)
- POST /api/withdraw/request, GET /api/withdrawals/{wallet}
- GET /api/admin/check/{id}
- GET /api/admin/withdrawals?admin_id&status
- POST /api/admin/withdrawals/{wid}/approve  (no refund)
- POST /api/admin/withdrawals/{wid}/reject  (refund ton_balance)
"""
import os
import uuid

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

MONGO_URL = None
DB_NAME = None
ADMIN_IDS_ENV = ""
with open('/app/backend/.env') as f:
    for line in f:
        if line.startswith('MONGO_URL='):
            MONGO_URL = line.split('=', 1)[1].strip().strip('"')
        elif line.startswith('DB_NAME='):
            DB_NAME = line.split('=', 1)[1].strip().strip('"')
        elif line.startswith('ADMIN_TELEGRAM_IDS='):
            ADMIN_IDS_ENV = line.split('=', 1)[1].strip().strip('"')

ADMIN_ID = 6170049742
NON_ADMIN_ID = 1111111


def _new_wallet(prefix="TEST_p34"):
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


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


@pytest.fixture(scope="module", autouse=True)
def cleanup(mongo):
    yield
    for coll in ("players", "market_sales", "withdrawals"):
        mongo[coll].delete_many({"wallet": {"$regex": "^TEST_p34"}})


def _seed_player(s, mongo, wallet, *, ton_balance=0.0, vip_level=0, inventory=None):
    # auto-create
    r = s.get(f"{API}/player/{wallet}")
    assert r.status_code == 200, r.text
    upd = {"ton_balance": float(ton_balance), "vip_level": int(vip_level)}
    if inventory is not None:
        upd["inventory"] = list(inventory)
    mongo.players.update_one({"wallet": wallet}, {"$set": upd})


# =====================================================================
# Phase 3 — Market Sell (tax tiers)
# =====================================================================
class TestMarketSell:
    @pytest.mark.parametrize("vip_level,expected_tax", [(0, 20), (1, 10), (5, 10), (20, 8), (30, 5)])
    def test_sell_tax_by_vip(self, s, mongo, vip_level, expected_tax):
        wallet = _new_wallet()
        _seed_player(s, mongo, wallet, vip_level=vip_level,
                     inventory=["rune_blade", "iron_sword"])
        # Snapshot current gold
        before = mongo.players.find_one({"wallet": wallet})
        gold_before = int(before.get("gold", 0))

        sell_price = 1000
        r = s.post(f"{API}/market/sell", json={"wallet": wallet, "inv_index": 0, "sell_price": sell_price})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["tax_pct"] == expected_tax, f"vip={vip_level} expected tax={expected_tax}, got {data['tax_pct']}"
        expected_net = int(sell_price * (100 - expected_tax) / 100)
        assert data["net_gold"] == expected_net
        assert data["gross_gold"] == sell_price
        assert data["tax_gold"] == sell_price - expected_net
        assert data["item_id"] == "rune_blade"
        assert data["vip_level"] == vip_level

        # Verify inventory item removed (index 0)
        after = mongo.players.find_one({"wallet": wallet})
        assert after["inventory"] == ["iron_sword"]
        # Verify gold credited
        assert int(after["gold"]) == gold_before + expected_net
        # Verify market_sales audit row
        sale = mongo.market_sales.find_one({"wallet": wallet})
        assert sale is not None
        assert sale["tax_pct"] == expected_tax
        assert sale["net_gold"] == expected_net
        assert sale["item_id"] == "rune_blade"

    def test_invalid_inv_index_returns_400(self, s, mongo):
        wallet = _new_wallet()
        _seed_player(s, mongo, wallet, inventory=["only_item"])
        r = s.post(f"{API}/market/sell", json={"wallet": wallet, "inv_index": 5, "sell_price": 100})
        assert r.status_code == 400, r.text

    def test_unknown_wallet_returns_404(self, s):
        r = s.post(f"{API}/market/sell", json={"wallet": "TEST_p34_doesnotexist_xyz", "inv_index": 0, "sell_price": 100})
        assert r.status_code == 404, r.text


# =====================================================================
# Phase 4 — Withdraw + Admin
# =====================================================================
class TestWithdrawRequest:
    def test_request_atomic_debit_creates_pending(self, s, mongo):
        wallet = _new_wallet()
        _seed_player(s, mongo, wallet, ton_balance=10.0)
        r = s.post(f"{API}/withdraw/request", json={
            "wallet": wallet, "amount_ton": 3.5, "to_address": "UQCabcdefghijklmnop123"
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "pending"
        assert data["amount_ton"] == 3.5
        wid = data["withdrawal_id"]

        # Balance held (debited immediately)
        p = mongo.players.find_one({"wallet": wallet})
        assert abs(float(p["ton_balance"]) - 6.5) < 1e-6

        # Withdrawal stored as pending
        w = mongo.withdrawals.find_one({"id": wid})
        assert w["status"] == "pending"
        assert w["wallet"] == wallet
        assert w["amount_ton"] == 3.5
        assert w["to_address"] == "UQCabcdefghijklmnop123"

    def test_insufficient_balance_returns_400(self, s, mongo):
        wallet = _new_wallet()
        _seed_player(s, mongo, wallet, ton_balance=1.0)
        r = s.post(f"{API}/withdraw/request", json={
            "wallet": wallet, "amount_ton": 5.0, "to_address": "UQCabcdefghijklmnop123"
        })
        assert r.status_code == 400, r.text

    def test_unknown_wallet_returns_404(self, s):
        r = s.post(f"{API}/withdraw/request", json={
            "wallet": "TEST_p34_nope_xyz", "amount_ton": 1.0, "to_address": "UQCabcdefghijklmnop123"
        })
        assert r.status_code == 404, r.text

    def test_history_sorted_desc(self, s, mongo):
        wallet = _new_wallet()
        _seed_player(s, mongo, wallet, ton_balance=10.0)
        for amt in (1.0, 2.0, 3.0):
            r = s.post(f"{API}/withdraw/request", json={
                "wallet": wallet, "amount_ton": amt, "to_address": "UQCabcdefghijklmnop123"
            })
            assert r.status_code == 200, r.text
        r = s.get(f"{API}/withdrawals/{wallet}")
        assert r.status_code == 200
        items = r.json()
        assert len(items) == 3
        ts = [it["created_at"] for it in items]
        assert ts == sorted(ts, reverse=True), "withdrawals must be sorted desc by created_at"
        # newest first → amount 3.0
        assert items[0]["amount_ton"] == 3.0


class TestAdminCheck:
    def test_admin_true(self, s):
        r = s.get(f"{API}/admin/check/{ADMIN_ID}")
        assert r.status_code == 200
        assert r.json() == {"is_admin": True}

    def test_admin_false(self, s):
        r = s.get(f"{API}/admin/check/{NON_ADMIN_ID}")
        assert r.status_code == 200
        assert r.json() == {"is_admin": False}


class TestAdminListWithdrawals:
    def test_list_pending_as_admin(self, s, mongo):
        wallet = _new_wallet()
        _seed_player(s, mongo, wallet, ton_balance=5.0)
        r = s.post(f"{API}/withdraw/request", json={
            "wallet": wallet, "amount_ton": 2.0, "to_address": "UQCabcdefghijklmnop123"
        })
        assert r.status_code == 200
        wid = r.json()["withdrawal_id"]

        r = s.get(f"{API}/admin/withdrawals", params={"admin_id": ADMIN_ID, "status": "pending"})
        assert r.status_code == 200
        ids = [w["id"] for w in r.json()]
        assert wid in ids

    def test_list_non_admin_403(self, s):
        r = s.get(f"{API}/admin/withdrawals", params={"admin_id": NON_ADMIN_ID, "status": "pending"})
        assert r.status_code == 403


class TestAdminApprove:
    def test_approve_no_refund(self, s, mongo):
        wallet = _new_wallet()
        _seed_player(s, mongo, wallet, ton_balance=10.0)
        r = s.post(f"{API}/withdraw/request", json={
            "wallet": wallet, "amount_ton": 4.0, "to_address": "UQCabcdefghijklmnop123"
        })
        wid = r.json()["withdrawal_id"]
        bal_after_request = float(mongo.players.find_one({"wallet": wallet})["ton_balance"])
        assert abs(bal_after_request - 6.0) < 1e-6

        r2 = s.post(f"{API}/admin/withdrawals/{wid}/approve", json={
            "admin_id": ADMIN_ID, "tx_hash": "0xdeadbeef", "note": "paid"
        })
        assert r2.status_code == 200, r2.text
        assert r2.json()["status"] == "approved"

        w = mongo.withdrawals.find_one({"id": wid})
        assert w["status"] == "approved"
        assert w["admin_id"] == ADMIN_ID
        assert w["tx_hash"] == "0xdeadbeef"
        assert w["admin_note"] == "paid"
        assert w["decided_at"] is not None

        # No refund: balance unchanged from post-request state
        bal_now = float(mongo.players.find_one({"wallet": wallet})["ton_balance"])
        assert abs(bal_now - 6.0) < 1e-6

    def test_approve_non_admin_403(self, s, mongo):
        wallet = _new_wallet()
        _seed_player(s, mongo, wallet, ton_balance=5.0)
        wid = s.post(f"{API}/withdraw/request", json={
            "wallet": wallet, "amount_ton": 1.0, "to_address": "UQCabcdefghijklmnop123"
        }).json()["withdrawal_id"]
        r = s.post(f"{API}/admin/withdrawals/{wid}/approve", json={"admin_id": NON_ADMIN_ID})
        assert r.status_code == 403

    def test_approve_not_found_404(self, s):
        r = s.post(f"{API}/admin/withdrawals/nonexistent-id-xyz/approve", json={"admin_id": ADMIN_ID})
        assert r.status_code == 404

    def test_approve_already_approved_400(self, s, mongo):
        wallet = _new_wallet()
        _seed_player(s, mongo, wallet, ton_balance=5.0)
        wid = s.post(f"{API}/withdraw/request", json={
            "wallet": wallet, "amount_ton": 1.0, "to_address": "UQCabcdefghijklmnop123"
        }).json()["withdrawal_id"]
        # First approval succeeds
        r1 = s.post(f"{API}/admin/withdrawals/{wid}/approve", json={"admin_id": ADMIN_ID})
        assert r1.status_code == 200
        # Second approval fails
        r2 = s.post(f"{API}/admin/withdrawals/{wid}/approve", json={"admin_id": ADMIN_ID})
        assert r2.status_code == 400


class TestAdminReject:
    def test_reject_refunds_balance(self, s, mongo):
        wallet = _new_wallet()
        _seed_player(s, mongo, wallet, ton_balance=10.0)
        r = s.post(f"{API}/withdraw/request", json={
            "wallet": wallet, "amount_ton": 4.0, "to_address": "UQCabcdefghijklmnop123"
        })
        wid = r.json()["withdrawal_id"]
        bal_after = float(mongo.players.find_one({"wallet": wallet})["ton_balance"])
        assert abs(bal_after - 6.0) < 1e-6

        r2 = s.post(f"{API}/admin/withdrawals/{wid}/reject", json={
            "admin_id": ADMIN_ID, "note": "invalid address"
        })
        assert r2.status_code == 200, r2.text
        body = r2.json()
        assert body["status"] == "rejected"
        assert abs(float(body["refunded_ton"]) - 4.0) < 1e-6

        # Balance refunded back to 10.0
        bal_refunded = float(mongo.players.find_one({"wallet": wallet})["ton_balance"])
        assert abs(bal_refunded - 10.0) < 1e-6

        w = mongo.withdrawals.find_one({"id": wid})
        assert w["status"] == "rejected"
        assert w["admin_note"] == "invalid address"

    def test_reject_non_admin_403(self, s, mongo):
        wallet = _new_wallet()
        _seed_player(s, mongo, wallet, ton_balance=5.0)
        wid = s.post(f"{API}/withdraw/request", json={
            "wallet": wallet, "amount_ton": 1.0, "to_address": "UQCabcdefghijklmnop123"
        }).json()["withdrawal_id"]
        r = s.post(f"{API}/admin/withdrawals/{wid}/reject", json={"admin_id": NON_ADMIN_ID})
        assert r.status_code == 403
