from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MalfunctionAlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    spot_id: UUID
    message: str
    device_id: str | None
    resolved: bool
    created_at: datetime
    spot_number: str | None = None
    level_zone: str | None = None


class MalfunctionAlertResolve(BaseModel):
    resolved: bool = Field(default=True)
