"""
Shop Owner Pickup routes -- /api/v1/shop-owner/pickups

GET   /                     List pickup requests for owner's shop (SHOP_OWNER only)
GET   /{pickup_id}          Get single pickup request for owner's shop (SHOP_OWNER only)
POST  /{pickup_id}/accept   Accept a PENDING pickup request (SHOP_OWNER only)
POST  /{pickup_id}/reject   Reject a PENDING pickup request (SHOP_OWNER only)
PATCH /{pickup_id}/status   Update pickup request status (SHOP_OWNER only)
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import require_roles
from app.core.database import get_db
from app.models.enums import PickupStatus, UserRole
from app.models.user import User
from app.schemas.pickup import PickupReject, PickupResponse, PickupStatusUpdate
from app.services import pickup_service as svc

router = APIRouter(prefix="/shop-owner/pickups", tags=["Shop Owner -- Pickups"])

_shop_owner = require_roles(UserRole.SHOP_OWNER)


@router.get(
    "",
    response_model=list[PickupResponse],
    summary="List pickup requests for owner's shop (SHOP_OWNER only)",
)
@router.get(
    "/",
    response_model=list[PickupResponse],
    summary="List pickup requests for owner's shop (SHOP_OWNER only)",
    include_in_schema=False,
)
def list_shop_pickups(
    status_filter: PickupStatus | None = Query(
        default=None,
        alias="status",
        description="Filter by pickup status (PENDING, ACCEPTED, SCHEDULED, PICKED_UP, RECEIVED, REJECTED)",
    ),
    current_user: User = Depends(_shop_owner),
    db: Session = Depends(get_db),
) -> list[PickupResponse]:
    """
    Returns pickup requests for shops owned by the authenticated shop owner.
    Never allows viewing another shop's pickup requests.
    """
    try:
        return svc.get_shop_owner_pickups(db, current_user, status_filter=status_filter)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


@router.get(
    "/{pickup_id}",
    response_model=PickupResponse,
    summary="Get single pickup request (SHOP_OWNER only)",
)
def get_shop_pickup(
    pickup_id: int,
    current_user: User = Depends(_shop_owner),
    db: Session = Depends(get_db),
) -> PickupResponse:
    """
    Returns a single pickup request if it belongs to the authenticated owner's shop.

    - Returns 404 if pickup request does not exist.
    - Returns 403 if pickup request belongs to another shop.
    """
    try:
        return svc.get_shop_owner_pickup(db, current_user, pickup_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


@router.post(
    "/{pickup_id}/accept",
    response_model=PickupResponse,
    summary="Accept a pickup request (SHOP_OWNER only)",
)
def accept_pickup(
    pickup_id: int,
    current_user: User = Depends(_shop_owner),
    db: Session = Depends(get_db),
) -> PickupResponse:
    """
    Accept a PENDING pickup request (PENDING -> ACCEPTED).

    - Returns 404 if pickup does not exist.
    - Returns 403 if pickup belongs to another shop.
    - Returns 409 if pickup is not currently PENDING.
    """
    try:
        return svc.accept_pickup(db, current_user, pickup_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.post(
    "/{pickup_id}/reject",
    response_model=PickupResponse,
    summary="Reject a pickup request (SHOP_OWNER only)",
)
def reject_pickup(
    pickup_id: int,
    body: PickupReject | None = None,
    current_user: User = Depends(_shop_owner),
    db: Session = Depends(get_db),
) -> PickupResponse:
    """
    Reject a PENDING pickup request (PENDING -> REJECTED).

    - Returns 404 if pickup does not exist.
    - Returns 403 if pickup belongs to another shop.
    - Returns 409 if pickup is not currently PENDING.
    """
    reason = body.rejection_reason if body else None
    try:
        return svc.reject_pickup(db, current_user, pickup_id, rejection_reason=reason)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.patch(
    "/{pickup_id}/status",
    response_model=PickupResponse,
    summary="Update pickup request status (SHOP_OWNER only)",
)
def update_pickup_status(
    pickup_id: int,
    body: PickupStatusUpdate,
    current_user: User = Depends(_shop_owner),
    db: Session = Depends(get_db),
) -> PickupResponse:
    """
    Update pickup status strictly following forward transitions:
        PENDING -> ACCEPTED, REJECTED
        ACCEPTED -> SCHEDULED
        SCHEDULED -> PICKED_UP
        PICKED_UP -> RECEIVED

    - Returns 404 if pickup does not exist.
    - Returns 403 if pickup belongs to another shop.
    - Returns 409 if transition is invalid.
    """
    try:
        return svc.update_pickup_status(db, current_user, pickup_id, body.status)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
