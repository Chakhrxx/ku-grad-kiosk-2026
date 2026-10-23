import httpx
from fastapi.testclient import TestClient

from app.services import dress, realtime


def test_token_needs_consent(client: TestClient):
    assert client.post("/api/realtime-token", json={"session": "never-agreed"}).status_code == 403


def test_token_is_minted_for_a_consented_session(client: TestClient, consented: str, monkeypatch):
    sent = {}

    def fake_post(url, headers, json, timeout):
        sent.update(url=url, key=headers["X-API-KEY"], body=json)
        body = {"apiKey": "ek_short", "token": "jwt", "expiresAt": "2026-10-21T00:01:00Z"}
        return httpx.Response(200, json=body, request=httpx.Request("POST", url))

    monkeypatch.setattr(realtime.httpx, "post", fake_post)
    r = client.post("/api/realtime-token", json={"session": consented})
    assert r.status_code == 200
    assert r.json() == {"apiKey": "ek_short", "expiresAt": "2026-10-21T00:01:00Z"}
    assert sent["key"] == "test-key" and "lucy-vton-latest" in sent["body"]["allowedModels"]


def test_gown_reference_is_served_and_unknown_choices_refused(client: TestClient):
    assert client.get("/api/gown/bachelor/engineering").content == b"gown"
    assert client.get("/api/gown/bachelor/fisheries").status_code == 404  # no photo yet
    assert client.get("/api/gown/phd/engineering").status_code == 400


def test_dress_needs_consent(client: TestClient):
    files = {"photo": ("p.jpg", b"jpeg", "image/jpeg")}
    data = {"session": "never-agreed", "level": "bachelor", "item": "engineering"}
    assert client.post("/api/dress", files=files, data=data).status_code == 403


def test_dress_sends_photo_and_gown_to_decart(client: TestClient, consented: str, monkeypatch):
    sent = {}

    def fake_post(url, headers, data, files, timeout):
        sent.update(
            url=url,
            key=headers["X-API-KEY"],
            prompt=data["prompt"],
            photo=files["data"][1],
            ref=files["reference_image"][1],
        )
        return httpx.Response(200, content=b"png", request=httpx.Request("POST", url))

    monkeypatch.setattr(dress.httpx, "post", fake_post)
    files = {"photo": ("p.jpg", b"jpeg", "image/jpeg")}
    r = client.post("/api/dress", files=files, data={"session": consented, "level": "bachelor", "item": "engineering"})
    assert r.status_code == 200 and r.content == b"png" and r.headers["content-type"] == "image/png"
    assert sent["key"] == "test-key" and sent["photo"] == b"jpeg" and sent["ref"] == b"gown"
    assert "graduation gown" in sent["prompt"] and sent["url"].endswith("lucy-image-latest")
