"""
Admin Shop Service -- business logic for Admin Shop-Centric management.

Provides:
- list all shops with summary metrics (customer, pickup, repair counts)
- shop overview details with owner and stats
- customers belonging to a specific shop
- pickup requests belonging to a specific shop
- repairs belonging to a specific shop
"""
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.enums import ApplicationStatus, PickupStatus, RepairStatus, ShopStatus
from app.models.pickup import PickupRequest
from app.models.repair import Repair
from app.models.shop import Shop
from app.models.user import User
from app.schemas.admin_shop import (
    AdminShopCustomerItem,
    AdminShopListItem,
    AdminShopOverviewResponse,
    AdminShopOwnerInfo,
    AdminShopStats,
)
from app.schemas.pickup import PickupResponse
from app.schemas.repair import RepairResponse


def _get_shop_metadata(shop: Shop) -> tuple[bool, str | None]:
    """Extract pickup_available and services string from approved application or shop defaults."""
    pickup_available = False
    services = None

    if shop.applications:
        for app in shop.applications:
            if app.status == ApplicationStatus.APPROVED:
                pickup_available = bool(app.pickup_available)
                if app.services:
                    services = app.services
                break

    return pickup_available, services


def _get_shop_stats(db: Session, shop_id: int) -> AdminShopStats:
    """Compute aggregated counts for a specific shop."""
    # Distinct customer IDs from pickups and repairs
    pickup_customer_ids = {
        row[0]
        for row in db.query(PickupRequest.customer_id)
        .filter(PickupRequest.shop_id == shop_id)
        .distinct()
        .all()
    }
    repair_customer_ids = {
        row[0]
        for row in db.query(Repair.customer_id)
        .filter(Repair.shop_id == shop_id)
        .distinct()
        .all()
    }
    all_customer_ids = pickup_customer_ids | repair_customer_ids

    total_pickups = db.query(PickupRequest).filter(PickupRequest.shop_id == shop_id).count()
    pending_pickups = (
        db.query(PickupRequest)
        .filter(PickupRequest.shop_id == shop_id, PickupRequest.status == PickupStatus.PENDING)
        .count()
    )

    total_repairs = db.query(Repair).filter(Repair.shop_id == shop_id).count()
    active_repairs = (
        db.query(Repair)
        .filter(
            Repair.shop_id == shop_id,
            Repair.status.notin_([RepairStatus.COMPLETED, RepairStatus.CANCELLED]),
        )
        .count()
    )
    completed_repairs = (
        db.query(Repair)
        .filter(Repair.shop_id == shop_id, Repair.status == RepairStatus.COMPLETED)
        .count()
    )

    return AdminShopStats(
        customer_count=len(all_customer_ids),
        pickup_count=total_pickups,
        repair_count=total_repairs,
        pending_pickups=pending_pickups,
        active_repairs=active_repairs,
        completed_repairs=completed_repairs,
    )


def _to_admin_shop_list_item(db: Session, shop: Shop) -> AdminShopListItem:
    """Format a Shop into an AdminShopListItem with owner info and stats."""
    pickup_available, services = _get_shop_metadata(shop)
    stats = _get_shop_stats(db, shop.id)

    owner_info = None
    if shop.owner:
        owner_info = AdminShopOwnerInfo(
            id=shop.owner.id,
            name=shop.owner.name,
            email=shop.owner.email,
            phone=shop.owner.phone,
            role=shop.owner.role.value if hasattr(shop.owner.role, "value") else str(shop.owner.role),
            is_active=shop.owner.is_active,
            created_at=shop.owner.created_at,
        )

    return AdminShopListItem(
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
        updated_at=shop.updated_at,
        owner=owner_info,
        stats=stats,
    )


def get_all_admin_shops(db: Session) -> list[AdminShopListItem]:
    """Retrieve all shops for the admin view with computed metrics."""
    shops = (
        db.query(Shop)
        .options(joinedload(Shop.owner), joinedload(Shop.applications))
        .order_by(Shop.id.asc())
        .all()
    )
    return [_to_admin_shop_list_item(db, s) for s in shops]


