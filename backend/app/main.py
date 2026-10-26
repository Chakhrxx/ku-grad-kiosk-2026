from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.config import Settings, get_settings
from app.middleware import add_cache_control, log_api_time
from app.routers import catalog, consent, photos, realtime


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    app = FastAPI(title="KU Graduation Photo Kiosk")
    app.middleware("http")(add_cache_control)
    app.middleware("http")(log_api_time)

    app.include_router(catalog.router)
    app.include_router(consent.router)
    app.include_router(photos.router)
    app.include_router(realtime.router)

    app.mount("/assets", StaticFiles(directory=settings.assets_dir), name="assets")
    if settings.kiosk_dist.is_dir():  # built kiosk app, mounted last so API routes win
        app.mount("/", StaticFiles(directory=settings.kiosk_dist, html=True), name="kiosk")
    return app


app = create_app()
