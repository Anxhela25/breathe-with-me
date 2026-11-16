from datetime import datetime, timezone

import pytest

from tests.helpers import CONSENT, PASSWORD, auth_header, last_code


def _register(client, email="maria@example.com"):
    return auth_header(client, email)


def _start(client, email="new@example.com", password=PASSWORD):
    return client.post("/api/auth/register/start", json={"email": email, "password": password})


def _finish(client, code, email="new@example.com", password=PASSWORD, **extra):
    return client.post("/api/auth/register", json={"email": email, "password": password, "code": code, **CONSENT, **extra})


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_register_rejects_email_domain_without_mail_servers(client, monkeypatch):
    from email_validator import EmailUndeliverableError
    from app.services import email_check

    def no_mail_servers(email, **kwargs):
        raise EmailUndeliverableError("The domain name gmail.con does not exist.")

    monkeypatch.setattr(email_check.settings, "check_email_domain", True)
    monkeypatch.setattr(email_check, "validate_email", no_mail_servers)
    r = _start(client, "maria@gmail.con")
    assert r.status_code == 422 and "can't receive emails" in r.json()["detail"]
    assert client.outbox == []


def test_sign_up_sends_a_code_and_needs_it(client):
    assert _start(client).status_code == 202
    to, _, text = client.outbox[-1]
    assert to == "new@example.com" and "finish creating your account" in text
    code = last_code(client)
    wrong = "000000" if code != "000000" else "111111"
    assert _finish(client, wrong).status_code == 400
    assert client.post("/api/auth/login", json={"email": "new@example.com", "password": PASSWORD}).status_code == 401
    assert _finish(client, code).status_code == 201


def test_sign_up_without_asking_for_a_code_fails(client):
    assert _finish(client, "123456").status_code == 400


def test_sign_up_code_belongs_to_its_email(client):
    _start(client)
    assert _finish(client, last_code(client), email="someone-else@example.com").status_code == 400


def test_sign_up_code_works_once_and_only_the_newest(client):
    _start(client)
    first = last_code(client)
    _start(client)
    second = last_code(client)
    if first != second:
        assert _finish(client, first).status_code == 400
    assert _finish(client, second).status_code == 201
    assert _finish(client, second).status_code == 409  # the account exists now


def test_five_wrong_sign_up_codes_cancel_the_code(client):
    _start(client)
    code = last_code(client)
    wrong = "000000" if code != "000000" else "111111"
    for _ in range(5):
        _finish(client, wrong)
    assert _finish(client, code).status_code == 400


def test_at_most_three_sign_up_codes_per_hour(client):
    for _ in range(3):
        assert _start(client).status_code == 202
    assert _start(client).status_code == 429
    assert len(client.outbox) == 3


def test_register_login_and_me(client):
    _register(client)
    assert _start(client, "maria@example.com").status_code == 409
    assert client.post("/api/auth/login", json={"email": "maria@example.com", "password": "wrong-pass"}).status_code == 401
    token = client.post("/api/auth/login", json={"email": "Maria@Example.com", "password": "quiet-river-lamp"}).json()["access_token"]
    me = client.get("/api/me", headers={"Authorization": f"Bearer {token}"}).json()
    assert me["email"] == "maria@example.com" and "save_chat_texts" not in me


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
    _start(client)
    code = last_code(client)
    assert _finish(client, code, **{missing: False}).status_code == 422
    body = {"email": "new@example.com", "password": PASSWORD, "code": code, **CONSENT}
    body.pop(missing)
    assert client.post("/api/auth/register", json=body).status_code == 422
    assert _finish(client, code).status_code == 201  # the code wasn't used up by the refused attempts


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