def get_admin_shop_overview(db: Session, shop_id: int) -> AdminShopOverviewResponse:
    """Retrieve full overview of a single shop for the admin view."""
    shop = (
        db.query(Shop)
        .options(joinedload(Shop.owner), joinedload(Shop.applications))
        .filter(Shop.id == shop_id)
        .first()
    )
    if shop is None:
        raise LookupError(f"Shop with ID {shop_id} not found.")

    item = _to_admin_shop_list_item(db, shop)
    return AdminShopOverviewResponse(
        shop=item,
        owner=item.owner,
        stats=item.stats,
    )


def get_admin_shop_customers(db: Session, shop_id: int) -> list[AdminShopCustomerItem]:
    """
    Retrieve all customers associated with a specific shop through pickups or repairs.
    Returns per-customer statistics at this specific shop.
    """
    shop = db.get(Shop, shop_id)
    if shop is None:
        raise LookupError(f"Shop with ID {shop_id} not found.")

    pickup_customers = {
        row[0]
        for row in db.query(PickupRequest.customer_id)
        .filter(PickupRequest.shop_id == shop_id)
        .distinct()
        .all()
    }
    repair_customers = {
        row[0]
        for row in db.query(Repair.customer_id)
        .filter(Repair.shop_id == shop_id)
        .distinct()
        .all()
    }
    all_customer_ids = sorted(list(pickup_customers | repair_customers))

    customers_list: list[AdminShopCustomerItem] = []
    for cid in all_customer_ids:
        user = db.get(User, cid)
        if not user:
            continue

        p_count = (
            db.query(PickupRequest)
            .filter(PickupRequest.shop_id == shop_id, PickupRequest.customer_id == cid)
            .count()
        )
        r_count = (
            db.query(Repair)
            .filter(Repair.shop_id == shop_id, Repair.customer_id == cid)
            .count()
        )

        latest_pickup = (
            db.query(func.max(PickupRequest.created_at))
            .filter(PickupRequest.shop_id == shop_id, PickupRequest.customer_id == cid)
            .scalar()
        )
        latest_repair = (
            db.query(func.max(Repair.updated_at))
            .filter(Repair.shop_id == shop_id, Repair.customer_id == cid)
            .scalar()
        )

        latest_activity = None
        if latest_pickup and latest_repair:
            latest_activity = max(latest_pickup, latest_repair)
        elif latest_pickup:
            latest_activity = latest_pickup
        elif latest_repair:
            latest_activity = latest_repair

        customers_list.append(
            AdminShopCustomerItem(
                id=user.id,
                name=user.name,
                email=user.email,
                phone=user.phone,
                created_at=user.created_at,
                pickup_count=p_count,
                repair_count=r_count,
                latest_activity=latest_activity,
            )
        )

    return customers_list


def get_admin_shop_pickups(db: Session, shop_id: int) -> list[PickupResponse]:
    """Retrieve all pickup requests strictly belonging to a specific shop."""
    shop = db.get(Shop, shop_id)
    if shop is None:
        raise LookupError(f"Shop with ID {shop_id} not found.")

    pickups = (
        db.query(PickupRequest)
        .options(joinedload(PickupRequest.customer), joinedload(PickupRequest.shop))
        .filter(PickupRequest.shop_id == shop_id)
        .order_by(PickupRequest.created_at.desc())
        .all()
    )
    return [PickupResponse.model_validate(p) for p in pickups]


def get_admin_shop_repairs(db: Session, shop_id: int) -> list[RepairResponse]:
    """Retrieve all repairs strictly belonging to a specific shop."""
    shop = db.get(Shop, shop_id)
    if shop is None:
        raise LookupError(f"Shop with ID {shop_id} not found.")

    repairs = (
        db.query(Repair)
        .options(
            joinedload(Repair.customer),
            joinedload(Repair.shop),
            joinedload(Repair.history),
        )
        .filter(Repair.shop_id == shop_id)
        .order_by(Repair.created_at.desc())
        .all()
    )
    return [RepairResponse.model_validate(r) for r in repairs]
