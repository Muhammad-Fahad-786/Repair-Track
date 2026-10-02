"""
Admin shop-application routes -- /api/v1/admin/shop-applications

GET  /                          List all applications (ADMIN only)
POST /{application_id}/approve  Approve a PENDING application (ADMIN only)
POST /{application_id}/reject   Reject a PENDING application (ADMIN only)
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import require_roles
from app.core.database import get_db
from app.models.enums import ApplicationStatus, UserRole
from app.models.user import User
from app.schemas.shop_application import (
    ShopApplicationAdminResponse,
    ShopApplicationReject,
)
from app.services import shop_application_service as svc

router = APIRouter(
    prefix="/admin/shop-applications",
    tags=["Admin -- Shop Applications"],
)

_admin = require_roles(UserRole.ADMIN)


@router.get(
    "/",
    response_model=list[ShopApplicationAdminResponse],
    summary="List all shop applications (ADMIN only)",
)
def list_applications(
    status: ApplicationStatus | None = Query(
        default=None,
        description="Filter by application status (PENDING, APPROVED, REJECTED)",
    ),
    admin: User = Depends(_admin),
    db: Session = Depends(get_db),
) -> list[ShopApplicationAdminResponse]:
    """
    Returns all shop applications with full details for admin review.
    Optional query param: ?status=PENDING
    """
    return svc.list_applications(db, status_filter=status)


@router.post(
    "/{application_id}/approve",
    response_model=ShopApplicationAdminResponse,
    summary="Approve a shop application (ADMIN only)",
)
def approve_application(
    application_id: int,
    admin: User = Depends(_admin),
    db: Session = Depends(get_db),
) -> ShopApplicationAdminResponse:
    """
    Approve a PENDING shop application.

    Side-effects (all atomic):
    - Applicant role -> SHOP_OWNER
    - Creates an APPROVED Shop linked to the owner
    - Application status -> APPROVED

    Returns HTTP 404 if the application does not exist.
    Returns HTTP 409 if the application is not PENDING.
    """
    try:
        return svc.approve_application(db, application_id, admin)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.post(
    "/{application_id}/reject",
    response_model=ShopApplicationAdminResponse,
    summary="Reject a shop application (ADMIN only)",
)
def reject_application(
    application_id: int,
    body: ShopApplicationReject,
    admin: User = Depends(_admin),
    db: Session = Depends(get_db),
) -> ShopApplicationAdminResponse:
    """
    Reject a PENDING shop application.

    - Requires a non-empty rejection_reason in the request body.
    - Does NOT change the applicant role or create any shop.
    - Application status -> REJECTED.

    Returns HTTP 404 if the application does not exist.
    Returns HTTP 409 if the application is not PENDING.
    Returns HTTP 422 if rejection_reason is empty (Pydantic validation).
    """
    try:
        return svc.reject_application(db, application_id, admin, body.rejection_reason)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))