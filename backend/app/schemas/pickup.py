"""
Pydantic v2 schemas for the Pickup Request workflow.

Rules:
- password_hash and sensitive authentication fields are NEVER exposed.
- customer_id is never trusted from request bodies; it is derived from get_current_user().
- Status transitions are validated in the service layer.
"""
from datetime import date, datetime, time

from pydantic import BaseModel, Field

from app.models.enums import PickupStatus


class ShopBrief(BaseModel):
    """Safe, minimal shop details embedded in pickup responses."""

    id: int
    name: str
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    city: str | None = None

    model_config = {"from_attributes": True}


class CustomerBrief(BaseModel):
    """Safe, minimal customer details embedded in pickup responses (never includes password_hash)."""

    id: int
    name: str
    email: str
    phone: str | None = None

    model_config = {"from_attributes": True}


class PickupCreate(BaseModel):
    """Payload for POST /api/v1/pickups (CUSTOMER only)."""

    shop_id: int
    device_type: str = Field(..., min_length=1, max_length=100)
    device_brand: str | None = Field(default=None, max_length=100)
    device_model: str | None = Field(default=None, max_length=100)
    problem_description: str | None = Field(default=None, max_length=2000)
    pickup_address: str = Field(..., min_length=1, max_length=500)
    preferred_date: date | None = None
    preferred_time: time | None = None


class PickupStatusUpdate(BaseModel):
    """Payload for PATCH /api/v1/shop-owner/pickups/{id}/status (SHOP_OWNER only)."""

    status: PickupStatus


class PickupReject(BaseModel):
    """Optional payload for POST /api/v1/shop-owner/pickups/{id}/reject."""

    rejection_reason: str | None = Field(default=None, max_length=1000)


class PickupResponse(BaseModel):
    """
    Public / authenticated representation of a PickupRequest.
    Never exposes internal secrets or password hashes.
    """

    id: int
    customer_id: int
    shop_id: int
    device_type: str
    device_brand: str | None = None
    device_model: str | None = None
    problem_description: str | None = None
    pickup_address: str
    preferred_date: date | None = None
    preferred_time: time | None = None
    status: PickupStatus
    created_at: datetime
    updated_at: datetime

    shop: ShopBrief | None = None
    customer: CustomerBrief | None = None

    model_config = {"from_attributes": True}
