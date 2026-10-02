"""Shop model — represents a registered repair shop."""
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import ShopStatus


class Shop(Base):
    __tablename__ = "shops"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[ShopStatus] = mapped_column(
        Enum(ShopStatus), default=ShopStatus.PENDING, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
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
    owner: Mapped["User"] = relationship(  # type: ignore[name-defined]
        "User", back_populates="shops", foreign_keys=[owner_id]
    )
    applications: Mapped[list["ShopApplication"]] = relationship(  # type: ignore[name-defined]
        "ShopApplication", back_populates="shop"
    )
    pickup_requests: Mapped[list["PickupRequest"]] = relationship(  # type: ignore[name-defined]
        "PickupRequest", back_populates="shop"
    )
    repairs: Mapped[list["Repair"]] = relationship(  # type: ignore[name-defined]
        "Repair", back_populates="shop"
    )

    def __repr__(self) -> str:
        return f"<Shop id={self.id} name={self.name!r} status={self.status}>"
