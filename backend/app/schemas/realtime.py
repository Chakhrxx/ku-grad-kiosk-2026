from pydantic import BaseModel, Field

from app.schemas.consent import SESSION_PATTERN


class RealtimeTokenIn(BaseModel):
    session: str = Field(pattern=SESSION_PATTERN)


class RealtimeTokenOut(BaseModel):
    apiKey: str = Field(description="Client token for the Decart realtime SDK; expires in about a minute")
    expiresAt: str
