"""
Pydantic v2 schemas for the Admin Shop-Centric API.
Never exposes sensitive security fields like password_hash.
"""
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AdminShopOwnerInfo(BaseModel):
    """Admin-viewable details for a shop's owner."""
    id: int
    name: str
    email: str
    phone: str | None = None
    role: str
    is_active: bool
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class AdminShopStats(BaseModel):
    """Aggregated statistics belonging to a specific shop."""
    customer_count: int = 0
    pickup_count: int = 0
    repair_count: int = 0
    pending_pickups: int = 0
    active_repairs: int = 0
    completed_repairs: int = 0


class AdminShopListItem(BaseModel):
    """Admin shop card representation with summary metrics and owner info."""
    id: int
    name: str
    slug: str
    description: str | None = None
    category: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    status: str
    is_active: bool
    pickup_available: bool = False
    services: str | None = None
    created_at: datetime
    updated_at: datetime | None = None
    owner: AdminShopOwnerInfo | None = None
    stats: AdminShopStats


class AdminShopCustomerItem(BaseModel):
    """Customer associated with a specific shop through pickups or repairs."""
    id: int
    name: str
    email: str
    phone: str | None = None
    created_at: datetime
    pickup_count: int = 0
    repair_count: int = 0
    latest_activity: datetime | None = None


class AdminShopOverviewResponse(BaseModel):
    """Shop details and aggregate overview response for admin shop details view."""
    shop: AdminShopListItem
    owner: AdminShopOwnerInfo | None = None
    stats: AdminShopStats
