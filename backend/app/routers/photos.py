import logging
import re
import time
from pathlib import Path
from typing import Annotated

import httpx
import segno
from fastapi import APIRouter, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.responses import FileResponse, HTMLResponse

from app.dependencies import CatalogDep, MatterDep, RendererDep, SettingsDep, StorageDep, UpscalerDep
from app.schemas import PhotoOut
from app.services.dress import DressError, dress
from app.services.frame import STEPS_DIRS, new_steps_folder
from app.services.photos import PhotoError, create_photo

router = APIRouter(tags=["photos"])
log = logging.getLogger("uvicorn.error")

PAGE = (Path(__file__).parent.parent / "templates" / "download.html").read_text()
EXPIRED = "<p>รูปนี้หมดอายุแล้ว (เก็บไว้ 7 วัน)<br>This photo has expired (kept for 7 days).</p>"

STATUS = {"no_consent": 403, "unknown_choice": 400, "too_large": 413, "daily_limit": 429}
STEPS_FOLDER = re.compile(r"[a-z-]+/\d{2,}")  # as new_steps_folder names them
STEP_FILES = {"result1.jpg", "result2.jpg"}  # the photos: in the middle of the scene, and where they stood


@router.post("/api/dress")
def dress_photo(
    photo: Annotated[UploadFile, File()],
    session: Annotated[str, Form()],
    level: Annotated[str, Form()],
    item: Annotated[str, Form()],
    settings: SettingsDep,
    storage: StorageDep,
    catalog: CatalogDep,
    solution: Annotated[str, Form()] = "",
) -> Response:
    """A one-second MP4 clip of the visitor dressed in the chosen outfit by Decart's try-on model (a batch job);
    the kiosk takes a frame of it, puts the real face back and finishes the photo."""
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
    t0 = time.perf_counter()
    try:
        dressed = dress(api_key, data, outfit.read_bytes(), level)
    except (httpx.HTTPError, DressError) as e:
        raise HTTPException(502, f"dress_failed: {e}") from e
    log.info("[dress] Decart took %.1fs", time.perf_counter() - t0)  # the rest of the kiosk's wait is the network
    headers = {}
    if settings.save_steps:  # what the model made; the kiosk adds the finished photos to the same folder
        about = f"solution: {solution} ({STEPS_DIRS.get(solution, 'other')})\noutfit: {level}/{item}"
        headers["X-Steps"] = folder = new_steps_folder(settings.data_dir, solution, about)
        (settings.data_dir / "steps" / folder / "dressed.mp4").write_bytes(dressed)
    return Response(dressed, media_type="video/mp4", headers=headers)


@router.post("/api/matte")
def matte(
    photo: Annotated[UploadFile, File()],
    session: Annotated[str, Form()],
    settings: SettingsDep,
    storage: StorageDep,
    matter: MatterDep,
) -> Response:
    """The dressed visitor cut out of the room (a white PNG, the visitor as its alpha), for the kiosk to put them
    on the scene: finer than the kiosk's own segmenter, which loses the gown's details."""
    if not storage.has_consent(session):
        raise HTTPException(403, "no_consent")
    data = photo.file.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(413, "too_large")
    t0 = time.perf_counter()
    try:
        mask = matter(data)
    except Exception as e:  # a missing model, a bad image: the kiosk falls back to its own segmenter
        log.exception("matte failed")
        raise HTTPException(502, f"matte_failed: {e}") from e
    log.info("[matte] took %.1fs", time.perf_counter() - t0)
    return Response(mask, media_type="image/png")


@router.post("/api/upscale")
def sharpen(
    photo: Annotated[UploadFile, File()],
    session: Annotated[str, Form()],
    settings: SettingsDep,
    storage: StorageDep,
    upscaler: UpscalerDep,
) -> Response:
    """The try-on model's dressed frame, sharper and ×4 (JPEG); the kiosk uses the frame as it is if this fails."""
    if not storage.has_consent(session):
        raise HTTPException(403, "no_consent")
    data = photo.file.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(413, "too_large")
    t0 = time.perf_counter()
    try:
        sharp = upscaler(data)
    except Exception as e:
        log.exception("upscale failed")
        raise HTTPException(502, f"upscale_failed: {e}") from e
    log.info("[upscale] took %.1fs", time.perf_counter() - t0)
    return Response(sharp, media_type="image/jpeg")


@router.post("/api/steps/{folder:path}", status_code=204)
def save_step(
    folder: str, name: Annotated[str, Form()], photo: Annotated[UploadFile, File()], settings: SettingsDep
) -> None:
    """Debug (SAVE_STEPS): a finished photo (result1.jpg / result2.jpg) beside the dressed clip it came from."""
    target = settings.data_dir / "steps" / folder
    if not settings.save_steps or not STEPS_FOLDER.fullmatch(folder) or name not in STEP_FILES or not target.is_dir():
        raise HTTPException(404)
    data = photo.file.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(413, "too_large")
    (target / name).write_bytes(data)


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
