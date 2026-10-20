"""Shared FastAPI dependencies. Tests swap any of them via app.dependency_overrides."""

from typing import Annotated

from fastapi import Depends

from app.config import Settings, get_settings
from app.services.catalog import CatalogService, load_catalog
from app.services.frame import add_frame
from app.services.photos import Renderer
from app.services.storage import Storage

SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_storage(settings: SettingsDep) -> Storage:
    return Storage(settings.data_dir, settings.keep_days)


def get_catalog(settings: SettingsDep) -> CatalogService:
    return load_catalog(settings.assets_dir)


def get_renderer() -> Renderer:
    return add_frame


StorageDep = Annotated[Storage, Depends(get_storage)]
CatalogDep = Annotated[CatalogService, Depends(get_catalog)]
RendererDep = Annotated[Renderer, Depends(get_renderer)]
