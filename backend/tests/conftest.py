import os

# Separate database so tests never touch real data.
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://localhost:5432/breathe_with_me_test"
)

os.environ["ACCESS_TOKEN_MINUTES"] = "60"  # real token times, even if .env shortens them
os.environ["REFRESH_TOKEN_DAYS"] = "90"
os.environ["REFRESH_TOKEN_MINUTES"] = "0"  # 0: use the days
os.environ["CHAT_PAUSE_MINUTES"] = str(24 * 60)  # real pause length
os.environ["CHECK_BREACHED_PASSWORDS"] = "false"  # no network calls in tests
os.environ["CHECK_EMAIL_DOMAIN"] = "false"
os.environ["SENTRY_DSN"] = ""  # test errors never go to Sentry

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.routers import auth  # noqa: E402


@pytest.fixture(autouse=True)
def risk_check(monkeypatch):
    """Fake risk check: answers NO + English unless a test changes it. No real AI calls."""
    from app.services import ai

    class RiskCheck:
        answer: bool | None = False  # None: no provider answered
        english: bool | None = True
        seen: list[list[str]] = []

    def fake(user_messages, deadline=None):
        RiskCheck.seen.append(list(user_messages))
        return None if RiskCheck.answer is None else ai.RiskResult(RiskCheck.answer, RiskCheck.english)

    RiskCheck.seen = []
    RiskCheck.answer = False
    RiskCheck.english = True
    monkeypatch.setattr(ai, "classify_risk", fake)
    return RiskCheck


@pytest.fixture()
def outbox(monkeypatch):
    """Collects emails instead of sending them."""
    sent = []
    monkeypatch.setattr(auth, "send_email", lambda to, subject, text: sent.append((to, subject, text)))
    return sent


@pytest.fixture()
def client(outbox):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        c.outbox = outbox  # used by helpers.py to read sign-up codes
        yield c
