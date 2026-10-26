import json

import pytest
from fastapi.testclient import TestClient

from app.config import Settings

PHOTO = {"photo": ("p.jpg", b"camera-jpeg", "image/jpeg")}


def form(session: str, **overrides: str) -> dict[str, str]:
    return {"session": session, "level": "bachelor", "item": "engineering", "background": "rice-field", **overrides}


def test_catalog_lists_levels_faculties_and_backgrounds(client: TestClient):
    body = client.get("/api/catalog").json()
    assert [x["id"] for x in body["levels"]] == ["bachelor", "master", "doctoral", "others"]
    assert len(body["faculties"]) == 9
    assert {"id", "th", "en"} <= body["backgrounds"][0].keys()


def test_consent_is_recorded_with_a_timestamp(client: TestClient, settings: Settings, consented: str):
    record = json.loads((settings.data_dir / "consents" / f"{consented}.json").read_text())
    assert record["lang"] == "th" and record["agreed_at"]


@pytest.mark.parametrize("session", ["short", "../../etc/passwd", "x" * 65])
def test_consent_rejects_malformed_sessions(client: TestClient, session: str):
    assert client.post("/api/consent", json={"session": session, "lang": "th"}).status_code == 422


def test_generate_needs_consent_first(client: TestClient, render_calls: list):
    r = client.post("/api/generate", data=form("never-agreed"), files=PHOTO)
    assert r.status_code == 403
    assert render_calls == []  # nothing left the building


@pytest.mark.parametrize(
    "overrides",
    [
        {"item": "../../etc/passwd"},
        {"level": "phd"},
        {"background": "moon"},
        {"level": "others", "item": "engineering"},
    ],
)
def test_generate_rejects_choices_not_in_the_catalog(client: TestClient, consented: str, overrides: dict):
    assert client.post("/api/generate", data=form(consented, **overrides), files=PHOTO).status_code == 400


def test_generate_returns_photo_qr_and_download_page(client: TestClient, consented: str, render_calls: list):
    r = client.post("/api/generate", data=form(consented), files=PHOTO)
    assert r.status_code == 200, r.text
    body = r.json()

    photo, frame = render_calls[0]
    assert photo == b"camera-jpeg" and frame.name == "rice-field.png"

    assert body["url"] == f"https://kiosk.example/p/{body['id']}"
    assert body["qr"].startswith("data:image/svg+xml")
    assert client.get(body["image"]).content == b"final-jpeg"
    assert "Save photo" in client.get(f"/p/{body['id']}").text


def test_daily_limit_stops_new_photos(client: TestClient, settings: Settings, consented: str, render_calls: list):
    settings.max_per_day = 0
    assert client.post("/api/generate", data=form(consented), files=PHOTO).status_code == 429
    assert render_calls == []


def test_expired_or_unknown_photo_shows_expired_page(client: TestClient):
    r = client.get("/p/doesnotexist")
    assert r.status_code == 404 and "expired" in r.text
    assert client.get("/photos/doesnotexist.jpg").status_code == 404
