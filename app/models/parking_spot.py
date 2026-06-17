import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import SpotStatus
from app.database import Base


class ParkingSpot(Base):
    __tablename__ = "parking_spots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    spot_number: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    level_zone: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    status: Mapped[SpotStatus] = mapped_column(
        Enum(SpotStatus, name="spot_status"), nullable=False, default=SpotStatus.AVAILABLE
    )
    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    reservations: Mapped[list["Reservation"]] = relationship("Reservation", back_populates="spot")
    sensor_logs: Mapped[list["SensorLog"]] = relationship("SensorLog", back_populates="spot")
    malfunction_alerts: Mapped[list["MalfunctionAlert"]] = relationship(
        "MalfunctionAlert", back_populates="spot"
    )
