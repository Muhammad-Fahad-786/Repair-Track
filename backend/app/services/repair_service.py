"""
Repair Service -- business logic and authorization for repair jobs.

Rules:
- Never trust customer_id or shop_id from client input for authorization.
- Shop owners can only see, create, and manage repairs for their own shops.
- Customers can only see and approve estimates for their own repairs.
- Admin can view all repairs across all shops.
- Public tracking exposes only safe data without authentication.
- Strict status transitions are enforced:
    RECEIVED    -> DIAGNOSING, CANCELLED
    DIAGNOSING  -> REPAIRING, CANCELLED
    REPAIRING   -> READY, CANCELLED
    READY       -> COMPLETED, REPAIRING
    COMPLETED   -> terminal
    CANCELLED   -> terminal
- Invalid status transitions result in HTTP 409 Conflict.
- Collisions in unique Repair IDs are handled safely.
- Every status update and repair creation logs an audit entry in RepairHistory.
"""
from datetime import datetime, timezone
from decimal import Decimal
import secrets
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.models.enums import PickupStatus, RepairStatus, UserRole
from app.models.pickup import PickupRequest
from app.models.repair import Repair
from app.models.repair_history import RepairHistory
from app.models.shop import Shop
from app.models.user import User
from app.schemas.repair import (
    RepairCreate,
    RepairHistoryResponse,
    RepairResponse,
    RepairTrackingHistoryItem,
    RepairTrackingResponse,
)

# Allowed forward/backward state transitions for repairs
VALID_REPAIR_TRANSITIONS: dict[RepairStatus, set[RepairStatus]] = {
    RepairStatus.RECEIVED: {RepairStatus.DIAGNOSING, RepairStatus.CANCELLED},
    RepairStatus.DIAGNOSING: {RepairStatus.REPAIRING, RepairStatus.CANCELLED},
    RepairStatus.REPAIRING: {RepairStatus.READY, RepairStatus.CANCELLED},
    RepairStatus.READY: {RepairStatus.COMPLETED, RepairStatus.REPAIRING},
    RepairStatus.COMPLETED: set(),
    RepairStatus.CANCELLED: set(),
}


def _get_owner_shop_ids(db: Session, owner: User) -> list[int]:
    """Retrieve list of shop IDs owned by the given user."""
    shops = db.query(Shop.id).filter(Shop.owner_id == owner.id).all()
    return [s[0] for s in shops]


def _generate_unique_repair_id(db: Session, shop_id: int) -> str:
    """
    Generate a human-readable, non-sequential, globally unique Repair ID.
    Example: RT-SH001-X7K92
    """
    charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    for _ in range(10):
        suffix = "".join(secrets.choice(charset) for _ in range(5))
        candidate = f"RT-SH{shop_id:03d}-{suffix}"
        exists = db.query(Repair.id).filter(Repair.repair_id == candidate).first()
        if not exists:
            return candidate
    # Fallback to high-entropy hex if collisions occur
    return f"RT-SH{shop_id:03d}-{secrets.token_hex(4).upper()}"


def _get_repair_by_identifier(db: Session, identifier: str | int) -> Repair | None:
    """
    Look up a repair by primary key integer ID or unique repair_id string.
    Eager-loads history, customer, shop, and pickup relationships.
    """
    query = (
        db.query(Repair)
        .options(
            joinedload(Repair.customer),
            joinedload(Repair.shop),
            joinedload(Repair.history),
            joinedload(Repair.pickup_request),
        )
    )

    if isinstance(identifier, int) or (isinstance(identifier, str) and identifier.isdigit()):
        repair = query.filter(Repair.id == int(identifier)).first()
        if repair:
            return repair

    return query.filter(Repair.repair_id == str(identifier)).first()


