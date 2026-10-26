import pytest
from fastapi.testclient import TestClient

from app.middleware import cache_control_for


@pytest.mark.parametrize(
    ("path", "expected"),
    [
        ("/static/index-HPGLXHTo.js", "public, max-age=31536000, immutable"),
        ("/assets/backgrounds/rice-field.jpg", "public, max-age=3600"),
        ("/photos/abc123def.jpg", "private, max-age=604800"),
        ("/", "no-cache"),
        ("/index.html", "no-cache"),
        ("/api/catalog", None),
    ],
)
def test_cache_policy_per_kind_of_file(path: str, expected: str | None):
    assert cache_control_for(path) == expected


def test_assets_are_served_with_cache_control(client: TestClient):
    r = client.get("/assets/gowns/bachelor/engineering.jpg")
    assert r.status_code == 200
    assert r.headers["cache-control"] == "public, max-age=3600"


def test_missing_files_are_not_cached(client: TestClient):
    assert "cache-control" not in client.get("/assets/backgrounds/moon.jpg").headers
