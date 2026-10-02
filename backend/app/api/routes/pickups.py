"""
Customer Pickup Request routes -- /api/v1/pickups

POST /              Create a pickup request (CUSTOMER only)
GET  /my            List current customer's pickup requests (CUSTOMER only)
GET  /{pickup_id}   Get details of a single pickup request (CUSTOMER only)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import require_roles
from app.core.database import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.pickup import PickupCreate, PickupResponse
from app.services import pickup_service as svc

router = APIRouter(prefix="/pickups", tags=["Pickups"])

_customer = require_roles(UserRole.CUSTOMER)


@router.post(
    "",
    response_model=PickupResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a pickup request (CUSTOMER only)",
)
@router.post(
    "/",
    response_model=PickupResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def create_pickup(
    body: PickupCreate,
    current_user: User = Depends(_customer),
    db: Session = Depends(get_db),
) -> PickupResponse:
    """
    Authenticated CUSTOMER creates a new pickup request for an approved, active shop.

    - Authenticated customer ID is used automatically (never trusted from request body).
    - Initial status is always PENDING.
    - Returns 404 if shop does not exist.
    - Returns 400 if shop is unapproved or inactive.
    """
    try:
        return svc.create_pickup(db, current_user, body)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


@router.get(
    "/my",
    response_model=list[PickupResponse],
    summary="List own pickup requests (CUSTOMER only)",
)
def get_my_pickups(
    current_user: User = Depends(_customer),
    db: Session = Depends(get_db),
) -> list[PickupResponse]:
    """
    Returns only pickup requests created by the authenticated customer.
    """
    try:
        return svc.get_customer_pickups(db, current_user)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


@router.get(
    "/{pickup_id}",
    response_model=PickupResponse,
    summary="Get single pickup request (CUSTOMER only)",
)
def get_pickup(
    pickup_id: int,
    current_user: User = Depends(_customer),
    db: Session = Depends(get_db),
) -> PickupResponse:
    """
    Returns a single pickup request if it belongs to the authenticated customer.

    - Returns 404 if pickup request does not exist.
    - Returns 403 if pickup request belongs to another customer.
    """
    try:
        return svc.get_customer_pickup(db, current_user, pickup_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
