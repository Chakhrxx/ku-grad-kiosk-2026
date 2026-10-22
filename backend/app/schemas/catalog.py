from pydantic import BaseModel


class CatalogItem(BaseModel):
    id: str
    th: str
    en: str


class Background(CatalogItem):
    photo_title: str | None = None  # header title on the photo; the Thai name when absent
    subject_shift: float = 0  # move the visitor right by this fraction of the photo width (room for scene art)


class Catalog(BaseModel):
    levels: list[CatalogItem]
    faculties: list[CatalogItem]
    others: list[CatalogItem]
    backgrounds: list[Background]
