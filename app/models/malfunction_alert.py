import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MalfunctionAlert(Base):
    __tablename__ = "malfunction_alerts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    spot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("parking_spots.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    device_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    resolved: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    spot: Mapped["ParkingSpot"] = relationship("ParkingSpot", back_populates="malfunction_alerts")
