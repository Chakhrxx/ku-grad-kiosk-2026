import io
from pathlib import Path

from PIL import Image

from app.services.frame import add_frame


def jpeg(color: tuple[int, int, int], size=(90, 160)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, "JPEG")
    return buf.getvalue()


def test_frame_is_drawn_over_the_photo(tmp_path: Path):
    frame = Image.new("RGBA", (45, 80), (0, 0, 0, 0))
    frame.paste((255, 255, 255, 255), (0, 0, 45, 10))  # a white band along the top
    frame.save(tmp_path / "farm.png")
    out = Image.open(io.BytesIO(add_frame(jpeg((0, 128, 0)), tmp_path / "farm.png")))
    assert out.size == (90, 160)
    assert out.getpixel((45, 5))[0] > 200  # frame band, scaled to the photo
    assert out.getpixel((45, 100))[1] > 100  # photo shows through elsewhere


def test_without_a_frame_the_photo_passes_through(tmp_path: Path):
    out = Image.open(io.BytesIO(add_frame(jpeg((0, 128, 0)), tmp_path / "none.png")))
    assert out.size == (90, 160) and out.getpixel((45, 80))[1] > 100


def test_save_steps_keeps_both_stages(tmp_path: Path, monkeypatch):
    from app.config import Settings
    from app.services import frame

    monkeypatch.setattr(frame, "get_settings", lambda: Settings(_env_file=None, data_dir=tmp_path, save_steps=True))
    add_frame(jpeg((0, 128, 0)), tmp_path / "none.png")
    (folder,) = (tmp_path / "steps").iterdir()
    assert sorted(p.name for p in folder.iterdir()) == ["1-from-kiosk.jpg", "2-framed.jpg"]


def test_no_steps_kept_by_default(tmp_path: Path, monkeypatch):
    from app.config import Settings
    from app.services import frame

    monkeypatch.setattr(frame, "get_settings", lambda: Settings(_env_file=None, data_dir=tmp_path))
    add_frame(jpeg((0, 128, 0)), tmp_path / "none.png")
    assert not (tmp_path / "steps").exists()
