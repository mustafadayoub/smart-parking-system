from enum import StrEnum


class UserRole(StrEnum):
    DRIVER = "DRIVER"
    MANAGEMENT = "MANAGEMENT"


class SpotStatus(StrEnum):
    AVAILABLE = "AVAILABLE"
    RESERVED = "RESERVED"
    OCCUPIED = "OCCUPIED"
    MAINTENANCE = "MAINTENANCE"


class ReservationStatus(StrEnum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"


class PaymentStatus(StrEnum):
    PENDING = "PENDING"
    PAID = "PAID"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class PaymentTransactionType(StrEnum):
    PAYMENT = "PAYMENT"
    REFUND = "REFUND"


class SensorState(StrEnum):
    DETECTED = "DETECTED"
    CLEAR = "CLEAR"
    FAULT = "FAULT"
