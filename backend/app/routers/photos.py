import logging
import re
from pathlib import Path
from typing import Annotated

import segno
from fastapi import APIRouter, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.responses import HTMLResponse

from app.dependencies import (
    CatalogDep,
    DecartKeyDep,
    MatterDep,
    RendererDep,
    SettingsDep,
    StorageDep,
    UploadDep,
    UpscalerDep,
    check_daily_limit,
    gown_file,
    read_upload,
    timed_step,
)
from app.schemas import PhotoOut
from app.services.dress import dress
from app.services.frame import STEPS_DIRS, new_steps_folder

router = APIRouter(tags=["photos"])
log = logging.getLogger("uvicorn.error")

PAGE = (Path(__file__).parent.parent / "templates" / "download.html").read_text()
EXPIRED = "<p>รูปนี้หมดอายุแล้ว (เก็บไว้ 7 วัน)<br>This photo has expired (kept for 7 days).</p>"

STEPS_FOLDER = re.compile(r"[a-z-]+/\d{2,}")  # as new_steps_folder names them
STEP_FILES = {"result1.jpg", "result2.jpg"}  # the photos: in the middle of the scene, and where they stood


@router.post("/api/dress")
def dress_photo(
    clip: UploadDep,
    level: Annotated[str, Form()],
    item: Annotated[str, Form()],
    settings: SettingsDep,
    storage: StorageDep,
    catalog: CatalogDep,
    api_key: DecartKeyDep,
    solution: Annotated[str, Form()] = "",
) -> Response:
    """A one-second MP4 clip of the visitor dressed in the chosen outfit by Decart's try-on model (a batch job);
    the kiosk takes a frame of it, puts the real face back and finishes the photo."""
    outfit = gown_file(catalog, level, item)
    check_daily_limit(storage, settings)
    with timed_step("dress"):
        dressed = dress(api_key, clip, outfit.read_bytes(), level)
    headers = {}
    if settings.save_steps:  # what the model made; the kiosk adds the finished photos to the same folder
        about = f"solution: {solution} ({STEPS_DIRS.get(solution, 'other')})\noutfit: {level}/{item}"
        headers["X-Steps"] = folder = new_steps_folder(settings.data_dir, solution, about)
        (settings.data_dir / "steps" / folder / "dressed.mp4").write_bytes(dressed)
    return Response(dressed, media_type="video/mp4", headers=headers)


@router.post("/api/matte")
def matte(photo: UploadDep, matter: MatterDep) -> Response:
    """The dressed visitor cut out of the room (a white PNG, the visitor as its alpha), for the kiosk to put them
    on the scene: finer than the kiosk's own segmenter, which loses the gown's details. On a failure (a missing
    model, a bad image) the kiosk falls back to its own segmenter."""
    with timed_step("matte"):
        mask = matter(photo)
    return Response(mask, media_type="image/png")


@router.post("/api/upscale")
def sharpen(photo: UploadDep, upscaler: UpscalerDep) -> Response:
    """The try-on model's dressed frame, sharper and ×4 (JPEG); the kiosk uses the frame as it is if this fails."""
    with timed_step("upscale"):
        sharp = upscaler(photo)
    return Response(sharp, media_type="image/jpeg")


@router.post("/api/steps/{folder:path}", status_code=204)
def save_step(
    folder: str, name: Annotated[str, Form()], photo: Annotated[UploadFile, File()], settings: SettingsDep
) -> None:
    """Debug (SAVE_STEPS): a finished photo (result1.jpg / result2.jpg) beside the dressed clip it came from."""
    target = settings.data_dir / "steps" / folder
    allowed = settings.save_steps and STEPS_FOLDER.fullmatch(folder) and name in STEP_FILES and target.is_dir()
    if not allowed:
        raise HTTPException(404)
    (target / name).write_bytes(read_upload(photo, settings))


@router.post("/api/generate")
def generate(
    request: Request,
    photo: UploadDep,
    level: Annotated[str, Form()],
    item: Annotated[str, Form()],
    background: Annotated[str, Form()],
    settings: SettingsDep,
    storage: StorageDep,
    catalog: CatalogDep,
    render: RendererDep,
) -> PhotoOut:
    """Store the kiosk's finished photo (visitor in the gown, on the campus background) with its frame and QR."""
    if not catalog.is_valid_choice(level, item, background):
        raise HTTPException(400, "unknown_choice")
    check_daily_limit(storage, settings)
    with timed_step("frame"):
        framed = render(photo, catalog.frame_path(background))
    pid = storage.save_photo(framed)
    log.info("photo %s (%d KB)", pid, len(photo) // 1024)

    url = f"{(settings.public_url or str(request.base_url)).rstrip('/')}/p/{pid}"
    return PhotoOut(id=pid, image=f"/photos/{pid}.jpg", url=url, qr=segno.make(url, error="m").svg_data_uri(scale=8))


@router.get("/photos/{pid}.jpg")
def get_photo(pid: str, storage: StorageDep) -> Response:
    if (jpg := storage.photo(pid)) is None:
        raise HTTPException(404)
    return Response(jpg, media_type="image/jpeg")


@router.get("/p/{pid}", response_class=HTMLResponse)
def download_page(pid: str, storage: StorageDep) -> HTMLResponse:
    """The page the QR code opens on the visitor's phone."""
    if not (expires := storage.expires_at(pid)):
        return HTMLResponse(PAGE.replace("{{BODY}}", EXPIRED), 404)
    body = (
        f'<img src="/photos/{pid}.jpg" alt="Graduation photo">'
        f'<a class="btn" href="/photos/{pid}.jpg" download="KU-graduation.jpg">บันทึกรูป · Save photo</a>'
        "<p>ถ้ากดแล้วไม่บันทึก ให้กดค้างที่รูป<br>If saving doesn't start, press and hold the photo.</p>"
        f"<p>ดาวน์โหลดได้ถึง · Available until <b>{expires:%d/%m/%Y}</b></p>"
    )
    return HTMLResponse(PAGE.replace("{{BODY}}", body))
