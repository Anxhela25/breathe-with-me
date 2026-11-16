import httpx

from app.config import Settings, settings
from app.services import email


def test_neon_database_url_gets_the_psycopg_driver():
    url = "postgresql://user:pw@ep-cool-1.eu-central-1.aws.neon.tech/neondb?sslmode=require"
    assert Settings(database_url=url).database_url.startswith("postgresql+psycopg://user:pw@ep-cool-1")
    assert Settings(database_url="postgres://u:p@h/db").database_url == "postgresql+psycopg://u:p@h/db"
    assert Settings(database_url="postgresql+psycopg://u:p@h/db").database_url == "postgresql+psycopg://u:p@h/db"


def test_brevo_is_used_when_set(monkeypatch):
    sent = {}

    def fake_post(url, headers, json, timeout):
        sent.update(url=url, headers=headers, json=json)
        return httpx.Response(201, request=httpx.Request("POST", url))

    monkeypatch.setattr(settings, "brevo_api_key", "test-key")
    monkeypatch.setattr(settings, "brevo_sender", "me@gmail.com")
    monkeypatch.setattr(email.httpx, "post", fake_post)
    email.send_email("user@example.com", "Your code", "123456")
    assert sent["url"] == "https://api.brevo.com/v3/smtp/email" and sent["headers"]["api-key"] == "test-key"
    assert sent["json"]["sender"]["email"] == "me@gmail.com" and sent["json"]["to"] == [{"email": "user@example.com"}]
