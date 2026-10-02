"""PickupRequest model — a customer's request for a shop to collect their device."""
from datetime import datetime, date, timezone

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship
import datetime as dt

from app.core.database import Base
from app.models.enums import PickupStatus


class PickupRequest(Base):
    __tablename__ = "pickup_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    customer_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    shop_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("shops.id"), nullable=False, index=True
    )

    # Device details provided by the customer
    device_type: Mapped[str] = mapped_column(String(100), nullable=False)
    device_brand: Mapped[str | None] = mapped_column(String(100), nullable=True)
    device_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    problem_description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Pickup logistics
    pickup_address: Mapped[str] = mapped_column(String(500), nullable=False)
    preferred_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    preferred_time: Mapped[dt.time | None] = mapped_column(Time, nullable=True)

    status: Mapped[PickupStatus] = mapped_column(
        Enum(PickupStatus), default=PickupStatus.PENDING, nullable=False
    )

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
        "User", back_populates="pickup_requests"
    )
    shop: Mapped["Shop"] = relationship(  # type: ignore[name-defined]
        "Shop", back_populates="pickup_requests"
    )
    repair: Mapped["Repair | None"] = relationship(  # type: ignore[name-defined]
        "Repair", back_populates="pickup_request", uselist=False
    )

    def __repr__(self) -> str:
        return f"<PickupRequest id={self.id} status={self.status}>"
