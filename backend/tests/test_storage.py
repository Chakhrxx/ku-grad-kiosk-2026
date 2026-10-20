import os
import time
from pathlib import Path

from app.services.storage import Storage


def test_sweep_deletes_photos_past_retention_and_counts_recent(tmp_path: Path):
    storage = Storage(tmp_path, keep_days=7)
    old = storage.photos / f"{storage.save_photo(b'old')}.jpg"
    two_days = storage.photos / f"{storage.save_photo(b'two-days')}.jpg"
    storage.save_photo(b"new")

    now = time.time()
    os.utime(old, (now - 8 * 86400, now - 8 * 86400))
    os.utime(two_days, (now - 2 * 86400, now - 2 * 86400))

    assert storage.sweep() == 1  # only "new" is within the last 24h
    assert not old.exists() and two_days.exists()


def test_photo_ids_cannot_escape_the_photo_folder(tmp_path: Path):
    storage = Storage(tmp_path, keep_days=7)
    assert storage.photo_path("../consents/x") is None
    assert storage.has_consent("../../etc") is False
