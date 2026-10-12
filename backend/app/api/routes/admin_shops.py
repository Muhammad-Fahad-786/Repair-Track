"""
Admin Shop routes -- /api/v1/admin/shops

GET /                              List all shops with metrics and owner info (ADMIN only)
GET /{shop_id}                     Get shop overview with owner and metrics (ADMIN only)
GET /{shop_id}/overview            Alias for shop overview (ADMIN only)
GET /{shop_id}/customers           Get customers associated with this shop (ADMIN only)
GET /{shop_id}/pickups             Get pickup requests belonging to this shop (ADMIN only)
GET /{shop_id}/repairs             Get repairs belonging to this shop (ADMIN only)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import require_roles
from app.core.database import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.admin_shop import (
    AdminShopCustomerItem,
    AdminShopListItem,
    AdminShopOverviewResponse,
)
from app.schemas.pickup import PickupResponse
from app.schemas.repair import RepairResponse
from app.services import admin_shop_service as svc

router = APIRouter(prefix="/admin/shops", tags=["Admin -- Shops"])

_admin = require_roles(UserRole.ADMIN)


@router.get(
    "",
    response_model=list[AdminShopListItem],
    summary="List all shops with metrics and owner info (ADMIN only)",
)
@router.get(
    "/",
    response_model=list[AdminShopListItem],
    summary="List all shops with metrics and owner info (ADMIN only)",
    include_in_schema=False,
)
def list_admin_shops(
    admin: User = Depends(_admin),
    db: Session = Depends(get_db),
) -> list[AdminShopListItem]:
    """Returns all registered shops with summary metrics and owner data."""
    return svc.get_all_admin_shops(db)


@router.get(
    "/{shop_id}",
    response_model=AdminShopOverviewResponse,
    summary="Get shop overview with owner and metrics (ADMIN only)",
)
def get_admin_shop_details(
    shop_id: int,
    admin: User = Depends(_admin),
    db: Session = Depends(get_db),
) -> AdminShopOverviewResponse:
    """Returns overview details, owner information, and stats for a single shop."""
    try:
        return svc.get_admin_shop_overview(db, shop_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get(
    "/{shop_id}/overview",
    response_model=AdminShopOverviewResponse,
    summary="Get shop overview with owner and metrics alias (ADMIN only)",
    include_in_schema=False,
)
def get_admin_shop_overview_alias(
    shop_id: int,
    admin: User = Depends(_admin),
    db: Session = Depends(get_db),
) -> AdminShopOverviewResponse:
    """Explicit /overview route alias for shop details."""
    try:
        return svc.get_admin_shop_overview(db, shop_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get(
    "/{shop_id}/customers",
    response_model=list[AdminShopCustomerItem],
    summary="Get customers associated with this shop (ADMIN only)",
)
def get_admin_shop_customers(
    shop_id: int,
    admin: User = Depends(_admin),
    db: Session = Depends(get_db),
) -> list[AdminShopCustomerItem]:
    """Returns only customers associated with this shop via pickups or repairs."""
    try:
        return svc.get_admin_shop_customers(db, shop_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get(
    "/{shop_id}/pickups",
    response_model=list[PickupResponse],
    summary="Get pickup requests belonging to this shop (ADMIN only)",
)
def get_admin_shop_pickups(
    shop_id: int,
    admin: User = Depends(_admin),
    db: Session = Depends(get_db),
) -> list[PickupResponse]:
    """Returns only pickup requests belonging to this shop."""
    try:
        return svc.get_admin_shop_pickups(db, shop_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get(
    "/{shop_id}/repairs",
    response_model=list[RepairResponse],
    summary="Get repairs belonging to this shop (ADMIN only)",
)
def get_admin_shop_repairs(
    shop_id: int,
    admin: User = Depends(_admin),
    db: Session = Depends(get_db),
) -> list[RepairResponse]:
    """Returns only repairs belonging to this shop."""
    try:
        return svc.get_admin_shop_repairs(db, shop_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
