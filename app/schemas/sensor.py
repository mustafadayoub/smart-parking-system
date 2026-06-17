from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.enums import SensorState


class SensorIngestRequest(BaseModel):
    spot_id: UUID
    sensor_state: SensorState
    timestamp: datetime | None = Field(
        default=None,
        description="Optional sensor timestamp; defaults to server time if omitted.",
    )
    device_id: str | None = Field(default=None, max_length=64)


class SensorIngestResponse(BaseModel):
    accepted: bool = True
    task_id: str
    message: str = "Sensor reading queued for processing"
