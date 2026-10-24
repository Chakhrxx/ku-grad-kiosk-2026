import logging

from fastapi import APIRouter
from fastapi.responses import FileResponse

from app.dependencies import CatalogDep, DecartKeyDep, StorageDep, gown_file, require_consent, timed_step
from app.schemas import RealtimeTokenIn, RealtimeTokenOut
from app.services.realtime import create_client_token

router = APIRouter(prefix="/api", tags=["realtime"])
log = logging.getLogger("uvicorn.error")


@router.post("/realtime-token")
def realtime_token(body: RealtimeTokenIn, storage: StorageDep, api_key: DecartKeyDep) -> RealtimeTokenOut:
    """A short-lived Decart client token for the try-on stream. Only for sessions that gave PDPA consent."""
    require_consent(storage, body.session)
    with timed_step("token"):
        return RealtimeTokenOut(**create_client_token(api_key))


@router.get("/gown/{level}/{item}")
def gown(level: str, item: str, catalog: CatalogDep) -> FileResponse:
    """The gown reference image the try-on stream dresses the visitor in."""
    f = gown_file(catalog, level, item)
    log.info("try-on reference for %s/%s: %s", level, item, f.relative_to(catalog.assets_dir))
    return FileResponse(f, headers={"Cache-Control": "no-store"})  # never a stale outfit
