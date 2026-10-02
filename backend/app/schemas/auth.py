"""
Auth-related Pydantic schemas for request/response validation.

Rules enforced here:
- Emails are normalised to lowercase on input.
- password_hash is NEVER included in any response schema.
- Roles are never accepted as user-supplied input during registration.
"""
from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.enums import UserRole


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    """Payload for POST /api/v1/auth/register (customer only)."""

    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    phone: str | None = Field(default=None, max_length=20)

    @field_validator("email", mode="before")
    @classmethod
    def normalise_email(cls, v: str) -> str:
        return v.strip().lower()


class LoginRequest(BaseModel):
    """Payload for POST /api/v1/auth/login."""

    email: EmailStr
    password: str = Field(..., min_length=1)

    @field_validator("email", mode="before")
    @classmethod
    def normalise_email(cls, v: str) -> str:
        return v.strip().lower()


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class UserResponse(BaseModel):
    """Safe user representation — never exposes password_hash."""

    id: int
    name: str
    email: str
    phone: str | None
    role: UserRole
    is_active: bool

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """Response body for successful login and registration."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse
