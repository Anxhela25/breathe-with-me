# Access token 1h, refresh token 90 days, rotated on every use.
from datetime import datetime, timedelta, timezone

import jwt

from app.config import settings
from app.database import SessionLocal
from app.models import RefreshToken
from app.services import tokens
from tests.helpers import PASSWORD, last_code, sign_up


def login(client, email="maria@example.com"):
    sign_up(client, email)
    r = client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert r.status_code == 200
    return r.json()


def refresh(client, key):
    return client.post("/api/auth/refresh", json={"refresh_token": key})


def me(client, access):
    return client.get("/api/me", headers={"Authorization": f"Bearer {access}"})


def test_login_gives_a_one_hour_access_key_and_a_refresh_key(client):
    keys = login(client)
    claims = jwt.decode(keys["access_token"], settings.jwt_secret, algorithms=["HS256"])
    minutes = (claims["exp"] - datetime.now(timezone.utc).timestamp()) / 60
    assert 59 < minutes <= 60 and len(keys["refresh_token"]) > 30


def test_refresh_key_is_stored_only_as_a_hash(client):
    keys = login(client)
    with SessionLocal() as db:
        hashes = [row.token_hash for row in db.query(RefreshToken)]
    assert tokens._hash(keys["refresh_token"]) in hashes and keys["refresh_token"] not in hashes


def test_refresh_gives_new_keys_that_work(client):
    keys = login(client)
    new = refresh(client, keys["refresh_token"]).json()
    assert new["refresh_token"] != keys["refresh_token"]
    assert me(client, new["access_token"]).status_code == 200


def test_refresh_key_lasts_90_days_from_its_last_use(client):
    keys = login(client)
    new = refresh(client, keys["refresh_token"]).json()
    with SessionLocal() as db:
        row = db.query(RefreshToken).filter_by(token_hash=tokens._hash(new["refresh_token"])).one()
    days = (tokens._aware(row.expires_at) - datetime.now(timezone.utc)) / timedelta(days=1)
    assert 89.9 < days <= 90


def test_expired_refresh_key_is_refused(client):
    keys = login(client)
    with SessionLocal() as db:
        db.query(RefreshToken).update({"expires_at": datetime.now(timezone.utc) - timedelta(seconds=1)})
        db.commit()
    assert refresh(client, keys["refresh_token"]).status_code == 401


def test_retry_within_a_minute_is_not_treated_as_theft(client):
    # the server swapped the key but the phone never got the answer, so it sends the old one again
    keys = login(client)
    lost = refresh(client, keys["refresh_token"]).json()
    retry = refresh(client, keys["refresh_token"])
    assert retry.status_code == 200
    assert refresh(client, retry.json()["refresh_token"]).status_code == 200
    assert refresh(client, lost["refresh_token"]).status_code == 401  # the answer it missed is cancelled


def test_reused_old_key_logs_out_every_device(client):
    keys = login(client)
    new = refresh(client, keys["refresh_token"]).json()
    with SessionLocal() as db:  # the old key comes back later: someone copied it
        db.query(RefreshToken).filter(RefreshToken.revoked_at.isnot(None)).update(
            {"revoked_at": datetime.now(timezone.utc) - timedelta(minutes=5)})
        db.commit()
    assert refresh(client, keys["refresh_token"]).status_code == 401
    assert refresh(client, new["refresh_token"]).status_code == 401  # the real phone has to log in again too


def test_logout_cancels_the_refresh_key(client):
    keys = login(client)
    assert client.post("/api/auth/logout", json={"refresh_token": keys["refresh_token"]}).status_code == 204
    assert refresh(client, keys["refresh_token"]).status_code == 401


def test_logout_with_an_unknown_key_gives_the_same_answer(client):
    assert client.post("/api/auth/logout", json={"refresh_token": "x" * 43}).status_code == 204


def test_unknown_refresh_key_is_refused(client):
    assert refresh(client, "y" * 43).status_code == 401


def test_password_reset_logs_out_every_other_phone(client):
    keys = login(client)
    client.post("/api/auth/forgot-password", json={"email": "maria@example.com"})
    new_password = "another-quiet-river-lamp"
    r = client.post("/api/auth/reset-password",
                    json={"email": "maria@example.com", "code": last_code(client), "password": new_password})
    assert r.status_code == 200
    assert refresh(client, keys["refresh_token"]).status_code == 401
    assert refresh(client, r.json()["refresh_token"]).status_code == 200  # the phone that reset it stays in


def test_old_phone_after_password_reset_doesnt_log_out_the_new_one(client):
    keys = login(client)
    client.post("/api/auth/forgot-password", json={"email": "maria@example.com"})
    r = client.post("/api/auth/reset-password", json={
        "email": "maria@example.com", "code": last_code(client), "password": "another-quiet-river-lamp"})
    for _ in range(2):  # the old phone opens the app, twice
        assert refresh(client, keys["refresh_token"]).status_code == 401
    assert refresh(client, r.json()["refresh_token"]).status_code == 200


def test_deleting_the_account_deletes_its_keys(client):
    keys = login(client)
    client.delete("/api/me", headers={"Authorization": f"Bearer {keys['access_token']}"})
    with SessionLocal() as db:
        assert db.query(RefreshToken).count() == 0
