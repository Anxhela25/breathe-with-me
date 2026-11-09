from datetime import datetime, timezone

import pytest

CONSENT = {"is_adult": True, "health_data_consent": True}


def _register(client, email="maria@example.com"):
    r = client.post("/api/auth/register", json={"email": email, "password": "quiet-river-lamp", **CONSENT})
    assert r.status_code == 201
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_register_login_and_me(client):
    _register(client)
    assert client.post("/api/auth/register",
                       json={"email": "maria@example.com", "password": "quiet-river-lamp", **CONSENT}).status_code == 409
    assert client.post("/api/auth/login", json={"email": "maria@example.com", "password": "wrong-pass"}).status_code == 401
    token = client.post("/api/auth/login", json={"email": "Maria@Example.com", "password": "quiet-river-lamp"}).json()["access_token"]
    me = client.get("/api/me", headers={"Authorization": f"Bearer {token}"}).json()
    assert me["email"] == "maria@example.com" and me["save_chat_texts"] is False


def test_episode_flow_and_privacy(client):
    h = _register(client)
    ep = client.post("/api/episodes", json={"start_level": 7}, headers=h).json()
    r = client.patch(f"/api/episodes/{ep['id']}", headers=h,
                     json={"end_level": 3, "place": "work", "sleep": "little", "finished": True})
    assert r.status_code == 200 and r.json()["ended_at"] is not None
    assert client.patch(f"/api/episodes/{ep['id']}", headers=h, json={"end_level": 11}).status_code == 422

    other = _register(client, "other@example.com")
    assert client.patch(f"/api/episodes/{ep['id']}", headers=other, json={"note": "x"}).status_code == 404
    assert client.get("/api/episodes", headers=other).json() == []
    assert len(client.get("/api/episodes", headers=h).json()) == 1


def test_episode_keeps_real_start_time_and_crisis_flag(client):
    h = _register(client)
    ep = client.post("/api/episodes", headers=h,
                     json={"start_level": 9, "started_at": "2026-11-09T08:00:00Z"}).json()
    assert datetime.fromisoformat(ep["started_at"]) == datetime(2026, 11, 9, 8, 0, tzinfo=timezone.utc)
    r = client.patch(f"/api/episodes/{ep['id']}", headers=h, json={"crisis_shown": True})
    assert r.json()["crisis_shown"] is True
    future = client.post("/api/episodes", headers=h, json={"started_at": "2099-01-01T00:00:00Z"})
    assert future.status_code == 422


@pytest.mark.parametrize("missing", ["is_adult", "health_data_consent"])
def test_register_needs_adult_and_consent(client, missing):
    body = {"email": "new@example.com", "password": "quiet-river-lamp", **CONSENT, missing: False}
    assert client.post("/api/auth/register", json=body).status_code == 422
    body.pop(missing)
    assert client.post("/api/auth/register", json=body).status_code == 422


def test_consent_time_is_stored(client):
    _register(client)
    from app.database import SessionLocal
    from app.models import User
    with SessionLocal() as db:
        user = db.query(User).one()
        assert user.adult_confirmed_at is not None and user.health_data_consent_at is not None


def test_episode_expected_and_with_someone(client):
    h = _register(client)
    ep = client.post("/api/episodes", json={}, headers=h).json()
    r = client.patch(f"/api/episodes/{ep['id']}", headers=h, json={"expected": False, "with_someone": True})
    assert r.json()["expected"] is False and r.json()["with_someone"] is True


def test_delete_all_my_data(client):
    h = _register(client)
    client.post("/api/episodes", json={"start_level": 5}, headers=h)
    assert client.delete("/api/me", headers=h).status_code == 204
    assert client.get("/api/me", headers=h).status_code == 401


def test_safety_endpoint(client):
    assert client.post("/api/safety/check", json={"text": "I can't go on"}).json() == {"level": "crisis"}
