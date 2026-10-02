"""
Pydantic v2 schemas for the public Shop API.

Rules:
- password_hash and internal authentication fields are NEVER exposed.
- Only safe, public shop metadata is included.
- Used for read-only public shop discovery and shop profiles.
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PublicShopResponse(BaseModel):
    """Safe, public shop details for discovery and profile view."""

    model_config = ConfigDict(from_attributes=True)

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
