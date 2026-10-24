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


def fake_decart(monkeypatch, statuses=("queued", "processing", "completed")):
    """Decart's batch API faked: the submit, each status poll and the download, recorded in the returned list."""
    calls = []
    left = iter(statuses)

    def post(url, headers, data, files, timeout):
        calls.append(
            ("submit", url, headers["X-API-KEY"], data["prompt"], files["data"][1:], files["reference_image"][1])
        )
        return httpx.Response(200, json={"job_id": "j1"}, request=httpx.Request("POST", url))

    def get(url, headers, timeout):
        req = httpx.Request("GET", url)
        if url.endswith("/content"):
            calls.append(("download", url))
            return httpx.Response(200, content=b"mp4", request=req)
        return httpx.Response(200, json={"status": next(left)}, request=req)

    monkeypatch.setattr(dress.httpx, "post", post)
    monkeypatch.setattr(dress.httpx, "get", get)
    monkeypatch.setattr(dress.time, "sleep", lambda s: None)
    return calls


CLIP = {"photo": ("shot.mp4", b"clip", "video/mp4")}


def test_dress_runs_a_try_on_job_and_returns_its_video(client: TestClient, consented: str, monkeypatch):
    calls = fake_decart(monkeypatch)
    r = client.post("/api/dress", files=CLIP, data={"session": consented, "level": "bachelor", "item": "engineering"})
    assert r.status_code == 200 and r.content == b"mp4" and r.headers["content-type"] == "video/mp4"
    _, url, key, prompt, (clip, kind), ref = calls[0]
    assert (
        url.endswith("/v1/jobs/lucy-vton-latest")
        and key == "test-key"
        and (clip, kind, ref) == (b"clip", "video/mp4", b"gown")
    )
    assert "graduation gown" in prompt and calls[-1] == ("download", "https://api.decart.ai/v1/jobs/j1/content")


def test_a_failed_try_on_job_is_a_502(client: TestClient, consented: str, monkeypatch):
    fake_decart(monkeypatch, statuses=["failed"])
    data = {"session": consented, "level": "bachelor", "item": "engineering"}
    assert client.post("/api/dress", files=CLIP, data=data).status_code == 502


def test_steps_keep_the_dressed_clip_and_both_photos(settings, client: TestClient, consented: str, monkeypatch):
    settings.save_steps = True
    fake_decart(monkeypatch)
    data = {"session": consented, "level": "bachelor", "item": "engineering", "solution": "vton-live"}
    folder = client.post("/api/dress", files=CLIP, data=data).headers["x-steps"]
    assert folder == "preview-bg/01"
    for name in ("result1.jpg", "result2.jpg"):
        r = client.post(f"/api/steps/{folder}", data={"name": name}, files={"photo": ("p.jpg", b"photo", "image/jpeg")})
        assert r.status_code == 204
    saved = settings.data_dir / "steps" / "preview-bg" / "01"
    assert sorted(p.name for p in saved.iterdir()) == ["dressed.mp4", "info.txt", "result1.jpg", "result2.jpg"]
    photo = {"photo": ("p.jpg", b"photo", "image/jpeg")}
    assert client.post(f"/api/steps/{folder}", data={"name": "../x.jpg"}, files=photo).status_code == 404
    assert client.post("/api/steps/../etc/01", data={"name": "result1.jpg"}, files=photo).status_code == 404


def test_steps_refused_when_not_saving(client: TestClient):
    files = {"photo": ("r.jpg", b"photo", "image/jpeg")}
    assert client.post("/api/steps/preview-bg/01", data={"name": "result1.jpg"}, files=files).status_code == 404


def test_matte_needs_consent_and_returns_the_mask(client: TestClient, consented: str):
    from app.dependencies import get_matter

    client.app.dependency_overrides[get_matter] = lambda: lambda photo: b"mask-of-" + photo
    files = {"photo": ("v.jpg", b"jpeg", "image/jpeg")}
    assert client.post("/api/matte", files=files, data={"session": "never-agreed"}).status_code == 403
    r = client.post("/api/matte", files=files, data={"session": consented})
    assert r.status_code == 200 and r.content == b"mask-of-jpeg" and r.headers["content-type"] == "image/png"


def test_person_matte_keeps_the_size_and_puts_the_visitor_in_alpha(monkeypatch, tmp_path):
    import io

    import numpy as np
    from PIL import Image

    from app.services import matte

    class FakeSession:  # the model, faked: "visitor" in the left half of its 1024x1024 output
        def get_inputs(self):
            return [type("I", (), {"name": "input"})()]

        def run(self, _, feeds):
            (x,) = feeds.values()
            assert x.shape == (1, 3, 1024, 1024) and x.dtype == np.float32 and x.max() <= 0.5
            out = np.zeros((1, 1, 1024, 1024), np.float32)
            out[..., :512] = 1
            return [out]

    monkeypatch.setattr(matte, "session", lambda data_dir: FakeSession())
    buf = io.BytesIO()
    Image.new("RGB", (200, 300), "gray").save(buf, "JPEG")
    mask = Image.open(io.BytesIO(matte.person_matte(buf.getvalue(), tmp_path)))
    assert mask.size == (200, 300) and mask.mode == "RGBA"
    assert mask.getpixel((20, 150))[3] > 250 and mask.getpixel((180, 150))[3] < 5


def test_upscale_needs_consent_and_returns_the_sharper_frame(client: TestClient, consented: str):
    from app.dependencies import get_upscaler

    client.app.dependency_overrides[get_upscaler] = lambda: lambda photo: b"sharp-" + photo
    files = {"photo": ("f.jpg", b"jpeg", "image/jpeg")}
    assert client.post("/api/upscale", files=files, data={"session": "never-agreed"}).status_code == 403
    r = client.post("/api/upscale", files=files, data={"session": consented})
    assert r.status_code == 200 and r.content == b"sharp-jpeg"


def test_upscale_runs_the_real_model_x4_from_720_wide():
    import io

    from PIL import Image

    from app.services.upscale import upscale

    buf = io.BytesIO()
    Image.new("RGB", (1080, 1920), (90, 120, 30)).save(buf, "JPEG")
    out = Image.open(io.BytesIO(upscale(buf.getvalue())))
    assert out.size == (2880, 4 * round(1920 * 720 / 1080))