def create_repair_from_pickup(
    db: Session,
    current_user: User,
    data: RepairCreate,
) -> RepairResponse:
    """
    Create a new Repair from a RECEIVED pickup request (SHOP_OWNER only).

    Raises:
        PermissionError -- if the user is not a SHOP_OWNER or does not own the shop.
        LookupError     -- if the pickup request does not exist.
        ValueError      -- if pickup is not RECEIVED or a repair already exists.
    """
    if current_user.role != UserRole.SHOP_OWNER:
        raise PermissionError("Only shop owners can create repairs.")

    pickup_id = data.effective_pickup_id
    pickup = db.get(PickupRequest, pickup_id)
    if pickup is None:
        raise LookupError(f"Pickup request with ID {pickup_id} does not exist.")

    owner_shop_ids = _get_owner_shop_ids(db, current_user)
    if pickup.shop_id not in owner_shop_ids:
        raise PermissionError("You do not have permission to create a repair for this shop.")

    if pickup.status != PickupStatus.RECEIVED:
        raise ValueError(
            f"Pickup request must have status RECEIVED to create a repair. Current status: {pickup.status.value}"
        )

    existing_repair = db.query(Repair).filter(Repair.pickup_request_id == pickup.id).first()
    if existing_repair is not None:
        raise ValueError(f"A repair record already exists for pickup request #{pickup.id}.")

    now = datetime.now(timezone.utc)
    unique_repair_id = _generate_unique_repair_id(db, pickup.shop_id)

    repair = Repair(
        repair_id=unique_repair_id,
        customer_id=pickup.customer_id,
        shop_id=pickup.shop_id,
        pickup_request_id=pickup.id,
        device_type=pickup.device_type,
        device_brand=pickup.device_brand,
        device_model=pickup.device_model,
        problem_description=data.problem_description or pickup.problem_description,
        estimated_cost=data.estimated_cost,
        status=RepairStatus.RECEIVED,
        received_at=now,
        created_at=now,
        updated_at=now,
    )
    db.add(repair)
    db.flush()  # Populates repair.id

    # Create initial audit log entry
    initial_history = RepairHistory(
        repair_id=repair.id,
        status=RepairStatus.RECEIVED.value,
        note="Repair created from received pickup",
        changed_by=current_user.id,
        created_at=now,
    )
    db.add(initial_history)
    db.commit()
    db.refresh(repair)

    # Reload with relationships
    loaded = _get_repair_by_identifier(db, repair.id)
    return RepairResponse.model_validate(loaded)


def get_shop_owner_repairs(
    db: Session,
    current_user: User,
    status_filter: RepairStatus | None = None,
) -> list[RepairResponse]:
    """
    Return all repairs for shops owned by the authenticated shop owner.
    """
    if current_user.role != UserRole.SHOP_OWNER:
        raise PermissionError("Only shop owners can view shop repairs.")

    shop_ids = _get_owner_shop_ids(db, current_user)
    query = (
        db.query(Repair)
        .options(
            joinedload(Repair.customer),
            joinedload(Repair.shop),
            joinedload(Repair.history),
        )
        .filter(Repair.shop_id.in_(shop_ids))
    )

    if status_filter:
        query = query.filter(Repair.status == status_filter)

    repairs = query.order_by(Repair.created_at.desc()).all()
    return [RepairResponse.model_validate(r) for r in repairs]


def get_shop_owner_repair(
    db: Session,
    current_user: User,
    identifier: str | int,
) -> RepairResponse:
    """
    Return a single repair for the authenticated shop owner.
    """
    if current_user.role != UserRole.SHOP_OWNER:
        raise PermissionError("Only shop owners can view shop repairs.")

    repair = _get_repair_by_identifier(db, identifier)
    if repair is None:
        raise LookupError(f"Repair '{identifier}' does not exist.")

    shop_ids = _get_owner_shop_ids(db, current_user)
    if repair.shop_id not in shop_ids:
        raise PermissionError("You do not have permission to view repairs for another shop.")

    return RepairResponse.model_validate(repair)


