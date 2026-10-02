"""
Pickup Service -- business logic and authorization for pickup requests.

Rules:
- Never trust customer_id or shop_id from client input for authorization.
- Only CUSTOMERs can create pickup requests.
- Only approved, active shops can receive pickup requests.
- Shop owners can only see and update pickup requests for their own shops.
- Customers can only see their own pickup requests.
- Admin can view all pickup requests.
- Forward status transitions are strictly enforced:
    PENDING -> ACCEPTED or REJECTED
    ACCEPTED -> SCHEDULED
    SCHEDULED -> PICKED_UP
    PICKED_UP -> RECEIVED
- Invalid status transitions result in HTTP 409 Conflict.
"""
from datetime import datetime, timezone

from sqlalchemy.orm import Session, joinedload

from app.models.enums import PickupStatus, ShopStatus, UserRole
from app.models.pickup import PickupRequest
from app.models.shop import Shop
from app.models.user import User
from app.schemas.pickup import PickupCreate, PickupResponse

# Valid forward state transitions for pickup requests
VALID_TRANSITIONS: dict[PickupStatus, set[PickupStatus]] = {
    PickupStatus.PENDING: {PickupStatus.ACCEPTED, PickupStatus.REJECTED},
    PickupStatus.ACCEPTED: {PickupStatus.SCHEDULED},
    PickupStatus.SCHEDULED: {PickupStatus.PICKED_UP},
    PickupStatus.PICKED_UP: {PickupStatus.RECEIVED},
    PickupStatus.REJECTED: set(),
    PickupStatus.RECEIVED: set(),
}


def _get_owner_shop_ids(db: Session, owner: User) -> list[int]:
    """Retrieve list of shop IDs owned by the given user."""
    shops = db.query(Shop.id).filter(Shop.owner_id == owner.id).all()
    return [s[0] for s in shops]


def create_pickup(
    db: Session,
    customer: User,
    data: PickupCreate,
) -> PickupResponse:
    """
    Create a new PENDING pickup request for an authenticated customer.

    Raises:
        PermissionError -- if the user is not a CUSTOMER.
        LookupError     -- if the shop does not exist.
        ValueError      -- if the shop is not approved or inactive.
    """
    if customer.role != UserRole.CUSTOMER:
        raise PermissionError("Only customers may create pickup requests.")

    shop = db.get(Shop, data.shop_id)
    if shop is None:
        raise LookupError(f"Shop with ID {data.shop_id} does not exist.")

    if shop.status != ShopStatus.APPROVED or not shop.is_active:
        raise ValueError(f"Shop '{shop.name}' is not currently approved and active for pickups.")

    pickup = PickupRequest(
        customer_id=customer.id,
        shop_id=shop.id,
        device_type=data.device_type,
        device_brand=data.device_brand,
        device_model=data.device_model,
        problem_description=data.problem_description,
        pickup_address=data.pickup_address,
        preferred_date=data.preferred_date,
        preferred_time=data.preferred_time,
        status=PickupStatus.PENDING,
    )
    db.add(pickup)
    db.commit()
    db.refresh(pickup)

    # Ensure relationship fields are populated
    _ = pickup.customer
    _ = pickup.shop
    return PickupResponse.model_validate(pickup)


def get_customer_pickups(
    db: Session,
    customer: User,
) -> list[PickupResponse]:
    """
    Return all pickup requests created by the authenticated customer.
    """
    if customer.role != UserRole.CUSTOMER:
        raise PermissionError("Only customers may view customer pickup requests.")

    pickups = (
        db.query(PickupRequest)
        .options(
            joinedload(PickupRequest.customer),
            joinedload(PickupRequest.shop),
        )
        .filter(PickupRequest.customer_id == customer.id)
        .order_by(PickupRequest.created_at.desc())
        .all()
    )
    return [PickupResponse.model_validate(p) for p in pickups]


