from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.enums import UserRole
from app.database import get_db
from app.models.user import User
from app.schemas.alert import MalfunctionAlertResolve, MalfunctionAlertResponse
from app.services import MalfunctionAlertService, NotFoundError

router = APIRouter()


@router.get("", response_model=list[MalfunctionAlertResponse])
async def list_malfunction_alerts(
    unresolved_only: bool = Query(default=True),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.MANAGEMENT)),
) -> list[MalfunctionAlertResponse]:
    alerts = await MalfunctionAlertService.list_alerts(db, unresolved_only=unresolved_only)
    return [
        MalfunctionAlertResponse(
            id=alert.id,
            spot_id=alert.spot_id,
            message=alert.message,
            device_id=alert.device_id,
            resolved=alert.resolved,
            created_at=alert.created_at,
            spot_number=alert.spot.spot_number if alert.spot else None,
            level_zone=alert.spot.level_zone if alert.spot else None,
        )
        for alert in alerts
    ]


@router.patch("/{alert_id}", response_model=MalfunctionAlertResponse)
async def resolve_malfunction_alert(
    alert_id: UUID,
    payload: MalfunctionAlertResolve,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.MANAGEMENT)),
) -> MalfunctionAlertResponse:
    try:
        alert = await MalfunctionAlertService.resolve_alert(db, alert_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    if not payload.resolved:
        alert.resolved = False
        await db.flush()

    return MalfunctionAlertResponse(
        id=alert.id,
        spot_id=alert.spot_id,
        message=alert.message,
        device_id=alert.device_id,
        resolved=alert.resolved,
        created_at=alert.created_at,
        spot_number=alert.spot.spot_number if alert.spot else None,
        level_zone=alert.spot.level_zone if alert.spot else None,
    )
