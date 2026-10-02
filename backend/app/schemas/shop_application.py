"""
Pydantic v2 schemas for the Shop Application workflow.

Rules:
- password_hash and internal secrets are NEVER exposed.
- Roles are never accepted from request bodies.
- ApplicationStatus comes from the DB, not from request payloads.
"""
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import ApplicationStatus


class ShopApplicationCreate(BaseModel):
    """Payload for POST /api/v1/shop-applications."""

    shop_name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    address: str | None = Field(default=None, max_length=500)
    city: str | None = Field(default=None, max_length=100)
    services: str | None = Field(default=None, max_length=1000)
    pickup_available: bool = Field(default=False)


class ShopApplicationReject(BaseModel):
    """Payload for POST /api/v1/admin/shop-applications/{id}/reject."""

    rejection_reason: str = Field(..., min_length=1, max_length=1000)


class ShopApplicationResponse(BaseModel):
    """Safe representation of a ShopApplication for the applicant (customer)."""

    id: int
    shop_name: str
    description: str | None
    address: str | None
    city: str | None
    services: str | None
    pickup_available: bool
    status: ApplicationStatus
    submitted_at: datetime
    rejection_reason: str | None

    model_config = {"from_attributes": True}


class ShopApplicationAdminResponse(BaseModel):
    """Full application details for the Admin dashboard. Never includes password_hash."""

    id: int
    applicant_id: int
    applicant_name: str | None = None
    applicant_email: str | None = None
    applicant_phone: str | None = None

    shop_name: str
    description: str | None
    address: str | None
    city: str | None
    services: str | None
    pickup_available: bool

    status: ApplicationStatus
    submitted_at: datetime
    reviewed_at: datetime | None
    rejection_reason: str | None
    reviewed_by: int | None

    model_config = {"from_attributes": True}