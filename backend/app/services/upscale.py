"""Sharpen the try-on model's frame: it comes back as compressed 720p video. Real-ESRGAN (realesr-general-x4v3,
see models/README.md) scales it ×4, crisp edges for the cap, tassel and sash instead of a soft blur."""

import io
from functools import lru_cache

import numpy as np
from PIL import Image

from app.config import BACKEND_DIR

MODEL = BACKEND_DIR / "models" / "realesr-general-x4v3.onnx"
# from this width: about 4 s on a CPU, and plenty for the photo; from 360 it looks painted, from 720 it takes 12 s
INPUT_WIDTH = 480


@lru_cache
def session():
    import onnxruntime  # imported here: a second or two, only once the first photo needs it

    return onnxruntime.InferenceSession(str(MODEL), providers=["CPUExecutionProvider"])


def upscale(photo: bytes) -> bytes:
    """`photo` brought to INPUT_WIDTH, then ×4 (JPEG)."""
    image = Image.open(io.BytesIO(photo)).convert("RGB")
    if image.width > INPUT_WIDTH:
        image = image.resize((INPUT_WIDTH, round(image.height * INPUT_WIDTH / image.width)), Image.Resampling.LANCZOS)
    x = (np.asarray(image, dtype=np.float32) / 255).transpose(2, 0, 1)[None]
    y = session().run(None, {"input": x})[0][0]
    out = Image.fromarray((np.clip(y.transpose(1, 2, 0), 0, 1) * 255).round().astype(np.uint8))
    buf = io.BytesIO()
    out.save(buf, "JPEG", quality=93)
    return buf.getvalue()
