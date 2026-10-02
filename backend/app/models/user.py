"""User model — represents Customers, Shop Owners, and Admins."""
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import UserRole


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)  # set during auth phase
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False, default=UserRole.CUSTOMER)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    shops: Mapped[list["Shop"]] = relationship(  # type: ignore[name-defined]
        "Shop", back_populates="owner", foreign_keys="Shop.owner_id"
    )
    shop_applications: Mapped[list["ShopApplication"]] = relationship(  # type: ignore[name-defined]
        "ShopApplication", back_populates="applicant", foreign_keys="ShopApplication.applicant_id"
    )
    reviewed_applications: Mapped[list["ShopApplication"]] = relationship(  # type: ignore[name-defined]
        "ShopApplication", back_populates="reviewer", foreign_keys="ShopApplication.reviewed_by"
    )
    pickup_requests: Mapped[list["PickupRequest"]] = relationship(  # type: ignore[name-defined]
        "PickupRequest", back_populates="customer"
    )
    repairs: Mapped[list["Repair"]] = relationship(  # type: ignore[name-defined]
        "Repair", back_populates="customer"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} role={self.role}>"
