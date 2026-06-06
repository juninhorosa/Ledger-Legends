"""Backend tests for Chronicles of TON - Telegram Mini App integration (iteration 2).

Scope:
- /api/telegram/auth        : HMAC-SHA256 initData validation
- /api/telegram/notify      : Bot API sendMessage forwarding
- /api/telegram/webhook/{secret}: secret check + /start handling
- /api/telegram/setup       : NOT actively executed (would mutate live webhook).
                              We only verify the route exists & is wired (preflight/method).

Reuses BASE_URL from REACT_APP_BACKEND_URL (frontend/.env).
"""
import os
import hmac
import hashlib
import json
import time
import uuid
from urllib.parse import urlencode

import pytest
import requests


def _load_base_url() -> str:
    url = os.environ.get('REACT_APP_BACKEND_URL')
    if not url:
        fe_env = '/app/frontend/.env'
        if os.path.exists(fe_env):
            with open(fe_env) as f:
                for line in f:
                    if line.startswith('REACT_APP_BACKEND_URL='):
                        url = line.split('=', 1)[1].strip().strip('"')
                        break
    return (url or '').rstrip('/')


def _load_env_value(key: str) -> str:
    be_env = '/app/backend/.env'
    if os.path.exists(be_env):
        with open(be_env) as f:
            for line in f:
                if line.startswith(f'{key}='):
                    return line.split('=', 1)[1].strip().strip('"')
    return ''


BASE_URL = _load_base_url()
API = f"{BASE_URL}/api"
BOT_TOKEN = _load_env_value('TELEGRAM_BOT_TOKEN')
WEBHOOK_SECRET = _load_env_value('TELEGRAM_WEBHOOK_SECRET') or 'chronicles-ton-webhook-secret-2026'


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _build_signed_init_data(bot_token: str, user: dict, auth_date: int | None = None) -> str:
    """Construct a properly HMAC-SHA256 signed Telegram initData string.

    auth_date: optional unix-seconds to use for the auth_date field; defaults to now().
    """
    auth_date_str = str(int(auth_date) if auth_date is not None else int(time.time()))
    fields = {
        "auth_date": auth_date_str,
        "query_id": f"AAH{uuid.uuid4().hex[:10]}",
        "user": json.dumps(user, separators=(",", ":")),
    }
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(fields.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    fields["hash"] = computed_hash
    return urlencode(fields)


# ---------------------------------------------------------------------------
# /api/telegram/auth
# ---------------------------------------------------------------------------
class TestTelegramAuth:
    def test_auth_with_invalid_init_data_returns_401(self, session):
        r = session.post(f"{API}/telegram/auth",
                         json={"init_data": "user=%7B%22id%22%3A42%7D&hash=deadbeef"})
        assert r.status_code == 401, r.text
        assert "Invalid" in r.text

    def test_auth_with_empty_init_data_returns_401(self, session):
        r = session.post(f"{API}/telegram/auth", json={"init_data": ""})
        assert r.status_code == 401, r.text

    def test_auth_with_missing_init_data_returns_422(self, session):
        # Pydantic validation: field required
        r = session.post(f"{API}/telegram/auth", json={})
        assert r.status_code in (422, 400), r.text

    def test_auth_with_random_garbage_returns_401(self, session):
        r = session.post(f"{API}/telegram/auth",
                         json={"init_data": "this-is-not-valid-querystring"})
        assert r.status_code == 401

    @pytest.mark.skipif(not BOT_TOKEN, reason="Bot token unavailable")
    def test_auth_with_valid_signed_init_data_returns_player(self, session):
        tg_id = 900000000 + int(time.time()) % 100000
        user = {"id": tg_id, "first_name": "TestHero", "username": "test_hero"}
        init_data = _build_signed_init_data(BOT_TOKEN, user)
        r = session.post(f"{API}/telegram/auth", json={"init_data": init_data})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["telegram_id"] == tg_id
        assert data["wallet"] == f"tg:{tg_id}"
        assert data["first_name"] == "TestHero"
        assert "player" in data
        assert data["player"]["wallet"] == f"tg:{tg_id}"
        # Player should be persisted - second call returns same wallet
        r2 = session.post(f"{API}/telegram/auth", json={"init_data": init_data})
        assert r2.status_code == 200
        assert r2.json()["wallet"] == f"tg:{tg_id}"

    @pytest.mark.skipif(not BOT_TOKEN, reason="Bot token unavailable")
    def test_auth_with_tampered_hash_returns_401(self, session):
        user = {"id": 12345, "first_name": "Tamper"}
        init_data = _build_signed_init_data(BOT_TOKEN, user)
        # Flip the hash
        tampered = init_data.rsplit("hash=", 1)[0] + "hash=" + ("0" * 64)
        r = session.post(f"{API}/telegram/auth", json={"init_data": tampered})
        assert r.status_code == 401

    # --- Iteration 3: freshness (replay-protection) check ---
    @pytest.mark.skipif(not BOT_TOKEN, reason="Bot token unavailable")
    def test_auth_with_stale_auth_date_returns_401(self, session):
        """initData with valid HMAC but auth_date older than 86400s (24h) must be rejected."""
        stale_ts = int(time.time()) - (86400 + 600)  # 24h + 10min ago
        user = {"id": 700000001, "first_name": "Stale"}
        init_data = _build_signed_init_data(BOT_TOKEN, user, auth_date=stale_ts)
        r = session.post(f"{API}/telegram/auth", json={"init_data": init_data})
        assert r.status_code == 401, r.text
        assert "Invalid" in r.text

    @pytest.mark.skipif(not BOT_TOKEN, reason="Bot token unavailable")
    def test_auth_with_fresh_auth_date_succeeds(self, session):
        """initData with valid HMAC AND auth_date within 24h must succeed."""
        fresh_ts = int(time.time()) - 60  # 1 min ago — clearly fresh
        tg_id = 800000000 + int(time.time()) % 100000
        user = {"id": tg_id, "first_name": "Fresh", "username": "fresh_user"}
        init_data = _build_signed_init_data(BOT_TOKEN, user, auth_date=fresh_ts)
        r = session.post(f"{API}/telegram/auth", json={"init_data": init_data})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["telegram_id"] == tg_id
        assert data["wallet"] == f"tg:{tg_id}"
        assert "player" in data and data["player"]["wallet"] == f"tg:{tg_id}"

    @pytest.mark.skipif(not BOT_TOKEN, reason="Bot token unavailable")
    def test_auth_boundary_just_inside_24h_succeeds(self, session):
        """auth_date just under 24h old should still be accepted."""
        ts = int(time.time()) - (86400 - 600)  # 23h50m ago
        tg_id = 850000000 + int(time.time()) % 100000
        user = {"id": tg_id, "first_name": "Edge"}
        init_data = _build_signed_init_data(BOT_TOKEN, user, auth_date=ts)
        r = session.post(f"{API}/telegram/auth", json={"init_data": init_data})
        assert r.status_code == 200, r.text


# ---------------------------------------------------------------------------
# /api/telegram/notify   (iteration 3: signature changed)
#   New body: {init_data: str, text: str, parse_mode?: str}
#   chat_id is derived server-side from the verified user.id (no spoofing).
# ---------------------------------------------------------------------------
class TestTelegramNotify:
    def test_notify_old_signature_telegram_id_field_returns_422(self, session):
        """Old payload {telegram_id, text} must now FAIL validation since
        `telegram_id` was removed and `init_data` is required."""
        r = session.post(f"{API}/telegram/notify",
                         json={"telegram_id": 1, "text": "hello from old client"})
        assert r.status_code == 422, r.text
        body = r.json()
        # FastAPI validation envelope
        assert "detail" in body
        # The missing required field should be init_data
        detail_str = json.dumps(body["detail"])
        assert "init_data" in detail_str

    def test_notify_missing_init_data_returns_422(self, session):
        r = session.post(f"{API}/telegram/notify", json={"text": "hi"})
        assert r.status_code == 422, r.text

    def test_notify_invalid_init_data_returns_401(self, session):
        r = session.post(f"{API}/telegram/notify",
                         json={"init_data": "user=%7B%22id%22%3A42%7D&hash=deadbeef",
                               "text": "spam attempt"})
        assert r.status_code == 401, r.text
        assert "Invalid" in r.text

    def test_notify_empty_init_data_returns_401(self, session):
        r = session.post(f"{API}/telegram/notify",
                         json={"init_data": "", "text": "spam attempt"})
        assert r.status_code == 401, r.text

    @pytest.mark.skipif(not BOT_TOKEN, reason="Bot token unavailable")
    def test_notify_with_stale_init_data_returns_401(self, session):
        """Stale (>24h) initData must also be rejected by notify endpoint."""
        stale_ts = int(time.time()) - (86400 + 600)
        user = {"id": 42, "first_name": "Stale"}
        init_data = _build_signed_init_data(BOT_TOKEN, user, auth_date=stale_ts)
        r = session.post(f"{API}/telegram/notify",
                         json={"init_data": init_data, "text": "ping"})
        assert r.status_code == 401, r.text

    @pytest.mark.skipif(not BOT_TOKEN, reason="Bot token unavailable")
    def test_notify_with_valid_init_data_forwards_to_bot_api(self, session):
        """With a valid signed initData, the proxy should call Bot API sendMessage
        using the verified user's id as chat_id (not an arbitrary one).
        We use a fake user id so Bot API returns ok=false but the envelope must
        come through with status 200 from our backend."""
        user = {"id": 1, "first_name": "Notify"}  # id=1 is unreachable → ok:false
        init_data = _build_signed_init_data(BOT_TOKEN, user)
        r = session.post(f"{API}/telegram/notify",
                         json={"init_data": init_data, "text": "hello from test",
                               "parse_mode": "HTML"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "ok" in data, f"Expected Telegram API envelope, got: {data}"
        if data.get("ok") is False:
            assert "description" in data or "error_code" in data


# ---------------------------------------------------------------------------
# /api/telegram/webhook/{secret}
# ---------------------------------------------------------------------------
class TestTelegramWebhook:
    def test_webhook_wrong_secret_returns_403(self, session):
        r = session.post(f"{API}/telegram/webhook/wrong-secret",
                         json={"update_id": 1})
        assert r.status_code == 403, r.text

    def test_webhook_correct_secret_returns_ok(self, session):
        r = session.post(f"{API}/telegram/webhook/{WEBHOOK_SECRET}",
                         json={"update_id": 1})
        assert r.status_code == 200, r.text
        assert r.json() == {"ok": True}

    def test_webhook_with_empty_payload_handled(self, session):
        r = session.post(f"{API}/telegram/webhook/{WEBHOOK_SECRET}",
                         json={})
        assert r.status_code == 200
        assert r.json() == {"ok": True}

    def test_webhook_start_command_triggers_send_message(self, session):
        # /start should attempt sendMessage. Fake chat_id => Telegram returns
        # ok=false but our endpoint must not raise — it should still return {ok:true}.
        payload = {
            "update_id": 1001,
            "message": {
                "message_id": 1,
                "from": {"id": 42, "first_name": "X"},
                "chat": {"id": 42, "type": "private"},
                "date": int(time.time()),
                "text": "/start",
            },
        }
        r = session.post(f"{API}/telegram/webhook/{WEBHOOK_SECRET}", json=payload)
        assert r.status_code == 200, r.text
        assert r.json() == {"ok": True}

    def test_webhook_help_command_handled(self, session):
        payload = {
            "update_id": 1002,
            "message": {
                "message_id": 2,
                "from": {"id": 42, "first_name": "X"},
                "chat": {"id": 42, "type": "private"},
                "date": int(time.time()),
                "text": "/help",
            },
        }
        r = session.post(f"{API}/telegram/webhook/{WEBHOOK_SECRET}", json=payload)
        assert r.status_code == 200
        assert r.json() == {"ok": True}

    def test_webhook_unknown_text_handled(self, session):
        payload = {
            "update_id": 1003,
            "message": {
                "message_id": 3,
                "chat": {"id": 42, "type": "private"},
                "date": int(time.time()),
                "text": "hello",
            },
        }
        r = session.post(f"{API}/telegram/webhook/{WEBHOOK_SECRET}", json=payload)
        assert r.status_code == 200
        assert r.json() == {"ok": True}


# ---------------------------------------------------------------------------
# /api/telegram/setup  -- DO NOT EXECUTE (it mutates the live webhook URL).
# We just verify the route exists & responds (a successful call is acceptable
# but we keep this opt-in via env var to avoid side effects on every test run).
# ---------------------------------------------------------------------------
class TestTelegramSetup:
    @pytest.mark.skipif(
        os.environ.get("RUN_TELEGRAM_SETUP") != "1",
        reason="Skipped to avoid mutating the live Telegram webhook. "
               "Set RUN_TELEGRAM_SETUP=1 to actually execute.",
    )
    def test_setup_returns_three_api_responses(self, session):
        r = session.post(f"{API}/telegram/setup")
        assert r.status_code == 200, r.text
        data = r.json()
        for key in ("setWebhook", "setChatMenuButton", "setMyCommands"):
            assert key in data, f"Missing {key} in setup response: {data}"
            assert data[key].get("ok") is True, f"{key} returned not-ok: {data[key]}"

    def test_setup_route_is_registered(self, session):
        # OPTIONS / unallowed method should still be handled by the router,
        # proving the path is registered (not 404).
        r = session.get(f"{API}/telegram/setup")  # wrong method
        assert r.status_code in (405, 200), r.text
