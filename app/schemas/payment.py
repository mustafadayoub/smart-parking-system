from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.enums import PaymentStatus, PaymentTransactionType


class PaymentProcessRequest(BaseModel):
    reservation_id: UUID
    card_number: str = Field(..., min_length=13, max_length=19)
    expiry: str = Field(..., pattern=r"^\d{2}/\d{2}$", description="MM/YY format")
    cvv: str = Field(..., min_length=3, max_length=4)
    payment_method: str = Field(default="CARD", max_length=32)

    @field_validator("card_number")
    @classmethod
    def normalize_card_number(cls, value: str) -> str:
        return value.replace(" ", "").replace("-", "")


class PaymentRefundRequest(BaseModel):
    reservation_id: UUID


class PaymentWebhookRequest(BaseModel):
    reservation_id: UUID
    gateway_reference: str = Field(..., min_length=4, max_length=64)
    amount: Decimal
    status: str = Field(default="CONFIRMED", max_length=32)


class PaymentProcessResponse(BaseModel):
    reservation_id: UUID
    payment_status: PaymentStatus
    total_price: Decimal
    message: str
    receipt_queued: bool = False
    gateway_reference: str | None = None


class PaymentRefundResponse(BaseModel):
    reservation_id: UUID
    payment_status: PaymentStatus
    refund_amount: Decimal
    message: str
    refund_queued: bool = False
    gateway_reference: str | None = None


class PaymentTransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    reservation_id: UUID
    transaction_type: PaymentTransactionType
    amount: Decimal
    gateway_reference: str
    status: str
    created_at: datetime


class BookingReceiptPayload(BaseModel):
    event_type: str = "PAYMENT_SUCCESS"
    user_id: UUID
    reservation_id: UUID
    reservation_number: str
    spot_number: str
    level_zone: str
    vehicle_plate: str | None = None
    driver_name: str | None = None
    start_time: datetime
    end_time: datetime
    total_price: Decimal
    payment_status: PaymentStatus
    message: str
    paid_at: datetime


class CancellationNotificationPayload(BaseModel):
    event_type: str = "CANCELLATION_SUCCESS"
    user_id: UUID
    reservation_id: UUID
    reservation_number: str
    spot_number: str
    refund_eligible: bool
    refund_processed: bool
    message: str
    cancelled_at: datetime


class RefundNotificationPayload(BaseModel):
    event_type: str = "REFUND_SUCCESS"
    user_id: UUID
    reservation_id: UUID
    reservation_number: str
    refund_amount: Decimal
    gateway_reference: str
    message: str
    refunded_at: datetime


class MalfunctionAlertPayload(BaseModel):
    event_type: str = "MALFUNCTION_ALERT"
    alert_id: UUID
    spot_id: UUID
    spot_number: str
    level_zone: str
    message: str
    device_id: str | None = None
    created_at: datetime
