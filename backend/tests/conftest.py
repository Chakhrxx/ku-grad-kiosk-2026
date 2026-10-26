import shutil
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import BACKEND_DIR, Settings, get_settings
from app.dependencies import get_renderer
from app.main import create_app


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    """Isolated assets and data, with one gown photo (bachelor/engineering)."""
    assets = tmp_path / "assets"
    (assets / "gowns" / "bachelor").mkdir(parents=True)
    shutil.copy(BACKEND_DIR / "assets" / "catalog.json", assets / "catalog.json")
    (assets / "gowns" / "bachelor" / "engineering.jpg").write_bytes(b"gown")
    return Settings(
        _env_file=None,  # isolated from the developer's backend/.env (real key)
        assets_dir=assets,
        data_dir=tmp_path / "data",
        kiosk_dist=tmp_path / "no-kiosk",
        decart_api_key="test-key",
        public_url="https://kiosk.example",
    )


@pytest.fixture
def render_calls() -> list[tuple]:
    return []


@pytest.fixture
def client(settings: Settings, render_calls: list[tuple]) -> Iterator[TestClient]:
    """App with framing replaced by a fake that records its arguments."""

    def fake_render(photo: bytes, frame: Path) -> bytes:
        render_calls.append((photo, frame))
        return b"final-jpeg"

    app = create_app(settings)
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[get_renderer] = lambda: fake_render
    with TestClient(app) as c:
        yield c


@pytest.fixture
def consented(client: TestClient) -> str:
    session = "session-123"
    assert client.post("/api/consent", json={"session": session, "lang": "th"}).status_code == 200
    return session
