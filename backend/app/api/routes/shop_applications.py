"""
Shop Application routes -- /api/v1/shop-applications

POST /             Submit a new shop application (unauthenticated or authenticated)
GET  /status       Get application details using application tracking token
POST /status-check Check application status securely using applicant email + password
GET  /my           List the authenticated user's own applications
"""
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_optional_current_user
from app.core.database import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.shop_application import (
    ShopApplicationCreate,
    ShopApplicationResponse,
    ShopApplicationStatusCheckRequest,
)
from app.services import shop_application_service as svc

router = APIRouter(prefix="/shop-applications", tags=["Shop Applications"])


@router.post(
    "/",
    response_model=ShopApplicationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a shop registration application",
)
def submit_application(
    body: ShopApplicationCreate,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> ShopApplicationResponse:
    """
    Submit a shop registration application.

    - Unauthenticated applicants may submit with name, email, password, and shop details.
    - No Customer account is required.
    - If authenticated as SHOP_OWNER or ADMIN, returns 403 Forbidden.
    - Returns HTTP 409 if duplicate email or pending application already exists.
    """
    if current_user:
        if current_user.role == UserRole.SHOP_OWNER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Shop owners cannot submit new shop applications.",
            )
        if current_user.role == UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Administrators cannot submit shop applications.",
            )

    try:
        return svc.submit_application(db, body, current_user)
    except ValueError as exc:
        msg = str(exc)
        status_code = status.HTTP_422_UNPROCESSABLE_ENTITY if "required" in msg.lower() or "character" in msg.lower() else status.HTTP_409_CONFLICT
        raise HTTPException(
            status_code=status_code,
            detail=msg,
        )


@router.get(
    "/status",
    response_model=ShopApplicationResponse,
    summary="Check shop application status using application token",
)
def check_status_by_token(
    token: str | None = Query(default=None, description="Application token from submission"),
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> ShopApplicationResponse:
    """
    Retrieve application status securely using an application tracking token.
    Token can be supplied in Authorization: Bearer <token> or via ?token= query parameter.
    """
    raw_token = token
    if not raw_token and authorization and authorization.lower().startswith("bearer "):
        raw_token = authorization[7:].strip()

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Application tracking token is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        return svc.get_application_by_token(db, raw_token)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))


@router.post(
    "/status-check",
    response_model=ShopApplicationResponse,
    summary="Check shop application status using email and password",
)
def check_status_by_credentials(
    body: ShopApplicationStatusCheckRequest,
    db: Session = Depends(get_db),
) -> ShopApplicationResponse:
    """
    Authenticate an applicant using their registered email and password
    to view their application status. Prevents unauthorized viewing.
    """
    try:
        return svc.status_check_by_credentials(db, body.email, body.password)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))


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
    Returns all shop applications submitted by or linked to the authenticated user.
    """
    return svc.get_my_applications(db, current_user)