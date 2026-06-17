from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import verify_sensor_api_key
from app.celery_app.tasks import process_sensor_reading
from app.database import get_db
from app.schemas.sensor import SensorIngestRequest, SensorIngestResponse
from app.services import NotFoundError, SpotService

router = APIRouter()


@router.post("/ingest", response_model=SensorIngestResponse)
async def ingest_sensor_reading(
    payload: SensorIngestRequest,
    _: None = Depends(verify_sensor_api_key),
    db: AsyncSession = Depends(get_db),
) -> SensorIngestResponse:
    try:
        await SpotService.get_spot(db, payload.spot_id)
    except NotFoundError as exc:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    task = process_sensor_reading.delay(
        str(payload.spot_id),
        payload.sensor_state.value,
        payload.timestamp.isoformat() if payload.timestamp else None,
        payload.device_id,
    )
    return SensorIngestResponse(task_id=task.id)
