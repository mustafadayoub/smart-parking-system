import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import SensorState
from app.database import Base


class SensorLog(Base):
    __tablename__ = "sensor_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    spot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("parking_spots.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    sensor_state: Mapped[SensorState] = mapped_column(
        Enum(SensorState, name="sensor_state"), nullable=False
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True, nullable=False
    )

    spot: Mapped["ParkingSpot"] = relationship("ParkingSpot", back_populates="sensor_logs")
