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


def test_steps_folders_are_numbered_per_solution(tmp_path: Path):
    from app.services.frame import new_steps_folder

    assert new_steps_folder(tmp_path, "vton-batch", "outfit: bachelor/engineering") == "no-preview-bg/01"
    assert new_steps_folder(tmp_path, "vton-batch", "") == "no-preview-bg/02"
    assert new_steps_folder(tmp_path, "vton-live", "") == "preview-bg/01"
    info = (tmp_path / "steps" / "no-preview-bg" / "01" / "info.txt").read_text()
    assert "outfit: bachelor/engineering" in info
