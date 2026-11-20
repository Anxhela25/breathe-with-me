from app.monitoring import before_breadcrumb, before_send


def test_event_keeps_nothing_personal():
    event = {
        "request": {"method": "POST", "url": "https://api/auth/login?next=x", "data": {"password": "secret"},
                    "headers": {"Authorization": "Bearer abc"}, "cookies": {"a": "b"}},
        "user": {"ip_address": "1.2.3.4"},
        "logentry": {"message": "Email to %s failed", "params": ["ana@gmail.com"]},
        "exception": {"values": [{"value": "duplicate key [parameters: ('ana@gmail.com', '$2b$12$hash')]"}]},
    }
    sent = before_send(event, {})
    assert sent["request"] == {"method": "POST", "url": "https://api/auth/login"}
    assert "user" not in sent
    assert "ana@gmail.com" not in str(sent) and "$2b$" not in str(sent)


def test_breadcrumb_drops_the_model_answer():
    crumb = before_breadcrumb({"message": "Risk check gave an unclear answer from groq/x: 'i want to'"}, {})
    assert crumb["message"] == "Risk check gave an unclear answer"
