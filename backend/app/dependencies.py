"""Shared FastAPI dependencies and request guards. Tests swap any dependency via app.dependency_overrides."""

import logging
import time
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Annotated

from fastapi import Depends, File, Form, HTTPException, UploadFile

from app.config import Settings, get_settings
from app.services.catalog import CatalogService, load_catalog
from app.services.frame import add_frame
from app.services.matte import person_matte
from app.services.storage import BucketStorage, Storage
from app.services.upscale import upscale

log = logging.getLogger("uvicorn.error")

SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_storage(settings: SettingsDep) -> Storage | BucketStorage:
    if settings.storage_bucket:
        return BucketStorage(settings.storage_bucket, settings.keep_days)
    return Storage(settings.data_dir, settings.keep_days)


def get_catalog(settings: SettingsDep) -> CatalogService:
    return load_catalog(settings.assets_dir)


Renderer = Callable[[bytes, Path], bytes]
"""(photo, frame) -> final JPEG. frame.add_frame in production."""


def get_renderer() -> Renderer:
    return add_frame


Matter = Callable[[bytes], bytes]


def get_matter(settings: SettingsDep) -> Matter:
    """The visitor cut out of a photo, as a PNG mask (services.matte)."""
    return lambda photo: person_matte(photo, settings.data_dir)


def get_upscaler() -> Matter:
    """A dressed frame made sharper and ×4 (services.upscale)."""
    return upscale


StorageDep = Annotated[Storage | BucketStorage, Depends(get_storage)]
CatalogDep = Annotated[CatalogService, Depends(get_catalog)]
RendererDep = Annotated[Renderer, Depends(get_renderer)]
MatterDep = Annotated[Matter, Depends(get_matter)]
UpscalerDep = Annotated[Matter, Depends(get_upscaler)]


def get_decart_key(settings: SettingsDep) -> str:
    if not (key := settings.decart_api_key.get_secret_value()):
        raise HTTPException(500, "DECART_API_KEY is not set")
    return key


DecartKeyDep = Annotated[str, Depends(get_decart_key)]


def require_consent(storage: Storage | BucketStorage, session: str) -> None:
    if not storage.has_consent(session):
        raise HTTPException(403, "no_consent")


def read_upload(photo: UploadFile, settings: Settings) -> bytes:
    data = photo.file.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(413, "too_large")
    return data


def get_upload(
    photo: Annotated[UploadFile, File()], session: Annotated[str, Form()], settings: SettingsDep, storage: StorageDep
) -> bytes:
    """The form's `photo`, from a session that gave PDPA consent, within the size limit."""
    require_consent(storage, session)
    return read_upload(photo, settings)


UploadDep = Annotated[bytes, Depends(get_upload)]


def check_daily_limit(storage: Storage | BucketStorage, settings: Settings) -> None:
    """Each photo is billed (try-on), so a rolling 24h cap guards the AI budget."""
    if storage.sweep() >= settings.max_per_day:
        raise HTTPException(429, "daily_limit")


def gown_file(catalog: CatalogService, level: str, item: str) -> Path:
    """The outfit's reference image the try-on model dresses the visitor in."""
    if not catalog.is_valid_outfit(level, item):
        raise HTTPException(400, "unknown_choice")
    f = catalog.gown_path(level, item)
    if not f.is_file():
        raise HTTPException(404, f"missing asset {f.relative_to(catalog.assets_dir)}")
    return f


@contextmanager
def timed_step(name: str) -> Iterator[None]:
    """Log how long the step took; any failure in it (Decart down or answering oddly, a model, a bad image) is a 502
    "<name>_failed", logged with its traceback."""
    t0 = time.perf_counter()
    try:
        yield
    except Exception as e:
        log.exception("%s failed", name)
        raise HTTPException(502, f"{name}_failed: {e}") from e
    log.info("[%s] took %.1fs", name, time.perf_counter() - t0)
