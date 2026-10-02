"""
Admin Repair routes -- /api/v1/admin/repairs

GET /   List all repairs across all shops (ADMIN only)
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import require_roles
from app.core.database import get_db
from app.models.enums import RepairStatus, UserRole
from app.models.user import User
from app.schemas.repair import RepairResponse
from app.services import repair_service as svc

router = APIRouter(prefix="/admin/repairs", tags=["Admin -- Repairs"])

_admin = require_roles(UserRole.ADMIN)


@router.get(
    "",
    response_model=list[RepairResponse],
    summary="List all repairs across all shops (ADMIN only)",
)
@router.get(
    "/",
    response_model=list[RepairResponse],
    summary="List all repairs across all shops (ADMIN only)",
    include_in_schema=False,
)
def list_all_repairs(
    status_filter: RepairStatus | None = Query(
        default=None,
        alias="status",
        description="Filter by repair status (RECEIVED, DIAGNOSING, REPAIRING, READY, COMPLETED, CANCELLED)",
    ),
    current_user: User = Depends(_admin),
    db: Session = Depends(get_db),
) -> list[RepairResponse]:
    """
    List all repair jobs across all shops. Accessible only to ADMIN users.
    Supports optional status filtering.
    """
    try:
        return svc.get_admin_repairs(db, current_user, status_filter=status_filter)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
