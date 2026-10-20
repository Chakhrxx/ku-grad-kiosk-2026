from fastapi import APIRouter

from app.dependencies import CatalogDep
from app.schemas import Catalog

router = APIRouter(prefix="/api", tags=["catalog"])


@router.get("/catalog")
def get_catalog(catalog: CatalogDep) -> Catalog:
    return catalog.data
