"""Dress the visitor's camera photo in the chosen outfit with Decart's image edit model, one request per photo."""

import httpx

URL = "https://api.decart.ai/v1/generate/lucy-image-latest"

# ponytail: same wording as the try-on stream's prompts (kiosk/src/hooks/useTryOnStream.ts); drop those if the
# stream goes for good
GOWN_PROMPT = (
    "Substitute the current outfit with the full-length black academic graduation gown from the reference image: "
    "a loose pleated robe falling below the knees, wide bell sleeves to the wrists, closed at the front, "
    "with the exact collar, sash and tassel colours of the reference, and the black graduation cap with its tassel "
    "on the head. Keep the face, hair and pose unchanged."
)
OUTFIT_PROMPT = (
    "Substitute the current outfit with exactly the outfit in the reference image, same cut, colours and details. "
    "Keep the face, hair and pose unchanged."
)


def dress(api_key: str, photo: bytes, outfit: bytes, level: str) -> bytes:
    """The photo with the visitor in `outfit`, as PNG. A 9:16 photo comes back 720x1280, in about 15 s."""
    r = httpx.post(
        URL,
        headers={"X-API-KEY": api_key},
        data={
            "prompt": OUTFIT_PROMPT if level == "others" else GOWN_PROMPT,
            "resolution": "720p",
            "enhance_prompt": "false",
        },
        files={"data": ("photo.jpg", photo, "image/jpeg"), "reference_image": ("outfit.jpg", outfit, "image/jpeg")},
        timeout=60,
    )
    r.raise_for_status()
    return r.content
