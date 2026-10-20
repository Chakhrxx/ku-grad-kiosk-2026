"""Finish a photo: the kiosk sends the visitor already dressed and on the campus background; add the frame."""

import io
import logging
from datetime import datetime
from pathlib import Path

from PIL import Image

from app.config import get_settings

log = logging.getLogger("uvicorn.error")


def add_frame(photo: bytes, frame: Path) -> bytes:
    """Overlay the background's frame PNG (KU logo, place name) when there is one; return JPEG bytes."""
    out = Image.open(io.BytesIO(photo)).convert("RGB")
    if frame.is_file():
        # ponytail: the frame PNG carries logo + place name; the date is not drawn yet
        overlay = Image.open(frame).convert("RGBA").resize(out.size)
        out = Image.alpha_composite(out.convert("RGBA"), overlay).convert("RGB")
    buf = io.BytesIO()
    out.save(buf, "JPEG", quality=92)
    if get_settings().save_steps:
        save_steps(photo, buf.getvalue())
    return buf.getvalue()


def save_steps(received: bytes, framed: bytes) -> None:
    """Debug: keep both stages of one photo in its own folder (SAVE_STEPS=true)."""
    folder = get_settings().data_dir / "steps" / datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    folder.mkdir(parents=True)
    (folder / "1-from-kiosk.jpg").write_bytes(received)
    (folder / "2-framed.jpg").write_bytes(framed)
    log.info("steps saved to %s", folder)
