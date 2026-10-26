"""Photos and consent records on local disk. Swap for a cloud bucket at deploy time."""

import json
import re
import secrets
import time
from datetime import UTC, datetime, timedelta, timezone
from pathlib import Path

ID = re.compile(r"[A-Za-z0-9_-]{8,64}")
THAI_TIME = timezone(timedelta(hours=7))


def is_valid_id(value: str) -> bool:
    return bool(ID.fullmatch(value))


class Storage:
    def __init__(self, data_dir: Path, keep_days: int):
        self.photos = data_dir / "photos"
        self.consents = data_dir / "consents"
        self.keep_days = keep_days
        for d in (self.photos, self.consents):
            d.mkdir(parents=True, exist_ok=True)

    def save_consent(self, session: str, lang: str) -> None:
        record = {"session": session, "lang": lang, "agreed_at": datetime.now(UTC).isoformat()}
        (self.consents / f"{session}.json").write_text(json.dumps(record))

    def has_consent(self, session: str) -> bool:
        return is_valid_id(session) and (self.consents / f"{session}.json").is_file()

    def save_photo(self, jpg: bytes) -> str:
        pid = secrets.token_urlsafe(16)
        (self.photos / f"{pid}.jpg").write_bytes(jpg)
        return pid

    def photo_path(self, pid: str) -> Path | None:
        f = self.photos / f"{pid}.jpg"
        return f if is_valid_id(pid) and f.is_file() else None

    def expires_at(self, photo: Path) -> datetime:
        return datetime.fromtimestamp(photo.stat().st_mtime, THAI_TIME) + timedelta(days=self.keep_days)

    def sweep(self) -> int:
        """Delete photos past retention; return how many were made in the last 24h."""
        # ponytail: O(n) scan per request; becomes a bucket lifecycle rule + counter on cloud storage
        now, recent = time.time(), 0
        for f in self.photos.glob("*.jpg"):
            age = now - f.stat().st_mtime
            if age > self.keep_days * 86400:
                f.unlink(missing_ok=True)
            elif age < 86400:
                recent += 1
        return recent
