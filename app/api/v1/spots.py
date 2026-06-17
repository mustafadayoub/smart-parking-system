from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.core.enums import SpotStatus, UserRole
from app.database import get_db
from app.models.user import User
from app.schemas.parking_spot import ParkingSpotCreate, ParkingSpotResponse, ParkingSpotUpdate
from app.services import ConflictError, NotFoundError, SpotService

router = APIRouter()


@router.get("", response_model=list[ParkingSpotResponse])
async def list_spots(
    status: SpotStatus | None = Query(default=None, description="Filter by spot status"),
    level_zone: str | None = Query(default=None, description="Filter by level or zone"),
    db: AsyncSession = Depends(get_db),
) -> list[ParkingSpotResponse]:
    spots = await SpotService.list_spots(db, status=status, level_zone=level_zone)
    return [ParkingSpotResponse.model_validate(spot) for spot in spots]


@router.get("/{spot_id}", response_model=ParkingSpotResponse)
async def get_spot(
    spot_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> ParkingSpotResponse:
    try:
        spot = await SpotService.get_spot(db, spot_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return ParkingSpotResponse.model_validate(spot)


@router.post("", response_model=ParkingSpotResponse, status_code=status.HTTP_201_CREATED)
async def create_spot(
    payload: ParkingSpotCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.MANAGEMENT)),
) -> ParkingSpotResponse:
    try:
        spot = await SpotService.create_spot(
            db,
            spot_number=payload.spot_number,
            level_zone=payload.level_zone,
            status=payload.status,
        )
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return ParkingSpotResponse.model_validate(spot)


@router.patch("/{spot_id}", response_model=ParkingSpotResponse)
async def update_spot(
    spot_id: UUID,
    payload: ParkingSpotUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.MANAGEMENT)),
) -> ParkingSpotResponse:
    try:
        spot = await SpotService.patch_spot(
            db,
            spot_id,
            status=payload.status,
            spot_number=payload.spot_number,
            level_zone=payload.level_zone,
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return ParkingSpotResponse.model_validate(spot)
