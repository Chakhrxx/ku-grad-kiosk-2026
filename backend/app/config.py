"""Settings from the environment (or backend/.env)."""

from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    assets_dir: Path = BACKEND_DIR / "assets"
    data_dir: Path = BACKEND_DIR / "data"
    kiosk_dist: Path = BACKEND_DIR.parent / "kiosk" / "dist"

    decart_api_key: SecretStr = SecretStr("")
    public_url: str = ""
    """Base URL the QR code points to; empty means the request's own host."""

    max_per_day: int = 3000
    """Photos per rolling 24 hours, to protect the AI budget."""
    keep_days: int = 7
    """PDPA retention promised in the consent text."""
    max_upload_bytes: int = 10_000_000

    save_steps: bool = False
    """Debug only: keep each photo's steps in data/steps/<time>/ (as received from the kiosk, then framed).
    Never on with real visitors: these copies are not covered by the 7-day deletion."""


@lru_cache
def get_settings() -> Settings:
    return Settings()
