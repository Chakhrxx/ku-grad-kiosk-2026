"""Finish a photo: the kiosk sends it finished (dressed, on the campus scene, with the logo, place and date
header drawn); an optional frame PNG per scene can still go on top."""

import io
import logging
import threading
from datetime import datetime
from pathlib import Path

from PIL import Image

log = logging.getLogger("uvicorn.error")


def add_frame(photo: bytes, frame: Path) -> bytes:
    """Overlay the background's frame PNG when there is one; return JPEG bytes."""
    out = Image.open(io.BytesIO(photo)).convert("RGB")
    if frame.is_file():
        overlay = Image.open(frame).convert("RGBA").resize(out.size)
        out = Image.alpha_composite(out.convert("RGBA"), overlay).convert("RGB")
    buf = io.BytesIO()
    out.save(buf, "JPEG", quality=92)
    return buf.getvalue()


# Debug folders, one per solution being compared, then 01, 02, ... per shot (to share with the team)
STEPS_DIRS = {"vton-live": "preview-bg", "vton-batch": "no-preview-bg"}
_steps_lock = threading.Lock()


def new_steps_folder(data_dir: Path, solution: str, about: str) -> str:
    """Debug (SAVE_STEPS): the next numbered folder for this solution's shots, with `about` as its info.txt; its
    path under data/steps ("no-preview-bg/03")."""
    group = data_dir / "steps" / STEPS_DIRS.get(solution, "other")
    with _steps_lock:
        group.mkdir(parents=True, exist_ok=True)
        taken = [int(d.name) for d in group.iterdir() if d.is_dir() and d.name.isdigit()]
        folder = group / f"{max(taken, default=0) + 1:02d}"
        folder.mkdir()
    (folder / "info.txt").write_text(f"{datetime.now():%Y-%m-%d %H:%M:%S}\n{about}\n")
    log.info("steps saved to %s", folder)
    return f"{group.name}/{folder.name}"
