from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.enums import PaymentStatus, ReservationStatus


class ReservationCreate(BaseModel):
    spot_id: UUID
    start_time: datetime
    end_time: datetime
    vehicle_plate: str = Field(..., min_length=2, max_length=32)

    @model_validator(mode="after")
    def validate_time_window(self) -> "ReservationCreate":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class ReservationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    reservation_number: str
    user_id: UUID
    spot_id: UUID
    vehicle_plate: str | None
    start_time: datetime
    end_time: datetime
    status: ReservationStatus
    payment_status: PaymentStatus
    total_price: Decimal
    created_at: datetime
    driver_name: str | None = None
    spot_number: str | None = None
    level_zone: str | None = None


class ReservationCancelResponse(BaseModel):
    reservation: ReservationResponse
    message: str
    refund_eligible: bool = False
    refund_processed: bool = False
    notification_queued: bool = False
