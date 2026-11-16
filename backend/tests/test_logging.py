import logging

from app.main import app


@app.get("/api/test-crash")
def crash():
    raise RuntimeError("test crash")


def test_crash_is_logged_and_answers_500(client, caplog):
    with caplog.at_level(logging.ERROR, logger="breathe.api"):
        r = client.get("/api/test-crash")
    assert r.status_code == 500 and r.json()["detail"] == "Something went wrong. Please try again."
    assert "GET /api/test-crash crashed" in caplog.text and "RuntimeError: test crash" in caplog.text


def test_invalid_request_logs_the_field_but_never_the_value(client, caplog):
    with caplog.at_level(logging.INFO):
        client.post("/api/auth/register", json={"email": "a@example.com", "password": "my-secret-pass-77", "code": "12"})
    assert "body.code" in caplog.text
    assert "my-secret-pass-77" not in caplog.text


def test_failed_login_is_logged_without_the_email(client, caplog):
    with caplog.at_level(logging.INFO):
        r = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "whatever-password"})
    assert r.status_code == 401
    assert "Login failed: no account with this email" in caplog.text
    assert "nobody@example.com" not in caplog.text


def test_chat_logs_never_contain_the_message(client, caplog, risk_check):
    risk_check.answer = True
    with caplog.at_level(logging.INFO):
        client.post("/api/chat", json={"message": "nobody would notice if I was gone"})
    assert "asking the user if they are safe" in caplog.text
    assert "nobody would notice" not in caplog.text
