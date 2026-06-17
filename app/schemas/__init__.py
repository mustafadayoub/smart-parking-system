from app.schemas.parking_spot import ParkingSpotFilter, ParkingSpotResponse, SpotUpdatePayload
from app.schemas.report import DailyOccupancyReport, HourlyOccupancyBucket, OccupancyReportQuery
from app.schemas.reservation import (
    ReservationCancelResponse,
    ReservationCreate,
    ReservationResponse,
)
from app.schemas.sensor import SensorIngestRequest, SensorIngestResponse
from app.schemas.user import TokenResponse, UserCreate, UserLogin, UserResponse

__all__ = [
    "ParkingSpotFilter",
    "ParkingSpotResponse",
    "SpotUpdatePayload",
    "DailyOccupancyReport",
    "HourlyOccupancyBucket",
    "OccupancyReportQuery",
    "ReservationCancelResponse",
    "ReservationCreate",
    "ReservationResponse",
    "SensorIngestRequest",
    "SensorIngestResponse",
    "TokenResponse",
    "UserCreate",
    "UserLogin",
    "UserResponse",
]