def update_repair_status(
    db: Session,
    current_user: User,
    identifier: str | int,
    new_status: RepairStatus,
    note: str | None = None,
) -> RepairResponse:
    """
    Update the status of a repair job according to strict transition rules.
    """
    if current_user.role != UserRole.SHOP_OWNER:
        raise PermissionError("Only shop owners can update repair status.")

    repair = _get_repair_by_identifier(db, identifier)
    if repair is None:
        raise LookupError(f"Repair '{identifier}' does not exist.")

    shop_ids = _get_owner_shop_ids(db, current_user)
    if repair.shop_id not in shop_ids:
        raise PermissionError("You do not have permission to update repairs for another shop.")

    if repair.status == RepairStatus.COMPLETED:
        raise ValueError("Cannot update status of a COMPLETED repair.")
    if repair.status == RepairStatus.CANCELLED:
        raise ValueError("Cannot update status of a CANCELLED repair.")

    allowed = VALID_REPAIR_TRANSITIONS.get(repair.status, set())
    if new_status not in allowed:
        raise ValueError(
            f"Invalid status transition from {repair.status.value} to {new_status.value}."
        )

    now = datetime.now(timezone.utc)
    old_status = repair.status
    repair.status = new_status
    repair.updated_at = now

    if new_status == RepairStatus.COMPLETED:
        repair.completed_at = now

    history_entry = RepairHistory(
        repair_id=repair.id,
        status=new_status.value,
        note=note or f"Status changed from {old_status.value} to {new_status.value}",
        changed_by=current_user.id,
        created_at=now,
    )
    db.add(history_entry)
    db.commit()
    db.refresh(repair)

    loaded = _get_repair_by_identifier(db, repair.id)
    return RepairResponse.model_validate(loaded)


def add_repair_note(
    db: Session,
    current_user: User,
    identifier: str | int,
    note: str,
) -> RepairHistoryResponse:
    """
    Add a progress note / history entry without changing the status.
    """
    if current_user.role != UserRole.SHOP_OWNER:
        raise PermissionError("Only shop owners can add repair notes.")

    repair = _get_repair_by_identifier(db, identifier)
    if repair is None:
        raise LookupError(f"Repair '{identifier}' does not exist.")

    shop_ids = _get_owner_shop_ids(db, current_user)
    if repair.shop_id not in shop_ids:
        raise PermissionError("You do not have permission to add notes to repairs for another shop.")

    if repair.status in {RepairStatus.COMPLETED, RepairStatus.CANCELLED}:
        raise ValueError(f"Cannot add notes to a {repair.status.value} repair.")

    now = datetime.now(timezone.utc)
    history_entry = RepairHistory(
        repair_id=repair.id,
        status=repair.status.value,
        note=note,
        changed_by=current_user.id,
        created_at=now,
    )
    db.add(history_entry)
    db.commit()
    db.refresh(history_entry)
    return RepairHistoryResponse.model_validate(history_entry)


def update_repair_estimate(
    db: Session,
    current_user: User,
    identifier: str | int,
    estimated_cost: Decimal | float,
) -> RepairResponse:
    """
    Update the estimated repair cost (SHOP_OWNER only).
    """
    if current_user.role != UserRole.SHOP_OWNER:
        raise PermissionError("Only shop owners can set repair estimates.")

    repair = _get_repair_by_identifier(db, identifier)
    if repair is None:
        raise LookupError(f"Repair '{identifier}' does not exist.")

    shop_ids = _get_owner_shop_ids(db, current_user)
    if repair.shop_id not in shop_ids:
        raise PermissionError("You do not have permission to modify repairs for another shop.")

    if repair.status in {RepairStatus.COMPLETED, RepairStatus.CANCELLED}:
        raise ValueError(f"Cannot update estimate for a {repair.status.value} repair.")

    repair.estimated_cost = estimated_cost
    repair.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(repair)

    loaded = _get_repair_by_identifier(db, repair.id)
    return RepairResponse.model_validate(loaded)


def get_customer_repairs(
    db: Session,
    current_user: User,
) -> list[RepairResponse]:
    """
    Return all repairs belonging to the authenticated customer.
    """
    if current_user.role != UserRole.CUSTOMER:
        raise PermissionError("Only customers can view their repairs.")

    repairs = (
        db.query(Repair)
        .options(
            joinedload(Repair.shop),
            joinedload(Repair.history),
        )
        .filter(Repair.customer_id == current_user.id)
        .order_by(Repair.created_at.desc())
        .all()
    )
    return [RepairResponse.model_validate(r) for r in repairs]


