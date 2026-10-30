import json

from app.config import BACKEND_DIR
from app.services.dress import KEEP, OUTFIT_PROMPTS, outfit_prompt


def test_every_other_outfit_has_its_own_prompt():
    others = json.loads((BACKEND_DIR / "assets" / "catalog.json").read_text())["others"]
    assert {o["id"] for o in others} == set(OUTFIT_PROMPTS)


def test_prompt_names_the_bottom_and_covers_the_visitors_own():
    p = outfit_prompt("female-uniform")
    assert "pleated skirt" in p and "fully covers the visitor's own" in p and p.endswith(KEEP)
    assert "trousers" in outfit_prompt("mohom") and "trousers" in outfit_prompt("male-uniform")
