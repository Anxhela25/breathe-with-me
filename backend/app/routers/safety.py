from fastapi import APIRouter

from app.schemas.safety import SafetyCheckIn, SafetyCheckOut
from app.services.safety import check_message

router = APIRouter(prefix="/api/safety", tags=["safety"])


@router.post("/check", response_model=SafetyCheckOut)
def safety_check(data: SafetyCheckIn):
    # only the level is returned, never the matched words
    return SafetyCheckOut(level=check_message(data.text).level)