def get_customer_repair(
    db: Session,
    current_user: User,
    identifier: str | int,
) -> RepairResponse:
    """
    Return a single repair if it belongs to the authenticated customer.
    """
    if current_user.role != UserRole.CUSTOMER:
        raise PermissionError("Only customers can view their repairs.")

    repair = _get_repair_by_identifier(db, identifier)
    if repair is None:
        raise LookupError(f"Repair '{identifier}' does not exist.")

    if repair.customer_id != current_user.id:
        raise PermissionError("You do not have permission to view another customer's repair.")

    return RepairResponse.model_validate(repair)


def approve_repair_estimate(
    db: Session,
    current_user: User,
    identifier: str | int,
) -> RepairResponse:
    """
    Approve the estimated cost for a repair (CUSTOMER only).
    """
    if current_user.role != UserRole.CUSTOMER:
        raise PermissionError("Only customers can approve repair estimates.")

    repair = _get_repair_by_identifier(db, identifier)
    if repair is None:
        raise LookupError(f"Repair '{identifier}' does not exist.")

    if repair.customer_id != current_user.id:
        raise PermissionError("You do not have permission to approve another customer's repair.")

    if repair.estimated_cost is None:
        raise ValueError("Cannot approve estimate: no estimated cost has been set for this repair.")

    if repair.status in {RepairStatus.COMPLETED, RepairStatus.CANCELLED}:
        raise ValueError(f"Cannot approve estimate for a {repair.status.value} repair.")

    now = datetime.now(timezone.utc)
    repair.customer_approved = True
    repair.updated_at = now

    history_entry = RepairHistory(
        repair_id=repair.id,
        status=repair.status.value,
        note="Customer approved the estimated cost",
        changed_by=current_user.id,
        created_at=now,
    )
    db.add(history_entry)
    db.commit()
    db.refresh(repair)

    loaded = _get_repair_by_identifier(db, repair.id)
    return RepairResponse.model_validate(loaded)


def get_public_tracking(
    db: Session,
    identifier: str,
) -> RepairTrackingResponse:
    """
    Return public, safe repair status timeline without authentication.
    """
    repair = _get_repair_by_identifier(db, identifier)
    if repair is None:
        raise LookupError(f"Repair with ID '{identifier}' does not exist.")

    shop_name = repair.shop.name if repair.shop else "Repair Shop"

    # Sort history entries chronologically
    sorted_history = sorted(repair.history, key=lambda h: h.created_at)
    tracking_history = [
        RepairTrackingHistoryItem(
            status=h.status,
            note=h.note,
            created_at=h.created_at,
        )
        for h in sorted_history
    ]

    return RepairTrackingResponse(
        repair_id=repair.repair_id,
        shop_name=shop_name,
        device_type=repair.device_type,
        device_brand=repair.device_brand,
        device_model=repair.device_model,
        problem_description=repair.problem_description,
        status=repair.status,
        estimated_cost=repair.estimated_cost,
        customer_approved=repair.customer_approved,
        received_at=repair.received_at,
        completed_at=repair.completed_at,
        history=tracking_history,
    )


def get_admin_repairs(
    db: Session,
    current_user: User,
    status_filter: RepairStatus | None = None,
) -> list[RepairResponse]:
    """
    Return all repairs across all shops (ADMIN only).
    """
    if current_user.role != UserRole.ADMIN:
        raise PermissionError("Only admins can view all repairs.")

    query = (
        db.query(Repair)
        .options(
            joinedload(Repair.customer),
            joinedload(Repair.shop),
            joinedload(Repair.history),
        )
    )

    if status_filter:
        query = query.filter(Repair.status == status_filter)

    repairs = query.order_by(Repair.created_at.desc()).all()
    return [RepairResponse.model_validate(r) for r in repairs]
