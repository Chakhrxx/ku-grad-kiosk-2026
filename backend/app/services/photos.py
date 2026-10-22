"""Store one finished graduation photo: check the request, add the frame, save it."""

import logging
import time
from collections.abc import Callable
from pathlib import Path

from app.config import Settings
from app.services.catalog import CatalogService
from app.services.storage import Storage

log = logging.getLogger("uvicorn.error")

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
    t0 = time.perf_counter()
    if storage.sweep() >= settings.max_per_day:
        raise PhotoError("daily_limit")
    t1 = time.perf_counter()
    framed = render(photo, catalog.frame_path(background))
    t2 = time.perf_counter()
    pid = storage.save_photo(framed)
    t3 = time.perf_counter()
    log.info(
        "photo %s (%d KB): daily count %.2fs, frame %.2fs, save %.2fs",
        pid,
        len(photo) // 1024,
        t1 - t0,
        t2 - t1,
        t3 - t2,
    )
    return pid
