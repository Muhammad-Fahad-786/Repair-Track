"""
Repair model — the central record for a device repair job.

AI fields (ai_category, ai_priority, ai_summary) are database placeholders only.
AI integration is NOT part of this phase.
"""
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import RepairStatus


class Repair(Base):
    __tablename__ = "repairs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Human-readable repair identifier shown to customers (e.g. RT-2024-001)
    repair_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)

    customer_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    shop_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("shops.id"), nullable=False, index=True
    )
    # Optional: repair may originate from a pickup request
    pickup_request_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("pickup_requests.id"), nullable=True
    )

    # Device information
    device_type: Mapped[str] = mapped_column(String(100), nullable=False)
    device_brand: Mapped[str | None] = mapped_column(String(100), nullable=True)
    device_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    problem_description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # AI-assisted categorisation fields (populated in a future phase)
    ai_category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ai_priority: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    estimated_cost: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    status: Mapped[RepairStatus] = mapped_column(
        Enum(RepairStatus), default=RepairStatus.RECEIVED, nullable=False
    )
    customer_approved: Mapped[bool | None] = mapped_column(Boolean, default=None, nullable=True)

    received_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    estimated_completion: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

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
    customer: Mapped["User"] = relationship(  # type: ignore[name-defined]
        "User", back_populates="repairs"
    )
    shop: Mapped["Shop"] = relationship(  # type: ignore[name-defined]
        "Shop", back_populates="repairs"
    )
    pickup_request: Mapped["PickupRequest | None"] = relationship(  # type: ignore[name-defined]
        "PickupRequest", back_populates="repair"
    )
    history: Mapped[list["RepairHistory"]] = relationship(  # type: ignore[name-defined]
        "RepairHistory", back_populates="repair", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Repair id={self.id} repair_id={self.repair_id!r} status={self.status}>"