def get_customer_pickup(
    db: Session,
    customer: User,
    pickup_id: int,
) -> PickupResponse:
    """
    Return a single pickup request if it belongs to the authenticated customer.

    Raises:
        LookupError     -- if pickup does not exist.
        PermissionError -- if pickup belongs to a different customer.
    """
    if customer.role != UserRole.CUSTOMER:
        raise PermissionError("Only customers may view customer pickup requests.")

    pickup = (
        db.query(PickupRequest)
        .options(
            joinedload(PickupRequest.customer),
            joinedload(PickupRequest.shop),
        )
        .filter(PickupRequest.id == pickup_id)
        .first()
    )
    if pickup is None:
        raise LookupError(f"Pickup request {pickup_id} not found.")

    if pickup.customer_id != customer.id:
        raise PermissionError("You do not have permission to access this pickup request.")

    return PickupResponse.model_validate(pickup)


def get_shop_owner_pickups(
    db: Session,
    owner: User,
    status_filter: PickupStatus | None = None,
) -> list[PickupResponse]:
    """
    Return all pickup requests for the authenticated shop owner's shop(s).
    Optionally filters by status.
    """
    if owner.role != UserRole.SHOP_OWNER:
        raise PermissionError("Only shop owners may view shop pickup requests.")

    owner_shop_ids = _get_owner_shop_ids(db, owner)
    if not owner_shop_ids:
        return []

    query = (
        db.query(PickupRequest)
        .options(
            joinedload(PickupRequest.customer),
            joinedload(PickupRequest.shop),
        )
        .filter(PickupRequest.shop_id.in_(owner_shop_ids))
    )
    if status_filter is not None:
        query = query.filter(PickupRequest.status == status_filter)

    pickups = query.order_by(PickupRequest.created_at.desc()).all()
    return [PickupResponse.model_validate(p) for p in pickups]


def get_shop_owner_pickup(
    db: Session,
    owner: User,
    pickup_id: int,
) -> PickupResponse:
    """
    Return a single pickup request if it belongs to the authenticated owner's shop.

    Raises:
        LookupError     -- if pickup does not exist.
        PermissionError -- if pickup belongs to a different shop.
    """
    if owner.role != UserRole.SHOP_OWNER:
        raise PermissionError("Only shop owners may view shop pickup requests.")

    pickup = (
        db.query(PickupRequest)
        .options(
            joinedload(PickupRequest.customer),
            joinedload(PickupRequest.shop),
        )
        .filter(PickupRequest.id == pickup_id)
        .first()
    )
    if pickup is None:
        raise LookupError(f"Pickup request {pickup_id} not found.")

    owner_shop_ids = _get_owner_shop_ids(db, owner)
    if pickup.shop_id not in owner_shop_ids:
        raise PermissionError("You do not have permission to access this shop's pickup request.")

    return PickupResponse.model_validate(pickup)


def accept_pickup(
    db: Session,
    owner: User,
    pickup_id: int,
) -> PickupResponse:
    """
    Accept a PENDING pickup request (PENDING -> ACCEPTED).

    Raises:
        LookupError     -- if pickup does not exist.
        PermissionError -- if pickup belongs to another shop.
        ValueError      -- if pickup is not in PENDING status.
    """
    if owner.role != UserRole.SHOP_OWNER:
        raise PermissionError("Only shop owners may accept pickup requests.")

    pickup = (
        db.query(PickupRequest)
        .options(
            joinedload(PickupRequest.customer),
            joinedload(PickupRequest.shop),
        )
        .filter(PickupRequest.id == pickup_id)
        .first()
    )
    if pickup is None:
        raise LookupError(f"Pickup request {pickup_id} not found.")

    owner_shop_ids = _get_owner_shop_ids(db, owner)
    if pickup.shop_id not in owner_shop_ids:
        raise PermissionError("You do not have permission to modify this shop's pickup request.")

    if pickup.status != PickupStatus.PENDING:
        raise ValueError(
            f"Pickup request cannot be accepted from status '{pickup.status.value}'. Must be PENDING."
        )

    pickup.status = PickupStatus.ACCEPTED
    pickup.updated_at = datetime.now(timezone.utc)
    db.add(pickup)
    db.commit()
    db.refresh(pickup)

    return PickupResponse.model_validate(pickup)


