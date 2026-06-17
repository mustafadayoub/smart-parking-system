from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import SpotStatus


class ParkingSpotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    spot_number: str
    level_zone: str
    status: SpotStatus
    last_updated: datetime


class ParkingSpotCreate(BaseModel):
    spot_number: str = Field(min_length=1, max_length=32)
    level_zone: str = Field(min_length=1, max_length=64)
    status: SpotStatus = SpotStatus.AVAILABLE


class ParkingSpotUpdate(BaseModel):
    status: SpotStatus | None = None
    spot_number: str | None = Field(default=None, min_length=1, max_length=32)
    level_zone: str | None = Field(default=None, min_length=1, max_length=64)


class ParkingSpotFilter(BaseModel):
    status: SpotStatus | None = None
    level_zone: str | None = None


class SpotUpdatePayload(BaseModel):
    """WebSocket broadcast payload when a spot changes state."""

    spot_id: UUID
    spot_number: str
    level_zone: str
    status: SpotStatus
    last_updated: datetime
    source: str = Field(
        default="sensor", description="Origin of the update: sensor | reservation | system"
    )
