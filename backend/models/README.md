# Models

`realesr-general-x4v3.onnx` upscales the try-on model's 720p frame (×4) before the kiosk finishes the photo.

- Source: the official Real-ESRGAN weights, `realesr-general-x4v3.pth` from
  https://github.com/xinntao/Real-ESRGAN/releases/tag/v0.2.5.0
  (sha256 `8dc7edb9ac80ccdc30c3a5dca6616509367f05fbc184ad95b731f05bece96292`)
- Converted with `scripts/export_realesrgan.py` (needs `torch` and `onnx`, not in the backend's dependencies):
  `python scripts/export_realesrgan.py realesr-general-x4v3.pth models/realesr-general-x4v3.onnx`
  (sha256 of the result `f788518cc66e302bc9b6946016e989dd9374f1012d5b6c0c7e753904ef3f99e4`)
- License: Real-ESRGAN is BSD-3-Clause, Copyright (c) 2021, Xintao Wang.

The matting model (179 MB) is not kept here; `python -m app.services.matte` downloads it into `data/models`.
