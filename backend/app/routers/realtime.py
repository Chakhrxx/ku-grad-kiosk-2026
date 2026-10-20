import logging

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.dependencies import CatalogDep, SettingsDep, StorageDep
from app.schemas import RealtimeTokenIn, RealtimeTokenOut
from app.services.realtime import create_client_token

router = APIRouter(prefix="/api", tags=["realtime"])
log = logging.getLogger("uvicorn.error")


@router.post("/realtime-token")
def realtime_token(body: RealtimeTokenIn, settings: SettingsDep, storage: StorageDep) -> RealtimeTokenOut:
    """A short-lived Decart client token for the try-on stream. Only for sessions that gave PDPA consent."""
    if not storage.has_consent(body.session):
        raise HTTPException(403, "no consent")
    api_key = settings.decart_api_key.get_secret_value()
    if not api_key:
        raise HTTPException(500, "DECART_API_KEY is not set")
    try:
        return RealtimeTokenOut(**create_client_token(api_key))
    except httpx.HTTPError as e:
        raise HTTPException(502, f"token_failed: {e}") from e


@router.get("/gown/{level}/{item}")
def gown(level: str, item: str, catalog: CatalogDep) -> FileResponse:
    """The gown reference image the try-on stream dresses the visitor in."""
    if not catalog.is_valid_choice(level, item, catalog.data.backgrounds[0].id):
        raise HTTPException(400, "unknown choice")
    f = catalog.gown_path(level, item)
    if not f.is_file():
        raise HTTPException(404, f"missing asset {f.relative_to(catalog.assets_dir)}")
    log.info("try-on reference for %s/%s: %s", level, item, f.relative_to(catalog.assets_dir))
    return FileResponse(f, headers={"Cache-Control": "no-store"})  # never a stale outfit
