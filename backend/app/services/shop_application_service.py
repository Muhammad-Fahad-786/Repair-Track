"""
Shop Application Service -- all business logic for the shop registration workflow.

Routes call into here; this module does NOT import from FastAPI.
The approval operation is fully transactional.
"""
import re
import unicodedata
from datetime import datetime, timezone

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.models.enums import ApplicationStatus, ShopStatus, UserRole
from app.models.shop import Shop
from app.models.shop_application import ShopApplication
from app.models.user import User
from app.schemas.shop_application import (
    ShopApplicationAdminResponse,
    ShopApplicationCreate,
    ShopApplicationResponse,
)


def _slugify(text: str) -> str:
    """Convert text to a URL-safe, lowercase slug."""
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "-", text)


def _unique_slug(db: Session, base: str) -> str:
    """Return a slug that does not already exist in the shops table."""
    slug = _slugify(base)
    candidate = slug
    counter = 1
    while db.query(Shop).filter(Shop.slug == candidate).first():
        candidate = f"{slug}-{counter}"
        counter += 1
    return candidate


def _to_admin_response(app: ShopApplication) -> ShopApplicationAdminResponse:
    """Map a ShopApplication ORM object to the admin response schema."""
    name = app.applicant.name if app.applicant else app.applicant_name
    email = app.applicant.email if app.applicant else app.applicant_email
    phone = app.applicant.phone if app.applicant else app.applicant_phone
    return ShopApplicationAdminResponse(
        id=app.id,
        applicant_id=app.applicant_id,
        applicant_name=name,
        applicant_email=email,
        applicant_phone=phone,
        shop_name=app.shop_name,
        description=app.description,
        address=app.address,
        city=app.city,
        services=app.services,
        pickup_available=app.pickup_available,
        status=app.status,
        submitted_at=app.submitted_at,
        reviewed_at=app.reviewed_at,
        rejection_reason=app.rejection_reason,
        reviewed_by=app.reviewed_by,
    )


def _to_applicant_response(app: ShopApplication, include_token: bool = False) -> ShopApplicationResponse:
    """Map a ShopApplication ORM object to the safe applicant response schema."""
    name = app.applicant_name or (app.applicant.name if app.applicant else None)
    email = app.applicant_email or (app.applicant.email if app.applicant else None)
    phone = app.applicant_phone or (app.applicant.phone if app.applicant else None)
    token = None
    if include_token:
        token = create_access_token(
            {
                "sub": str(app.id),
                "email": email or "",
                "type": "shop_application",
            }
        )
    return ShopApplicationResponse(
        id=app.id,
        shop_name=app.shop_name,
        description=app.description,
        address=app.address,
        city=app.city,
        services=app.services,
        pickup_available=app.pickup_available,
        status=app.status,
        submitted_at=app.submitted_at,
        rejection_reason=app.rejection_reason,
        applicant_name=name,
        applicant_email=email,
        applicant_phone=phone,
        application_token=token,
    )


