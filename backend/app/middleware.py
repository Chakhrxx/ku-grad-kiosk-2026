import logging
import time
from collections.abc import Awaitable, Callable

from fastapi import Request, Response

log = logging.getLogger("uvicorn.error")

YEAR, HOUR, WEEK = 31_536_000, 3_600, 604_800


def cache_control_for(path: str) -> str | None:
    """Browser caching per kind of file, so the kiosk doesn't refetch what it already has."""
    if path.startswith("/static/"):  # kiosk build output: file names carry a content hash
        return f"public, max-age={YEAR}, immutable"
    if path.startswith("/assets/"):  # gowns, tiles, backgrounds: may be swapped mid-event under the same name
        return f"public, max-age={HOUR}"
    if path.startswith("/photos/"):  # one person's result, unique id, gone after retention
        return f"private, max-age={WEEK}"
    if path == "/" or path.endswith(".html"):  # app shell: always check, so a deploy shows up at once
        return "no-cache"
    return None


async def add_cache_control(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
    response = await call_next(request)
    if response.status_code in (200, 304) and (value := cache_control_for(request.url.path)):
        response.headers.setdefault("Cache-Control", value)
    return response


async def log_api_time(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
    """How long each API call took, e.g. minting the Decart token or finishing a photo (uvicorn logs no timings)."""
    t0 = time.perf_counter()
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        log.info(
            "%s %s -> %d in %.2fs", request.method, request.url.path, response.status_code, time.perf_counter() - t0
        )
    return response
