"""
RepairHistory model — immutable audit log of status changes for a repair.

Each record captures what changed, who changed it, and an optional note.
This powers the customer-facing repair timeline.
"""
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class RepairHistory(Base):
    __tablename__ = "repair_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    repair_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("repairs.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # The status value that was set at this point in time
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # The user (shop owner or admin) who made the change
    changed_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    repair: Mapped["Repair"] = relationship(  # type: ignore[name-defined]
        "Repair", back_populates="history"
    )

    def __repr__(self) -> str:
        return f"<RepairHistory id={self.id} repair_id={self.repair_id} status={self.status!r}>"
