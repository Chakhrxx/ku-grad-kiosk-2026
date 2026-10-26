from typing import Literal

from pydantic import BaseModel, Field

SESSION_PATTERN = r"^[A-Za-z0-9_-]{8,64}$"


class ConsentIn(BaseModel):
    session: str = Field(pattern=SESSION_PATTERN, description="Kiosk session id (a UUID from the kiosk)")
    lang: Literal["th", "en"]


class ConsentOut(BaseModel):
    ok: bool = True
