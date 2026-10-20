"""Store one finished graduation photo: check the request, add the frame, save it."""

from collections.abc import Callable
from pathlib import Path

from app.config import Settings
from app.services.catalog import CatalogService
from app.services.storage import Storage

Renderer = Callable[[bytes, Path], bytes]
"""(photo, frame) -> final JPEG. frame.add_frame in production."""


class PhotoError(Exception):
    """A request we refuse. `code` is what the kiosk sees."""

    def __init__(self, code: str, detail: str = ""):
        super().__init__(f"{code}: {detail}" if detail else code)
        self.code = code
        self.detail = detail


def create_photo(
    *,
    photo: bytes,
    session: str,
    level: str,
    item: str,
    background: str,
    settings: Settings,
    storage: Storage,
    catalog: CatalogService,
    render: Renderer,
) -> str:
    """Return the new photo's id. The photo arrives dressed and composited by the kiosk."""
    if not storage.has_consent(session):
        raise PhotoError("no_consent")
    if not catalog.is_valid_choice(level, item, background):
        raise PhotoError("unknown_choice")
    if len(photo) > settings.max_upload_bytes:
        raise PhotoError("too_large")
    if storage.sweep() >= settings.max_per_day:
        raise PhotoError("daily_limit")
    return storage.save_photo(render(photo, catalog.frame_path(background)))
