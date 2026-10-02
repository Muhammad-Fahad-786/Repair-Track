"""
Public Repair Tracking routes -- /api/v1/track

GET /{repair_id}   Public repair status timeline (No authentication required)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.repair import RepairTrackingResponse
from app.services import repair_service as svc

router = APIRouter(prefix="/track", tags=["Public -- Repair Tracking"])


@router.get(
    "/{repair_id}",
    response_model=RepairTrackingResponse,
    summary="Track repair progress publicly (No login required)",
)
def track_repair(
    repair_id: str,
    db: Session = Depends(get_db),
) -> RepairTrackingResponse:
    """
    Publicly tracks a repair using the human-readable Repair ID (e.g. RT-SH001-X7K92).

    Exposes ONLY safe tracking data:
    - repair_id, shop_name, device details, problem description, status, estimated cost, history timeline.
    NEVER exposes customer identity, address, phone, email, or passwords.

    - Returns 404 if repair does not exist.
    """
    try:
        return svc.get_public_tracking(db, repair_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
