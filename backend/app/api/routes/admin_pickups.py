"""
Admin Pickup routes -- /api/v1/admin/pickups

GET /   List all pickup requests across all shops (ADMIN only)
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.dependencies import require_roles
from app.core.database import get_db
from app.models.enums import PickupStatus, UserRole
from app.models.user import User
from app.schemas.pickup import PickupResponse
from app.services import pickup_service as svc

router = APIRouter(prefix="/admin/pickups", tags=["Admin -- Pickups"])

_admin = require_roles(UserRole.ADMIN)


@router.get(
    "",
    response_model=list[PickupResponse],
    summary="List all pickup requests across all shops (ADMIN only)",
)
@router.get(
    "/",
    response_model=list[PickupResponse],
    summary="List all pickup requests across all shops (ADMIN only)",
    include_in_schema=False,
)
def list_all_pickups(
    status_filter: PickupStatus | None = Query(
        default=None,
        alias="status",
        description="Filter by pickup status (PENDING, ACCEPTED, SCHEDULED, PICKED_UP, RECEIVED, REJECTED)",
    ),
    admin: User = Depends(_admin),
    db: Session = Depends(get_db),
) -> list[PickupResponse]:
    """
    Returns all pickup requests across all shops with full details.
    Optional query parameter: ?status=PENDING
    """
    return svc.admin_list_pickups(db, status_filter=status_filter)
