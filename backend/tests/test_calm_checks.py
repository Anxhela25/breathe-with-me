from tests.helpers import auth_header

STEADY = {"source": "end_of_session", "level": 0.62, "message_key": "steady", "heart_rate": 74}


def test_save_and_list_calm_checks(client):
    h = auth_header(client)
    r = client.post("/api/calm-checks", headers=h, json=STEADY)
    assert r.status_code == 201
    body = r.json()
    assert body["heart_rate"] == 74 and body["message_key"] == "steady" and "level" not in body  # never shown
    assert len(client.get("/api/calm-checks", headers=h).json()) == 1


def test_baseline_is_her_own_median(client):
    h = auth_header(client)
    assert client.get("/api/calm-checks/baseline", headers=h).json() == {"count": 0, "baseline": None}
    for level in (0.2, 0.4, 0.9):
        client.post("/api/calm-checks", headers=h, json={**STEADY, "level": level})
    assert client.get("/api/calm-checks/baseline", headers=h).json() == {"count": 3, "baseline": 0.4}
    other = auth_header(client, "other@example.com")
    assert client.get("/api/calm-checks/baseline", headers=other).json()["count"] == 0


def test_calm_check_validation(client):
    h = auth_header(client)
    for bad in ({**STEADY, "level": 1.5}, {**STEADY, "heart_rate": 400}, {**STEADY, "message_key": "low"},
                {**STEADY, "source": "anything"}):
        assert client.post("/api/calm-checks", headers=h, json=bad).status_code == 422
    assert client.post("/api/calm-checks", json=STEADY).status_code == 401


def test_calm_check_only_links_to_own_episode(client):
    h = auth_header(client)
    other = auth_header(client, "other@example.com")
    episode = client.post("/api/episodes", headers=other, json={}).json()
    r = client.post("/api/calm-checks", headers=h, json={**STEADY, "episode_id": episode["id"]})
    assert r.status_code == 404


def test_delete_account_removes_calm_checks(client):
    h = auth_header(client)
    client.post("/api/calm-checks", headers=h, json=STEADY)
    assert client.delete("/api/me", headers=h).status_code == 204
    from app.database import SessionLocal
    from app.models import CalmCheck
    with SessionLocal() as db:
        assert db.query(CalmCheck).count() == 0
