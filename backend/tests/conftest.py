import os

# Tests use a separate database so they never touch real data.
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://localhost:5432/breathe_with_me_test"
)

os.environ["CHECK_BREACHED_PASSWORDS"] = "false"  # no network calls in tests
os.environ["CHECK_EMAIL_DOMAIN"] = "false"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.routers import auth  # noqa: E402


@pytest.fixture(autouse=True)
def risk_check(monkeypatch):
    """The AI risk check answers NO, in English, unless a test sets risk_check.answer; tests never call a real AI."""
    from app.services import ai

    class RiskCheck:
        answer: bool | None = False  # None: no provider answered
        lang: str = "en"
        seen: list[list[str]] = []

    def fake(user_messages, deadline=None):
        RiskCheck.seen.append(list(user_messages))
        return None if RiskCheck.answer is None else ai.RiskResult(RiskCheck.answer, RiskCheck.lang)

    RiskCheck.seen = []
    RiskCheck.answer = False
    RiskCheck.lang = "en"
    monkeypatch.setattr(ai, "classify_risk", fake)
    return RiskCheck


@pytest.fixture()
def outbox(monkeypatch):
    """Emails the app would send; tests never send real ones."""
    sent = []
    monkeypatch.setattr(auth, "send_email", lambda to, subject, text: sent.append((to, subject, text)))
    return sent


@pytest.fixture()
def client(outbox):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        c.outbox = outbox  # used by tests/helpers.py to read sign-up codes
        yield c
