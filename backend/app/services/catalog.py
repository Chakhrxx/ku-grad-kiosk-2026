"""Faculties, degree levels and backgrounds, from assets/catalog.json, and where their files live."""

from functools import lru_cache
from pathlib import Path

from app.schemas import Catalog


class CatalogService:
    def __init__(self, assets_dir: Path):
        self.assets_dir = assets_dir
        self.data = Catalog.model_validate_json((assets_dir / "catalog.json").read_text())

    def is_valid_choice(self, level: str, item: str, background: str) -> bool:
        items = self.data.others if level == "others" else self.data.faculties
        return (
            level in {x.id for x in self.data.levels}
            and item in {x.id for x in items}
            and background in {x.id for x in self.data.backgrounds}
        )

    def gown_path(self, level: str, item: str) -> Path:
        return self.assets_dir / "gowns" / level / f"{item}.jpg"

    def frame_path(self, background: str) -> Path:
        return self.assets_dir / "frames" / f"{background}.png"


@lru_cache
def load_catalog(assets_dir: Path) -> CatalogService:
    return CatalogService(assets_dir)
