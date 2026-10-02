"""
Pydantic v2 schemas for the Repair Management workflow.

Rules:
- password_hash and sensitive authentication fields are NEVER exposed.
- customer_id and shop_id are never trusted from request bodies for authorization.
- Status transitions are validated in the service layer.
"""
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator

from app.models.enums import RepairStatus


class ShopBrief(BaseModel):
    """Safe, minimal shop details embedded in repair responses."""

    id: int
    name: str
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    city: str | None = None

    model_config = {"from_attributes": True}


class CustomerBrief(BaseModel):
    """Safe, minimal customer details embedded in repair responses (never includes password_hash)."""

    id: int
    name: str
    email: str
    phone: str | None = None

    model_config = {"from_attributes": True}


class RepairHistoryCreate(BaseModel):
    """Payload for POST /api/v1/shop-owner/repairs/{repair_id}/history."""

    note: str = Field(..., min_length=1, max_length=2000, description="Progress note or update")


class RepairHistoryResponse(BaseModel):
    """Representation of an audit log entry for a repair."""

    id: int
    repair_id: int
    status: str
    note: str | None = None
    changed_by: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class RepairCreate(BaseModel):
    """Payload for POST /api/v1/shop-owner/repairs (SHOP_OWNER only)."""

    pickup_id: int | None = Field(default=None, description="ID of the RECEIVED pickup request")
    pickup_request_id: int | None = Field(default=None, description="Alias for pickup_id")
    estimated_cost: Decimal | float | None = Field(default=None, ge=0, description="Initial estimated cost")
    problem_description: str | None = Field(default=None, max_length=2000, description="Optional problem notes")

    @model_validator(mode="after")
    def validate_pickup_reference(self) -> "RepairCreate":
        if self.pickup_id is None and self.pickup_request_id is None:
            raise ValueError("pickup_id (or pickup_request_id) is required to create a repair.")
        return self

    @property
    def effective_pickup_id(self) -> int:
        return self.pickup_id if self.pickup_id is not None else self.pickup_request_id  # type: ignore[return-value]


class RepairStatusUpdate(BaseModel):
    """Payload for PATCH /api/v1/shop-owner/repairs/{repair_id}/status (SHOP_OWNER only)."""

    status: RepairStatus
    note: str | None = Field(default=None, max_length=1000, description="Optional note for history")


class RepairEstimateUpdate(BaseModel):
    """Payload for PATCH /api/v1/shop-owner/repairs/{repair_id}/estimate (SHOP_OWNER only)."""

    estimated_cost: Decimal | float = Field(..., ge=0, description="Estimated cost in currency units (must be >= 0)")


# ---------------------------------------------------------------------------
# Phase 5.8 -- AI Repair Assistance schemas
# ---------------------------------------------------------------------------


class RepairAnalyzeRequest(BaseModel):
    """Payload for POST /api/v1/shop-owner/repairs/analyze (SHOP_OWNER only)."""

    problem_description: str = Field(
        ...,
        min_length=20,
        max_length=2000,
        description="Customer problem description (20-2000 characters)",
    )


class RepairAnalyzeResponse(BaseModel):
    """Successful AI analysis result returned to the Shop Owner."""

    success: bool = True
    category: str
    priority: str
    summary: str


class RepairAnalyzeError(BaseModel):
    """Controlled error response when AI analysis fails."""

    success: bool = False
    message: str


class RepairCustomerApprovalResponse(BaseModel):
    """Response returned upon customer estimate approval."""

    repair_id: str
    customer_approved: bool
    status: RepairStatus
    estimated_cost: Decimal | float | None = None
    message: str = "Estimate approved successfully"

    model_config = {"from_attributes": True}


class RepairResponse(BaseModel):
    """
    Authenticated representation of a Repair job.
    Never exposes internal secrets or password hashes.
    """

    id: int
    repair_id: str
    customer_id: int
    shop_id: int
    pickup_request_id: int | None = None
    device_type: str
    device_brand: str | None = None
    device_model: str | None = None
    problem_description: str | None = None
    estimated_cost: Decimal | float | None = None
    status: RepairStatus
    customer_approved: bool | None = None
    received_at: datetime | None = None
    estimated_completion: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    # AI-assisted categorisation fields (Phase 5.8)
    ai_category: str | None = None
    ai_priority: str | None = None
    ai_summary: str | None = None

    shop: ShopBrief | None = None
    customer: CustomerBrief | None = None
    history: list[RepairHistoryResponse] = []

    model_config = {"from_attributes": True}


class RepairTrackingHistoryItem(BaseModel):
    """Public, safe representation of status timeline item."""

    status: str
    note: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class RepairTrackingResponse(BaseModel):
    """
    Public representation of a Repair job for unauthenticated tracking.
    Never exposes customer identity, address, phone, email, or passwords.
    """

    repair_id: str
    shop_name: str
    device_type: str
    device_brand: str | None = None
    device_model: str | None = None
    problem_description: str | None = None
    status: RepairStatus
    estimated_cost: Decimal | float | None = None
    customer_approved: bool | None = None
    received_at: datetime | None = None
    completed_at: datetime | None = None
    history: list[RepairTrackingHistoryItem] = []

    model_config = {"from_attributes": True}
