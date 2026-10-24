"""Shared FastAPI dependencies. Tests swap any of them via app.dependency_overrides."""

from collections.abc import Callable
from typing import Annotated

from fastapi import Depends

from app.config import Settings, get_settings
from app.services.catalog import CatalogService, load_catalog
from app.services.frame import add_frame
from app.services.matte import person_matte
from app.services.photos import Renderer
from app.services.storage import Storage
from app.services.upscale import upscale

SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_storage(settings: SettingsDep) -> Storage:
    return Storage(settings.data_dir, settings.keep_days)


def get_catalog(settings: SettingsDep) -> CatalogService:
    return load_catalog(settings.assets_dir)


def get_renderer() -> Renderer:
    return add_frame


Matter = Callable[[bytes], bytes]


def get_matter(settings: SettingsDep) -> Matter:
    """The visitor cut out of a photo, as a PNG mask (services.matte)."""
    return lambda photo: person_matte(photo, settings.data_dir)


def get_upscaler() -> Matter:
    """A dressed frame made sharper and ×4 (services.upscale)."""
    return upscale


StorageDep = Annotated[Storage, Depends(get_storage)]
CatalogDep = Annotated[CatalogService, Depends(get_catalog)]
RendererDep = Annotated[Renderer, Depends(get_renderer)]
MatterDep = Annotated[Matter, Depends(get_matter)]
UpscalerDep = Annotated[Matter, Depends(get_upscaler)]
