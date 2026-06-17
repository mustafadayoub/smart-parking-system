from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.reservation import (
    ReservationCancelResponse,
    ReservationCreate,
    ReservationResponse,
)
from app.services import (
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ReservationService,
    ValidationError,
    build_reservation_response,
)

router = APIRouter()


@router.get("/me", response_model=list[ReservationResponse])
async def list_my_reservations(
    active_only: bool = Query(default=False, description="Return only active reservations"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ReservationResponse]:
    reservations = await ReservationService.list_for_user(
        db,
        current_user.id,
        active_only=active_only,
    )
    return [
        ReservationResponse.model_validate(build_reservation_response(reservation))
        for reservation in reservations
    ]


@router.post("", response_model=ReservationResponse, status_code=status.HTTP_201_CREATED)
async def create_reservation(
    payload: ReservationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReservationResponse:
    try:
        reservation = await ReservationService.create_reservation(db, current_user, payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc

    return ReservationResponse.model_validate(build_reservation_response(reservation))


@router.delete("/{reservation_id}", response_model=ReservationCancelResponse)
async def cancel_reservation(
    reservation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReservationCancelResponse:
    try:
        reservation, refund_eligible, refund_processed, message = (
            await ReservationService.cancel_reservation(
                db,
                reservation_id,
                requesting_user=current_user,
            )
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ForbiddenError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc

    from app.celery_app.tasks import send_cancellation_notification, send_refund_notification

    send_cancellation_notification.delay(
        str(reservation.id),
        refund_eligible,
        refund_processed,
    )
    if refund_processed:
        send_refund_notification.delay(str(reservation.id))

    return ReservationCancelResponse(
        reservation=ReservationResponse.model_validate(build_reservation_response(reservation)),
        message=message,
        refund_eligible=refund_eligible,
        refund_processed=refund_processed,
        notification_queued=True,
    )
