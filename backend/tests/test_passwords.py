import pytest

from app.config import settings
from app.services import passwords
from app.services.passwords import password_problem

EMAIL = "maria.k@example.com"


def _a_common_password_of_12_or_more():
    return next(p for p in sorted(passwords._common_passwords()) if len(p) >= 12)


@pytest.mark.parametrize("password", ["quiet-river-lamp", "my cat likes cold tea", "Tre fjalë të qeta"])
def test_good_passwords(password):
    assert password_problem(password, EMAIL) is None


@pytest.mark.parametrize("password, reason", [
    ("short1!", "at least 12"),
    ("aaaaaaaaaaaaaaaa", "too common"),
    ("maria.k-river-lamp", "email name"),
    ("breathe-with-me-now", "app's name"),
    ("é" * 40, "at most"),  # 80 bytes, over bcrypt's 72
])
def test_rejected_passwords(password, reason):
    assert reason in password_problem(password, EMAIL)


def test_common_list_is_used():
    assert "too common" in password_problem(_a_common_password_of_12_or_more(), EMAIL)


def test_breached_passwords_are_rejected(monkeypatch):
    monkeypatch.setattr(settings, "check_breached_passwords", True)
    monkeypatch.setattr(passwords, "_is_breached", lambda _: True)
    assert "data breach" in password_problem("quiet-river-lamp", EMAIL)


def test_register_returns_the_reason(client):
    r = client.post("/api/auth/register", json={
        "email": "new@example.com", "password": "short", "is_adult": True, "health_data_consent": True,
    })
    assert r.status_code == 422 and "at least 12" in r.json()["detail"]
