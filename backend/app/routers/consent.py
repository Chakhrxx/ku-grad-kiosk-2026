from fastapi import APIRouter

from app.dependencies import StorageDep
from app.schemas import ConsentIn, ConsentOut

router = APIRouter(prefix="/api", tags=["consent"])


@router.post("/consent")
def give_consent(body: ConsentIn, storage: StorageDep) -> ConsentOut:
    """Record PDPA consent for a kiosk session. Generating a photo requires it."""
    storage.save_consent(body.session, body.lang)
    return ConsentOut()
