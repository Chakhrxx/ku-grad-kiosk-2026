from pydantic import BaseModel, Field


class PhotoOut(BaseModel):
    id: str
    image: str = Field(description="Path of the final JPEG on this server")
    url: str = Field(description="Download page the QR code opens")
    qr: str = Field(description="QR code for `url` as an SVG data URI")
