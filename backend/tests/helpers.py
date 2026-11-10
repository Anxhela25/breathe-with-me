import re

CONSENT = {"is_adult": True, "health_data_consent": True}
PASSWORD = "quiet-river-lamp"


def last_code(client) -> str:
    """The 6-digit code from the newest email the app 'sent'."""
    return re.search(r"\b(\d{6})\b", client.outbox[-1][2]).group(1)


def sign_up(client, email="maria@example.com", password=PASSWORD):
    """Full sign-up: ask for the code, then create the account with it. Returns the response."""
    r = client.post("/api/auth/register/start", json={"email": email, "password": password})
    assert r.status_code == 202, r.text
    return client.post("/api/auth/register",
                       json={"email": email, "password": password, "code": last_code(client), **CONSENT})


def auth_header(client, email="maria@example.com", password=PASSWORD):
    r = sign_up(client, email, password)
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
