"""
Shop Application routes -- /api/v1/shop-applications

POST /      Submit a new shop application (CUSTOMER only)
GET  /my    List the authenticated customer's own applications
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, require_roles
from app.core.database import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.shop_application import ShopApplicationCreate, ShopApplicationResponse
from app.services import shop_application_service as svc

router = APIRouter(prefix="/shop-applications", tags=["Shop Applications"])


@router.post(
    "/",
    response_model=ShopApplicationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a shop registration application (CUSTOMER only)",
)
def submit_application(
    body: ShopApplicationCreate,
    current_user: User = Depends(require_roles(UserRole.CUSTOMER)),
    db: Session = Depends(get_db),
) -> ShopApplicationResponse:
    """
    Authenticated CUSTOMERs may submit a shop registration application.

    Role must be CUSTOMER (enforced by dependency).
    Only one pending application per customer is allowed.
    Returns HTTP 409 if the customer already has a pending application
    or an approved shop.
    """
    try:
        return svc.submit_application(db, current_user, body)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )


@router.get(
    "/my",
    response_model=list[ShopApplicationResponse],
    summary="List the current user's own shop applications",
)
def my_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ShopApplicationResponse]:
    """
    Returns all shop applications submitted by the authenticated user.
    Accessible by any authenticated user (customers see their own records).
    """
    return svc.get_my_applications(db, current_user)