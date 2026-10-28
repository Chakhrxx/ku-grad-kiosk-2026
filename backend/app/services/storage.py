"""Photos and consent records: on local disk, or in a Cloud Storage bucket on Cloud Run (whose disk goes with the
instance). Both answer the same calls, so the routes don't know which they have."""

import json
import re
import secrets
import time
from datetime import UTC, datetime, timedelta, timezone
from functools import cache
from pathlib import Path

from google.api_core.exceptions import NotFound
from google.cloud import storage as gcs

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

    def photo(self, pid: str) -> bytes | None:
        return f.read_bytes() if (f := self.photo_path(pid)) else None

    def expires_at(self, pid: str) -> datetime | None:
        """When the photo is deleted; None when it is already gone."""
        if not (f := self.photo_path(pid)):
            return None
        return datetime.fromtimestamp(f.stat().st_mtime, THAI_TIME) + timedelta(days=self.keep_days)

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


@cache
def _bucket(name: str) -> gcs.Bucket:
    return gcs.Client().bucket(name)  # one client per process: it holds the credentials and connections


class BucketStorage:
    """The same in a Cloud Storage bucket, under photos/ and consents/. Deleting after keep_days is the bucket's
    lifecycle rule (docs/deploy-firebase.md), not this code."""

    def __init__(self, bucket: str, keep_days: int):
        self.bucket = _bucket(bucket)
        self.keep_days = keep_days

    def save_consent(self, session: str, lang: str) -> None:
        record = {"session": session, "lang": lang, "agreed_at": datetime.now(UTC).isoformat()}
        self.bucket.blob(f"consents/{session}.json").upload_from_string(json.dumps(record), "application/json")

    def has_consent(self, session: str) -> bool:
        return is_valid_id(session) and self.bucket.blob(f"consents/{session}.json").exists()

    def save_photo(self, jpg: bytes) -> str:
        pid = f"{datetime.now(UTC):%Y%m%d}{secrets.token_urlsafe(16)}"  # its UTC day first, for sweep() to list
        self.bucket.blob(f"photos/{pid}.jpg").upload_from_string(jpg, "image/jpeg")
        return pid

    def photo(self, pid: str) -> bytes | None:
        if not is_valid_id(pid):
            return None
        try:
            return self.bucket.blob(f"photos/{pid}.jpg").download_as_bytes()
        except NotFound:
            return None

    def expires_at(self, pid: str) -> datetime | None:
        blob = self.bucket.get_blob(f"photos/{pid}.jpg") if is_valid_id(pid) else None
        return blob.time_created.astimezone(THAI_TIME) + timedelta(days=self.keep_days) if blob else None

    def sweep(self) -> int:
        """How many photos were made in the last 24h (the bucket deletes old ones itself)."""
        # ponytail: lists yesterday's and today's photos on every paid call; a counter document if that gets slow
        since = datetime.now(UTC) - timedelta(days=1)
        return sum(
            blob.time_created > since
            for day in (since, since + timedelta(days=1))
            for blob in self.bucket.list_blobs(
                prefix=f"photos/{day:%Y%m%d}", fields="items(name,timeCreated),nextPageToken"
            )
        )
