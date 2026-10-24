"""Dress the visitor in the chosen outfit with Decart's try-on model (Lucy VTON) as a batch job, one per photo:
a one-second clip in, the dressed clip (MP4) out."""

import time

import httpx

JOBS = "https://api.decart.ai/v1/jobs"
MODEL = "lucy-vton-latest"
TIMEOUT_S = 120  # a job still queued or running after this is given up on

# Lucy VTON's prompting guide: one substitution naming one region, the reference image as the source of truth. It
# keeps the person by design, but swallowed arms on the hips into the gown's sleeves, hence the arms and hands
KEEP = " Keep the arms and hands visible, in the same pose."
GOWN_PROMPT = (
    "Substitute the outfit with the black academic graduation gown and cap from the reference image, with its exact "
    "collar, sash and tassel colours." + KEEP
)
# the whole outfit, top and bottom at their length: told only "the outfit", it kept a visitor's own shorts
OUTFIT_PROMPT = (
    "Substitute the whole outfit, top and bottom, with exactly the outfit in the reference image, at its full length."
    + KEEP
)


class DressError(Exception):
    """Decart took the request but gave no result (a failed or stalled try-on job)."""


def dress(api_key: str, clip: bytes, outfit: bytes, level: str) -> bytes:
    """The clip (MP4) with the visitor in `outfit`, as MP4: submit the job, poll it, download the result."""
    headers = {"X-API-KEY": api_key}
    r = httpx.post(
        f"{JOBS}/{MODEL}",
        headers=headers,
        data={"prompt": OUTFIT_PROMPT if level == "others" else GOWN_PROMPT, "enhance_prompt": "false"},
        files={"data": ("shot.mp4", clip, "video/mp4"), "reference_image": ("outfit.jpg", outfit, "image/jpeg")},
        timeout=60,
    )
    r.raise_for_status()
    job = r.json()["job_id"]
    deadline = time.monotonic() + TIMEOUT_S
    while True:
        s = httpx.get(f"{JOBS}/{job}", headers=headers, timeout=15)
        s.raise_for_status()
        status = s.json()["status"]
        if status == "completed":
            break
        if status == "failed":
            raise DressError(f"try-on job {job} failed")
        if time.monotonic() > deadline:
            raise DressError(f"try-on job {job} still {status} after {TIMEOUT_S}s")
        time.sleep(1)
    c = httpx.get(f"{JOBS}/{job}/content", headers=headers, timeout=60)
    c.raise_for_status()
    return c.content