def submit_application(
    db: Session,
    data: ShopApplicationCreate,
    current_user: User | None = None,
) -> ShopApplicationResponse:
    """
    Create a new PENDING ShopApplication.
    Supports unauthenticated prospective shop owners as well as authenticated users.
    Does NOT require the applicant to be or create a Customer account first.
    Raises ValueError for business-rule violations (mapped to HTTP 409 or 422).
    """
    # 1. Resolve applicant details
    if current_user:
        applicant_name = (data.name or current_user.name).strip()
        applicant_email = (data.email or current_user.email).strip().lower()
        applicant_phone = (data.phone or current_user.phone).strip() if (data.phone or current_user.phone) else None
        pwd_hash = hash_password(data.password) if data.password else current_user.password_hash
        applicant_id = current_user.id
    else:
        # Unauthenticated applicant: name, email, password are required
        if not data.name or not data.name.strip():
            raise ValueError("Full name is required for registration.")
        if not data.email:
            raise ValueError("Email is required for registration.")
        if not data.password or len(data.password) < 8:
            raise ValueError("Password must be at least 8 characters.")

        applicant_name = data.name.strip()
        applicant_email = data.email.strip().lower()
        applicant_phone = data.phone.strip() if data.phone else None
        pwd_hash = hash_password(data.password)
        applicant_id = None

    # 2. Duplicate email rules (Section 6)
    existing_user = db.query(User).filter(User.email == applicant_email).first()
    if existing_user:
        if current_user and current_user.id == existing_user.id:
            pass  # Authenticated user submitting an application
        elif existing_user.role == UserRole.CUSTOMER:
            raise ValueError("An account with this email is already registered as a customer.")
        elif existing_user.role == UserRole.SHOP_OWNER:
            raise ValueError("An account with this email is already registered as a shop owner.")
        else:
            raise ValueError("An account with this email is already registered.")

    # Check if there is an existing PENDING application with this email or applicant_id
    existing_pending = db.query(ShopApplication).filter(
        ShopApplication.status == ApplicationStatus.PENDING,
        or_(
            ShopApplication.applicant_email == applicant_email,
            (ShopApplication.applicant_id == applicant_id) if applicant_id else False,
        )
    ).first()
    if existing_pending:
        raise ValueError("You already have a pending shop application under review.")

    # Check if applicant already owns an approved shop
    if applicant_id:
        approved_shop = db.query(Shop).filter(
            Shop.owner_id == applicant_id,
            Shop.status == ShopStatus.APPROVED,
        ).first()
        if approved_shop:
            raise ValueError("You already own an approved shop.")

    # 3. Create ShopApplication record
    application = ShopApplication(
        applicant_id=applicant_id,
        applicant_name=applicant_name,
        applicant_email=applicant_email,
        applicant_phone=applicant_phone,
        password_hash=pwd_hash,
        shop_name=data.shop_name,
        description=data.description,
        address=data.address,
        city=data.city,
        services=data.services,
        pickup_available=data.pickup_available,
        status=ApplicationStatus.PENDING,
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    return _to_applicant_response(application, include_token=True)


def get_my_applications(db: Session, applicant: User) -> list[ShopApplicationResponse]:
    """Return all applications submitted by or linked to applicant."""
    apps = (
        db.query(ShopApplication)
        .filter(
            or_(
                ShopApplication.applicant_id == applicant.id,
                ShopApplication.applicant_email == applicant.email,
            )
        )
        .order_by(ShopApplication.submitted_at.desc())
        .all()
    )
    return [_to_applicant_response(a) for a in apps]


def get_application_by_token(db: Session, token: str) -> ShopApplicationResponse:
    """Retrieve an application using a signed application token."""
    try:
        payload = decode_access_token(token)
        if payload.get("type") != "shop_application":
            raise ValueError("Invalid application token.")
        app_id = int(payload.get("sub", 0))
    except Exception:
        raise ValueError("Invalid or expired application token.")

    app = db.get(ShopApplication, app_id)
    if app is None:
        raise LookupError(f"Application #{app_id} not found.")

    return _to_applicant_response(app, include_token=True)


def status_check_by_credentials(db: Session, email: str, password: str) -> ShopApplicationResponse:
    """
    Authenticate an applicant using email and password to securely view their application status.
    Raises LookupError if application not found, PermissionError if credentials do not match.
    """
    norm_email = email.strip().lower()
    app = (
        db.query(ShopApplication)
        .filter(
            or_(
                ShopApplication.applicant_email == norm_email,
                ShopApplication.applicant.has(User.email == norm_email),
            )
        )
        .order_by(ShopApplication.submitted_at.desc())
        .first()
    )
    if not app:
        raise LookupError("No application found with this email.")

    target_hash = app.password_hash or (app.applicant.password_hash if app.applicant else None)
    if not target_hash or not verify_password(password, target_hash):
        raise PermissionError("Invalid email or password.")

    return _to_applicant_response(app, include_token=True)


def list_applications(
    db: Session,
    status_filter: ApplicationStatus | None = None,
) -> list[ShopApplicationAdminResponse]:
    """Return all applications, optionally filtered by status."""
    q = db.query(ShopApplication)
    if status_filter is not None:
        q = q.filter(ShopApplication.status == status_filter)
    apps = q.order_by(ShopApplication.submitted_at.desc()).all()
    return [_to_admin_response(a) for a in apps]


def approve_application(
    db: Session,
    application_id: int,
    reviewer: User,
) -> ShopApplicationAdminResponse:
    """
    Approve a PENDING application.

    Transactional: either ALL of the following succeed or nothing is persisted:
      1. Validate the application exists and is PENDING.
      2. If applicant User does not exist, create SHOP_OWNER user account.
      3. If applicant User exists, promote/verify role is SHOP_OWNER and active.
      4. Create an APPROVED Shop linked to the owner.
      5. Link the Shop to the application and record reviewer.
      6. Mark the application APPROVED.

    Raises:
        LookupError -- application not found (caller maps to 404).
        ValueError  -- business-rule violation (caller maps to 409 / 400).
    """
    application = db.get(ShopApplication, application_id)
    if application is None:
        raise LookupError(f"Application {application_id} not found.")

    if application.status != ApplicationStatus.PENDING:
        raise ValueError(
            f"Application is already {application.status.value} and cannot be approved again."
        )

    # Resolve or create the applicant User record
    applicant = None
    if application.applicant_id:
        applicant = db.get(User, application.applicant_id)

    if applicant is None and application.applicant_email:
        applicant = db.query(User).filter(User.email == application.applicant_email).first()

    if applicant is None:
        # Create new SHOP_OWNER account from application credentials
        applicant = User(
            name=application.applicant_name or "Shop Owner",
            email=application.applicant_email,
            phone=application.applicant_phone,
            password_hash=application.password_hash,
            role=UserRole.SHOP_OWNER,
            is_active=True,
        )
        db.add(applicant)
        db.flush()  # Populates applicant.id
    else:
        applicant.role = UserRole.SHOP_OWNER
        applicant.is_active = True
        applicant.updated_at = datetime.now(timezone.utc)
        db.add(applicant)

    # Verify applicant does not already have an approved shop
    existing_approved_shop = (
        db.query(Shop)
        .filter(
            Shop.owner_id == applicant.id,
            Shop.status == ShopStatus.APPROVED,
        )
        .first()
    )
    if existing_approved_shop:
        raise ValueError("This applicant already owns an approved shop.")

    try:
        slug = _unique_slug(db, application.shop_name)
        shop = Shop(
            owner_id=applicant.id,
            name=application.shop_name,
            slug=slug,
            description=application.description,
            address=application.address,
            city=application.city,
            phone=applicant.phone,
            email=applicant.email,
            status=ShopStatus.APPROVED,
            is_active=True,
        )
        db.add(shop)
        db.flush()

        application.applicant_id = applicant.id
        application.shop_id = shop.id
        application.status = ApplicationStatus.APPROVED
        application.reviewed_by = reviewer.id
        application.reviewed_at = datetime.now(timezone.utc)
        db.add(application)

        db.commit()
        db.refresh(application)
        db.refresh(applicant)
        db.refresh(shop)

    except Exception:
        db.rollback()
        raise

    return _to_admin_response(application)


def reject_application(
    db: Session,
    application_id: int,
    reviewer: User,
    rejection_reason: str,
) -> ShopApplicationAdminResponse:
    """
    Reject a PENDING application.

    - Does NOT create a Shop Owner account.
    - Does NOT create or activate a shop.
    - Stores the rejection reason and reviewer ID.

    Raises:
        LookupError -- application not found (caller maps to 404).
        ValueError  -- business-rule violation (caller maps to 400 / 409).
    """
    if not rejection_reason or not rejection_reason.strip():
        raise ValueError("A rejection reason is required.")

    application = db.get(ShopApplication, application_id)
    if application is None:
        raise LookupError(f"Application {application_id} not found.")

    if application.status != ApplicationStatus.PENDING:
        raise ValueError(
            f"Application is already {application.status.value} and cannot be rejected again."
        )

    try:
        application.status = ApplicationStatus.REJECTED
        application.rejection_reason = rejection_reason.strip()
        application.reviewed_by = reviewer.id
        application.reviewed_at = datetime.now(timezone.utc)
        db.add(application)
        db.commit()
        db.refresh(application)
    except Exception:
        db.rollback()
        raise

    return _to_admin_response(application)