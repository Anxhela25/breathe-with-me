def _register(client, email="maria@example.com"):
    r = client.post("/api/auth/register", json={"email": email, "password": "secret123"})
    assert r.status_code == 201
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_register_login_and_me(client):
    _register(client)
    assert client.post("/api/auth/register", json={"email": "maria@example.com", "password": "secret123"}).status_code == 409
    assert client.post("/api/auth/login", json={"email": "maria@example.com", "password": "wrong-pass"}).status_code == 401
    token = client.post("/api/auth/login", json={"email": "Maria@Example.com", "password": "secret123"}).json()["access_token"]
    me = client.get("/api/me", headers={"Authorization": f"Bearer {token}"}).json()
    assert me["email"] == "maria@example.com" and me["save_chat_texts"] is False


def test_episode_flow_and_privacy(client):
    h = _register(client)
    ep = client.post("/api/episodes", json={"start_level": 7}, headers=h).json()
    r = client.patch(f"/api/episodes/{ep['id']}", headers=h,
                     json={"end_level": 3, "place": "work", "sleep": "little", "finished": True})
    assert r.status_code == 200 and r.json()["ended_at"] is not None
    assert client.patch(f"/api/episodes/{ep['id']}", headers=h, json={"end_level": 11}).status_code == 422

    other = _register(client, "other@example.com")
    assert client.patch(f"/api/episodes/{ep['id']}", headers=other, json={"note": "x"}).status_code == 404
    assert client.get("/api/episodes", headers=other).json() == []
    assert len(client.get("/api/episodes", headers=h).json()) == 1


def test_delete_all_my_data(client):
    h = _register(client)
    client.post("/api/episodes", json={"start_level": 5}, headers=h)
    assert client.delete("/api/me", headers=h).status_code == 204
    assert client.get("/api/me", headers=h).status_code == 401


def test_safety_endpoint(client):
    assert client.post("/api/safety/check", json={"text": "I can't go on"}).json() == {"level": "crisis"}
