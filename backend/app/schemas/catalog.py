from pydantic import BaseModel


class CatalogItem(BaseModel):
    id: str
    th: str
    en: str


class Catalog(BaseModel):
    levels: list[CatalogItem]
    faculties: list[CatalogItem]
    others: list[CatalogItem]
    backgrounds: list[CatalogItem]