def reject_pickup(
    db: Session,
    owner: User,
    pickup_id: int,
    rejection_reason: str | None = None,
) -> PickupResponse:
    """
    Reject a PENDING pickup request (PENDING -> REJECTED).

    Raises:
        LookupError     -- if pickup does not exist.
        PermissionError -- if pickup belongs to another shop.
        ValueError      -- if pickup is not in PENDING status.
    """
    if owner.role != UserRole.SHOP_OWNER:
        raise PermissionError("Only shop owners may reject pickup requests.")

    pickup = (
        db.query(PickupRequest)
        .options(
            joinedload(PickupRequest.customer),
            joinedload(PickupRequest.shop),
        )
        .filter(PickupRequest.id == pickup_id)
        .first()
    )
    if pickup is None:
        raise LookupError(f"Pickup request {pickup_id} not found.")

    owner_shop_ids = _get_owner_shop_ids(db, owner)
    if pickup.shop_id not in owner_shop_ids:
        raise PermissionError("You do not have permission to modify this shop's pickup request.")

    if pickup.status != PickupStatus.PENDING:
        raise ValueError(
            f"Pickup request cannot be rejected from status '{pickup.status.value}'. Must be PENDING."
        )

    pickup.status = PickupStatus.REJECTED
    pickup.updated_at = datetime.now(timezone.utc)
    db.add(pickup)
    db.commit()
    db.refresh(pickup)

    return PickupResponse.model_validate(pickup)


def update_pickup_status(
    db: Session,
    owner: User,
    pickup_id: int,
    new_status: PickupStatus,
) -> PickupResponse:
    """
    Update pickup status following strict forward workflow transitions.

    Allowed transitions:
        PENDING   -> ACCEPTED, REJECTED
        ACCEPTED  -> SCHEDULED
        SCHEDULED -> PICKED_UP
        PICKED_UP -> RECEIVED

    Raises:
        LookupError     -- if pickup does not exist.
        PermissionError -- if pickup belongs to another shop.
        ValueError      -- if transition is invalid.
    """
    if owner.role != UserRole.SHOP_OWNER:
        raise PermissionError("Only shop owners may update pickup status.")

    pickup = (
        db.query(PickupRequest)
        .options(
            joinedload(PickupRequest.customer),
            joinedload(PickupRequest.shop),
        )
        .filter(PickupRequest.id == pickup_id)
        .first()
    )
    if pickup is None:
        raise LookupError(f"Pickup request {pickup_id} not found.")

    owner_shop_ids = _get_owner_shop_ids(db, owner)
    if pickup.shop_id not in owner_shop_ids:
        raise PermissionError("You do not have permission to modify this shop's pickup request.")

    allowed_transitions = VALID_TRANSITIONS.get(pickup.status, set())
    if new_status not in allowed_transitions:
        raise ValueError(
            f"Invalid status transition from '{pickup.status.value}' to '{new_status.value}'."
        )

    pickup.status = new_status
    pickup.updated_at = datetime.now(timezone.utc)
    db.add(pickup)
    db.commit()
    db.refresh(pickup)

    return PickupResponse.model_validate(pickup)


def admin_list_pickups(
    db: Session,
    status_filter: PickupStatus | None = None,
) -> list[PickupResponse]:
    """
    Return all pickup requests across all shops for admin review.
    Optionally filters by status.
    """
    query = (
        db.query(PickupRequest)
        .options(
            joinedload(PickupRequest.customer),
            joinedload(PickupRequest.shop),
        )
    )
    if status_filter is not None:
        query = query.filter(PickupRequest.status == status_filter)

    pickups = query.order_by(PickupRequest.created_at.desc()).all()
    return [PickupResponse.model_validate(p) for p in pickups]
