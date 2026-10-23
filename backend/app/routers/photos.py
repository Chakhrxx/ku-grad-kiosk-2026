from pathlib import Path
from typing import Annotated

import httpx
import segno
from fastapi import APIRouter, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.responses import FileResponse, HTMLResponse

from app.dependencies import CatalogDep, RendererDep, SettingsDep, StorageDep
from app.schemas import PhotoOut
from app.services.dress import dress
from app.services.photos import PhotoError, create_photo

router = APIRouter(tags=["photos"])

PAGE = (Path(__file__).parent.parent / "templates" / "download.html").read_text()
EXPIRED = "<p>รูปนี้หมดอายุแล้ว (เก็บไว้ 7 วัน)<br>This photo has expired (kept for 7 days).</p>"

STATUS = {"no_consent": 403, "unknown_choice": 400, "too_large": 413, "daily_limit": 429}


@router.post("/api/dress")
def dress_photo(
    photo: Annotated[UploadFile, File()],
    session: Annotated[str, Form()],
    level: Annotated[str, Form()],
    item: Annotated[str, Form()],
    settings: SettingsDep,
    storage: StorageDep,
    catalog: CatalogDep,
) -> Response:
    """The visitor's camera photo dressed in the chosen outfit (PNG); the kiosk then puts it on the scene."""
    if not storage.has_consent(session):
        raise HTTPException(403, "no_consent")
    if not catalog.is_valid_choice(level, item, catalog.data.backgrounds[0].id):
        raise HTTPException(400, "unknown_choice")
    data = photo.file.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(413, "too_large")
    if storage.sweep() >= settings.max_per_day:  # each dressing is billed, so the daily cap guards it too
        raise HTTPException(429, "daily_limit")
    outfit = catalog.gown_path(level, item)
    if not outfit.is_file():
        raise HTTPException(404, f"missing asset {outfit.relative_to(catalog.assets_dir)}")
    api_key = settings.decart_api_key.get_secret_value()
    if not api_key:
        raise HTTPException(500, "DECART_API_KEY is not set")
    try:
        return Response(dress(api_key, data, outfit.read_bytes(), level), media_type="image/png")
    except httpx.HTTPError as e:
        raise HTTPException(502, f"dress_failed: {e}") from e


@router.post("/api/generate")
def generate(
    request: Request,
    photo: Annotated[UploadFile, File()],
    session: Annotated[str, Form()],
    level: Annotated[str, Form()],
    item: Annotated[str, Form()],
    background: Annotated[str, Form()],
    settings: SettingsDep,
    storage: StorageDep,
    catalog: CatalogDep,
    render: RendererDep,
) -> PhotoOut:
    """Store the kiosk's finished photo (visitor in the gown, on the campus background) with its frame and QR."""
    try:
        pid = create_photo(
            photo=photo.file.read(settings.max_upload_bytes + 1),
            session=session,
            level=level,
            item=item,
            background=background,
            settings=settings,
            storage=storage,
            catalog=catalog,
            render=render,
        )
    except PhotoError as e:
        raise HTTPException(STATUS[e.code], str(e)) from e

    url = f"{(settings.public_url or str(request.base_url)).rstrip('/')}/p/{pid}"
    return PhotoOut(id=pid, image=f"/photos/{pid}.jpg", url=url, qr=segno.make(url, error="m").svg_data_uri(scale=8))


@router.get("/photos/{pid}.jpg")
def get_photo(pid: str, storage: StorageDep) -> FileResponse:
    if not (f := storage.photo_path(pid)):
        raise HTTPException(404)
    return FileResponse(f, media_type="image/jpeg")


@router.get("/p/{pid}", response_class=HTMLResponse)
def download_page(pid: str, storage: StorageDep) -> HTMLResponse:
    """The page the QR code opens on the visitor's phone."""
    if not (f := storage.photo_path(pid)):
        return HTMLResponse(PAGE.replace("{{BODY}}", EXPIRED), 404)
    body = (
        f'<img src="/photos/{pid}.jpg" alt="Graduation photo">'
        f'<a class="btn" href="/photos/{pid}.jpg" download="KU-graduation.jpg">บันทึกรูป · Save photo</a>'
        "<p>ถ้ากดแล้วไม่บันทึก ให้กดค้างที่รูป<br>If saving doesn't start, press and hold the photo.</p>"
        f"<p>ดาวน์โหลดได้ถึง · Available until <b>{storage.expires_at(f):%d/%m/%Y}</b></p>"
    )
    return HTMLResponse(PAGE.replace("{{BODY}}", body))
