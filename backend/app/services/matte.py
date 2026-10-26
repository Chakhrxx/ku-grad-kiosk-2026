"""Cut the dressed visitor out of the room, finely: IS-Net (DIS, "isnet-general-use" as rembg ships it) keeps the
gown's sleeves, tassels, cap corners and fingers that the kiosk's own MediaPipe segmenter (256x256) loses.

The model (179 MB) is downloaded on first use into DATA_DIR/models; `python -m app.services.matte` fetches it ahead.
"""

import hashlib
import io
import logging
import threading
from functools import lru_cache
from pathlib import Path

import httpx
import numpy as np
from PIL import Image

from app.config import get_settings

log = logging.getLogger("uvicorn.error")

MODEL_URL = "https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx"
MODEL_MD5 = "fc16ebd8b0c10d971d3513d564d01e29"
SIZE = 1024  # the model's input, square
_lock = threading.Lock()  # one download, one session, even with photos in parallel


def model_path(data_dir: Path) -> Path:
    """The model file, downloaded (and checked) the first time."""
    path = data_dir / "models" / "isnet-general-use.onnx"
    with _lock:
        if not path.is_file():
            path.parent.mkdir(parents=True, exist_ok=True)
            log.info("downloading the matting model (179 MB) to %s", path)
            md5 = hashlib.md5()
            part = path.with_suffix(".part")
            with httpx.stream("GET", MODEL_URL, follow_redirects=True, timeout=120) as r, part.open("wb") as f:
                r.raise_for_status()
                for chunk in r.iter_bytes():
                    md5.update(chunk)
                    f.write(chunk)
            if md5.hexdigest() != MODEL_MD5:
                part.unlink()
                raise RuntimeError("matting model download is corrupt")
            part.rename(path)
    return path


@lru_cache
def session(data_dir: Path):
    import onnxruntime  # imported here: a second or two, only once the first photo needs it

    return onnxruntime.InferenceSession(str(model_path(data_dir)), providers=["CPUExecutionProvider"])


def person_matte(photo: bytes, data_dir: Path) -> bytes:
    """`photo` with the visitor kept and the room gone: a white PNG whose alpha is the visitor, at the photo's size."""
    image = Image.open(io.BytesIO(photo)).convert("RGB")
    # as rembg prepares it for this model: scaled to its square input, 0..1 by the brightest value, centred on 0.5
    x = np.asarray(image.resize((SIZE, SIZE), Image.Resampling.LANCZOS), dtype=np.float32)
    x = x / max(float(x.max()), 1e-6) - 0.5
    s = session(data_dir)
    pred = s.run(None, {s.get_inputs()[0].name: x.transpose(2, 0, 1)[None]})[0][0, 0]
    pred = (pred - pred.min()) / max(float(pred.max() - pred.min()), 1e-6)
    alpha = Image.fromarray((pred * 255).astype(np.uint8), mode="L").resize(image.size, Image.Resampling.LANCZOS)
    out = Image.new("RGBA", image.size, (255, 255, 255, 0))
    out.putalpha(alpha)
    buf = io.BytesIO()
    out.save(buf, "PNG")
    return buf.getvalue()


if __name__ == "__main__":
    print(model_path(get_settings().data_dir))
