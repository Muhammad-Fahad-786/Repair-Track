"""
ShopApplication model — records a customer's request to register a repair shop.

The Admin reviews these applications and approves or rejects them.
No document fields are included in this project scope.
"""
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import ApplicationStatus


class ShopApplication(Base):
    __tablename__ = "shop_applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # The customer who submitted the application
    applicant_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    # The shop created upon approval (null until approved)
    shop_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("shops.id"), nullable=True, index=True
    )

    # -----------------------------------------------------------------------
    # Shop information captured at application time
    # -----------------------------------------------------------------------
    shop_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    services: Mapped[str | None] = mapped_column(Text, nullable=True)  # comma-separated or free text
    pickup_available: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # -----------------------------------------------------------------------
    # Review / status fields
    # -----------------------------------------------------------------------
    status: Mapped[ApplicationStatus] = mapped_column(
        Enum(ApplicationStatus), default=ApplicationStatus.PENDING, nullable=False
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Admin who reviewed the application
    reviewed_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )

    # Relationships
    applicant: Mapped["User"] = relationship(  # type: ignore[name-defined]
        "User", back_populates="shop_applications", foreign_keys=[applicant_id]
    )
    shop: Mapped["Shop | None"] = relationship(  # type: ignore[name-defined]
        "Shop", back_populates="applications"
    )
    reviewer: Mapped["User | None"] = relationship(  # type: ignore[name-defined]
        "User", back_populates="reviewed_applications", foreign_keys=[reviewed_by]
    )

    def __repr__(self) -> str:
        return f"<ShopApplication id={self.id} shop_name={self.shop_name!r} status={self.status}>"
