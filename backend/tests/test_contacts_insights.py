import pytest

CONSENT = {"is_adult": True, "health_data_consent": True}


def _register(client, email="maria@example.com"):
    r = client.post("/api/auth/register", json={"email": email, "password": "secret123", **CONSENT})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _episode(client, h, started_at, **answers):
    ep = client.post("/api/episodes", headers=h, json={"start_level": answers.pop("start", 6), "started_at": started_at}).json()
    if answers:
        client.patch(f"/api/episodes/{ep['id']}", headers=h, json=answers)


def test_contacts_crud_and_privacy(client):
    h = _register(client)
    c = client.post("/api/contacts", headers=h, json={"name": " Mum ", "phone": "+355 69 123 4567"}).json()
    assert c["name"] == "Mum"
    assert client.patch(f"/api/contacts/{c['id']}", headers=h, json={"name": "Mother", "phone": "069 123"}).json()["name"] == "Mother"

    other = _register(client, "other@example.com")
    assert client.get("/api/contacts", headers=other).json() == []
    assert client.delete(f"/api/contacts/{c['id']}", headers=other).status_code == 404

    assert client.delete(f"/api/contacts/{c['id']}", headers=h).status_code == 204
    assert client.get("/api/contacts", headers=h).json() == []


@pytest.mark.parametrize("body", [{"name": "", "phone": "123"}, {"name": "A", "phone": "call me"}, {"name": "A", "phone": "+-"}])
def test_contact_validation(client, body):
    assert client.post("/api/contacts", headers=_register(client), json=body).status_code == 422


def test_contacts_limit(client):
    h = _register(client)
    for i in range(5):
        assert client.post("/api/contacts", headers=h, json={"name": f"P{i}", "phone": "12345"}).status_code == 201
    assert client.post("/api/contacts", headers=h, json={"name": "P5", "phone": "12345"}).status_code == 409


def test_contacts_need_login(client):
    assert client.get("/api/contacts").status_code == 401
    assert client.get("/api/insights").status_code == 401


def test_insights_need_enough_entries(client):
    h = _register(client)
    for day in range(4):
        _episode(client, h, f"2026-11-0{day + 1}T19:00:00Z", place="work")
    out = client.get("/api/insights", headers=h).json()
    assert out["count"] == 4 and out["needed"] == 5 and out["ready"] is False and out["patterns"] == []


def test_insights_patterns(client):
    h = _register(client)
    # evenings in Tirana (UTC+1), mostly at work; little sleep -> stronger
    for day, (sleep, worst) in enumerate([("little", 9), ("little", 8), ("well", 5), ("well", 4), ("little", 9), ("well", 5)]):
        _episode(client, h, f"2026-11-0{day + 1}T18:30:00Z", place="work" if day < 4 else "home",
                 sleep=sleep, worst_level=worst, expected=False)
    out = client.get("/api/insights", headers=h, params={"tz": "Europe/Tirane"}).json()
    texts = {p["key"]: p["text"] for p in out["patterns"]}
    assert out["ready"] is True
    assert texts["time_of_day"] == "Most episodes happened in the evening (6 of 6)."
    assert texts["place"] == "Most episodes happened at work (4 of 6)."
    assert texts["sleep"] == "After little sleep, episodes were stronger on average (8.7 vs 4.7 out of 10)."
    assert texts["expected"] == "Most episodes came out of the blue (6 of 6)."


def test_insights_say_nothing_without_a_clear_pattern(client):
    h = _register(client)
    places = ["home", "work", "street", "other", "home"]
    for day, place in enumerate(places):
        _episode(client, h, f"2026-11-0{day + 1}T{6 + day * 4:02d}:00:00Z", place=place)
    out = client.get("/api/insights", headers=h, params={"tz": "UTC"}).json()
    assert out["ready"] is True and out["patterns"] == []


def test_unknown_time_zone_falls_back_to_utc(client):
    h = _register(client)
    assert client.get("/api/insights", headers=h, params={"tz": "Not/AZone"}).status_code == 200
