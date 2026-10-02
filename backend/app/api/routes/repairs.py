"""
Customer Repair routes -- /api/v1/repairs

GET  /my                           List authenticated customer's repairs (CUSTOMER only)
GET  /{repair_id}                  Get single repair for authenticated customer (CUSTOMER only)
POST /{repair_id}/approve-estimate Approve repair estimated cost (CUSTOMER only)

Note: /my is declared before /{repair_id} so it is not intercepted as a path param.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import require_roles
from app.core.database import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.repair import RepairResponse
from app.services import repair_service as svc

router = APIRouter(prefix="/repairs", tags=["Customer -- Repairs"])

_customer = require_roles(UserRole.CUSTOMER)


@router.get(
    "/my",
    response_model=list[RepairResponse],
    summary="List own repairs (CUSTOMER only)",
)
def list_my_repairs(
    current_user: User = Depends(_customer),
    db: Session = Depends(get_db),
) -> list[RepairResponse]:
    """
    Returns all repair jobs belonging to the authenticated customer.
    Customers never see another customer's repairs.
    """
    try:
        return svc.get_customer_repairs(db, current_user)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


@router.get(
    "/{repair_id}",
    response_model=RepairResponse,
    summary="Get single repair (CUSTOMER only)",
)
def get_customer_repair(
    repair_id: str,
    current_user: User = Depends(_customer),
    db: Session = Depends(get_db),
) -> RepairResponse:
    """
    Returns a single repair job if it belongs to the authenticated customer.
    - Returns 404 if repair does not exist.
    - Returns 403 if repair belongs to another customer.
    """
    try:
        return svc.get_customer_repair(db, current_user, repair_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


@router.post(
    "/{repair_id}/approve-estimate",
    response_model=RepairResponse,
    summary="Approve repair estimated cost (CUSTOMER only)",
)
def approve_repair_estimate(
    repair_id: str,
    current_user: User = Depends(_customer),
    db: Session = Depends(get_db),
) -> RepairResponse:
    """
    Approve the estimated cost for a repair job.
    - Returns 404 if repair does not exist.
    - Returns 403 if repair belongs to another customer.
    - Returns 409 if no estimate is set or repair is completed/cancelled.
    """
    try:
        return svc.approve_repair_estimate(db, current_user, repair_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
