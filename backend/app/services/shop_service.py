"""
Shop Service -- business logic for public shop discovery and profile retrieval.

Rules:
- Read-only operations for the public marketplace.
- STRICT status enforcement: ONLY shops with status == ShopStatus.APPROVED and is_active == True
  are returned publicly. Pending, rejected, or inactive shops are never exposed.
- Never exposes sensitive user, auth, or admin data.
"""
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.models.enums import ApplicationStatus, ShopStatus
from app.models.shop import Shop
from app.schemas.shop import PublicShopResponse


def _to_public_response(shop: Shop) -> PublicShopResponse:
    """Map a Shop ORM object to PublicShopResponse schema."""
    pickup_available = False
    services = None

    if shop.applications:
        for app in shop.applications:
            if app.status == ApplicationStatus.APPROVED:
                pickup_available = bool(app.pickup_available)
                if app.services:
                    services = app.services
                break

    return PublicShopResponse(
        id=shop.id,
        name=shop.name,
        slug=shop.slug,
        description=shop.description,
        category=shop.category or "Multi-Device Repair",
        phone=shop.phone,
        email=shop.email,
        address=shop.address,
        city=shop.city,
        state=shop.state,
        status=shop.status.value if hasattr(shop.status, "value") else str(shop.status),
        is_active=shop.is_active,
        pickup_available=pickup_available,
        services=services,
        created_at=shop.created_at,
    )


def get_public_shops(
    db: Session,
    location: str | None = None,
    search: str | None = None,
    category: str | None = None,
) -> list[PublicShopResponse]:
    """
    Retrieve approved, active shops with optional filtering.

    Public visibility rule: ONLY ShopStatus.APPROVED and is_active == True.
    """
    query = (
        db.query(Shop)
        .options(joinedload(Shop.applications))
        .filter(Shop.status == ShopStatus.APPROVED, Shop.is_active.is_(True))
    )

    if location and location.strip():
        loc = location.strip()
        query = query.filter(
            or_(
                Shop.city.ilike(f"%{loc}%"),
                Shop.address.ilike(f"%{loc}%"),
                Shop.state.ilike(f"%{loc}%"),
            )
        )

    if search and search.strip():
        s = search.strip()
        query = query.filter(
            or_(
                Shop.name.ilike(f"%{s}%"),
                Shop.description.ilike(f"%{s}%"),
                Shop.city.ilike(f"%{s}%"),
                Shop.address.ilike(f"%{s}%"),
                Shop.category.ilike(f"%{s}%"),
            )
        )

    if category and category.strip() and category.strip().lower() != "all":
        cat = category.strip()
        query = query.filter(Shop.category.ilike(f"%{cat}%"))

    shops = query.order_by(Shop.name.asc()).all()
    return [_to_public_response(shop) for shop in shops]


def get_public_shop_by_slug(db: Session, slug: str) -> PublicShopResponse:
    """
    Retrieve a single approved, active shop by slug.
    Raises LookupError if not found or not publicly accessible.
    """
    shop = (
        db.query(Shop)
        .options(joinedload(Shop.applications))
        .filter(
            Shop.slug == slug,
            Shop.status == ShopStatus.APPROVED,
            Shop.is_active.is_(True),
        )
        .first()
    )

    if shop is None:
        raise LookupError(f"Shop with slug '{slug}' not found.")

    return _to_public_response(shop)


def get_public_shop_by_id(db: Session, shop_id: int) -> PublicShopResponse:
    """
    Retrieve a single approved, active shop by ID.
    Raises LookupError if not found or not publicly accessible.
    """
    shop = (
        db.query(Shop)
        .options(joinedload(Shop.applications))
        .filter(
            Shop.id == shop_id,
            Shop.status == ShopStatus.APPROVED,
            Shop.is_active.is_(True),
        )
        .first()
    )

    if shop is None:
        raise LookupError(f"Shop with ID {shop_id} not found.")

    return _to_public_response(shop)
