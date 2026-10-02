"""
Shop Application Service -- all business logic for the shop registration workflow.

Routes call into here; this module does NOT import from FastAPI.
The approval operation is fully transactional.
"""
import re
import unicodedata
from datetime import datetime, timezone

from sqlalchemy.orm import Session

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
    return ShopApplicationAdminResponse(
        id=app.id,
        applicant_id=app.applicant_id,
        applicant_name=app.applicant.name if app.applicant else None,
        applicant_email=app.applicant.email if app.applicant else None,
        applicant_phone=app.applicant.phone if app.applicant else None,
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


def submit_application(
    db: Session,
    applicant: User,
    data: ShopApplicationCreate,
) -> ShopApplicationResponse:
    """
    Create a new PENDING ShopApplication for an authenticated CUSTOMER.
    Raises ValueError for business-rule violations (caller maps to HTTP 409).
    """
    if applicant.role != UserRole.CUSTOMER:
        raise ValueError("Only customers may submit a shop application.")

    existing_pending = (
        db.query(ShopApplication)
        .filter(
            ShopApplication.applicant_id == applicant.id,
            ShopApplication.status == ApplicationStatus.PENDING,
        )
        .first()
    )
    if existing_pending:
        raise ValueError("You already have a pending shop application.")

    approved_shop = (
        db.query(Shop)
        .filter(
            Shop.owner_id == applicant.id,
            Shop.status == ShopStatus.APPROVED,
        )
        .first()
    )
    if approved_shop:
        raise ValueError("You already own an approved shop.")

    application = ShopApplication(
        applicant_id=applicant.id,
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
    return ShopApplicationResponse.model_validate(application)


def get_my_applications(db: Session, applicant: User) -> list[ShopApplicationResponse]:
    """Return all applications submitted by applicant."""
    apps = (
        db.query(ShopApplication)
        .filter(ShopApplication.applicant_id == applicant.id)
        .order_by(ShopApplication.submitted_at.desc())
        .all()
    )
    return [ShopApplicationResponse.model_validate(a) for a in apps]


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
      2. Validate the applicant is still eligible.
      3. Promote the applicant role to SHOP_OWNER.
      4. Create an APPROVED Shop linked to the owner.
      5. Link the Shop to the application.
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

    applicant = db.get(User, application.applicant_id)
    if applicant is None:
        raise ValueError("The applicant account no longer exists.")

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
        applicant.role = UserRole.SHOP_OWNER
        applicant.is_active = True
        applicant.updated_at = datetime.now(timezone.utc)
        db.add(applicant)

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

    - Does NOT change the applicant role.
    - Does NOT create or activate a shop.
    - Stores the rejection reason.

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