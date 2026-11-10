import re

from tests.helpers import auth_header

EMAIL = "maria@example.com"
OLD, NEW = "quiet-river-lamp", "green-window-cloud"


def _register(client):
    header = auth_header(client, EMAIL, OLD)
    client.outbox.clear()  # only the reset emails count from here
    return header


def _code(outbox):
    return re.search(r"\b(\d{6})\b", outbox[-1][2]).group(1)


def test_full_reset_flow(client, outbox):
    old_session = _register(client)
    r = client.post("/api/auth/forgot-password", json={"email": EMAIL})
    assert r.status_code == 202 and len(outbox) == 1
    to, subject, text = outbox[0]
    assert to == EMAIL and "panic" not in (subject + text).lower()  # nothing about health in the email

    r = client.post("/api/auth/reset-password", json={"email": EMAIL, "code": _code(outbox), "password": NEW})
    assert r.status_code == 200
    assert client.post("/api/auth/login", json={"email": EMAIL, "password": NEW}).status_code == 200
    assert client.post("/api/auth/login", json={"email": EMAIL, "password": OLD}).status_code == 401
    assert client.get("/api/me", headers=old_session).status_code == 401  # other devices are signed out


def test_same_answer_for_unknown_email(client, outbox):
    _register(client)
    known = client.post("/api/auth/forgot-password", json={"email": EMAIL})
    unknown = client.post("/api/auth/forgot-password", json={"email": "nobody@example.com"})
    assert known.status_code == unknown.status_code == 202 and known.json() == unknown.json()
    assert len(outbox) == 1


def test_code_works_once(client, outbox):
    _register(client)
    client.post("/api/auth/forgot-password", json={"email": EMAIL})
    code = _code(outbox)
    assert client.post("/api/auth/reset-password", json={"email": EMAIL, "code": code, "password": NEW}).status_code == 200
    again = client.post("/api/auth/reset-password", json={"email": EMAIL, "code": code, "password": "other-long-phrase"})
    assert again.status_code == 400


def test_five_wrong_codes_cancel_the_code(client, outbox):
    _register(client)
    client.post("/api/auth/forgot-password", json={"email": EMAIL})
    code = _code(outbox)
    wrong = "000000" if code != "000000" else "111111"
    for _ in range(5):
        assert client.post("/api/auth/reset-password", json={"email": EMAIL, "code": wrong, "password": NEW}).status_code == 400
    assert client.post("/api/auth/reset-password", json={"email": EMAIL, "code": code, "password": NEW}).status_code == 400


def test_only_the_newest_code_works(client, outbox):
    _register(client)
    client.post("/api/auth/forgot-password", json={"email": EMAIL})
    first = _code(outbox)
    client.post("/api/auth/forgot-password", json={"email": EMAIL})
    if first != _code(outbox):
        assert client.post("/api/auth/reset-password", json={"email": EMAIL, "code": first, "password": NEW}).status_code == 400


def test_at_most_three_codes_per_hour(client, outbox):
    _register(client)
    for _ in range(5):
        assert client.post("/api/auth/forgot-password", json={"email": EMAIL}).status_code == 202
    assert len(outbox) == 3


def test_new_password_follows_the_rules(client, outbox):
    _register(client)
    client.post("/api/auth/forgot-password", json={"email": EMAIL})
    r = client.post("/api/auth/reset-password", json={"email": EMAIL, "code": _code(outbox), "password": "short"})
    assert r.status_code == 422 and "at least 12" in r.json()["detail"]
    # a weak password does not use up the code
    assert client.post("/api/auth/reset-password", json={"email": EMAIL, "code": _code(outbox), "password": NEW}).status_code == 200
