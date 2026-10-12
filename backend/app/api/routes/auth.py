"""
Authentication routes — /api/v1/auth

POST /register  — Customer account creation only
POST /login     — Works for all roles (CUSTOMER, SHOP_OWNER, ADMIN)
GET  /me        — Returns the authenticated user's profile
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.enums import ApplicationStatus, UserRole
from app.models.shop_application import ShopApplication
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


# ---------------------------------------------------------------------------
# Helper: build the JWT payload from a User
# ---------------------------------------------------------------------------

def _build_token(user: User) -> str:
    return create_access_token(
        {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
        }
    )


# ---------------------------------------------------------------------------
# POST /api/v1/auth/register
# ---------------------------------------------------------------------------

@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new customer account",
)
def register(body: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """
    Create a new **CUSTOMER** account.

    - Role is always set to CUSTOMER — users cannot choose their own role.
    - Returns a JWT access token on success.
    - Returns HTTP 409 if the email is already registered or has a pending shop application.
    """
    # Duplicate email check in users table
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    # Duplicate check for pending shop application
    pending_app = (
        db.query(ShopApplication)
        .filter(
            ShopApplication.applicant_email == body.email,
            ShopApplication.status == ApplicationStatus.PENDING,
        )
        .first()
    )
    if pending_app:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A shop owner application with this email is currently pending review.",
        )

    user = User(
        name=body.name,
        email=body.email,
        phone=body.phone,
        password_hash=hash_password(body.password),
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return TokenResponse(
        access_token=_build_token(user),
        user=UserResponse.model_validate(user),
    )


# ---------------------------------------------------------------------------
# POST /api/v1/auth/login
# ---------------------------------------------------------------------------

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login — works for CUSTOMER, SHOP_OWNER, and ADMIN",
)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """
    Authenticate with email + password.

    Returns a JWT access token valid for all roles.
    Returns HTTP 401 for invalid credentials or inactive accounts.
    Returns HTTP 403 with clear message if applicant is pending review or rejected.
    """
    user: User | None = db.query(User).filter(User.email == body.email).first()

    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if user is None:
        # Check if there is a pending or rejected shop application with this email and valid password
        app = (
            db.query(ShopApplication)
            .filter(ShopApplication.applicant_email == body.email)
            .order_by(ShopApplication.submitted_at.desc())
            .first()
        )
        if app and app.password_hash and verify_password(body.password, app.password_hash):
            if app.status == ApplicationStatus.PENDING:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your shop application is currently pending administrative review. You will be able to log in once approved.",
                )
            elif app.status == ApplicationStatus.REJECTED:
                rejection_msg = f" Reason: {app.rejection_reason}" if app.rejection_reason else ""
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Your shop application was rejected.{rejection_msg}",
                )
        raise invalid_credentials

    if not user.password_hash or not verify_password(body.password, user.password_hash):
        raise invalid_credentials

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is inactive.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return TokenResponse(
        access_token=_build_token(user),
        user=UserResponse.model_validate(user),
    )


# ---------------------------------------------------------------------------
# GET /api/v1/auth/me
# ---------------------------------------------------------------------------

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get the currently authenticated user",
)
def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """
    Returns the profile of the user associated with the Bearer token.

    Protected — requires a valid JWT in the Authorization header.
    """
    return UserResponse.model_validate(current_user)
