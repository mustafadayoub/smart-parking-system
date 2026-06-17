from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.config import settings
from app.core.enums import PaymentStatus
from app.database import get_db
from app.models.user import User
from app.schemas.payment import (
    PaymentProcessRequest,
    PaymentProcessResponse,
    PaymentRefundRequest,
    PaymentRefundResponse,
    PaymentWebhookRequest,
)
from app.services import (
    ConflictError,
    ForbiddenError,
    NotFoundError,
    PaymentService,
    ValidationError,
)

router = APIRouter()


@router.post("/process", response_model=PaymentProcessResponse)
async def process_payment(
    payload: PaymentProcessRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaymentProcessResponse:
    try:
        reservation, success, gateway_reference = await PaymentService.process_payment(
            db, current_user, payload
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ForbiddenError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc

    receipt_queued = False
    if success:
        from app.celery_app.tasks import send_booking_receipt

        send_booking_receipt.delay(str(reservation.id))
        receipt_queued = True
        message = "Payment successful. Your spot is confirmed."
    else:
        message = "Payment failed. Please check your card details and try again."

    return PaymentProcessResponse(
        reservation_id=reservation.id,
        payment_status=reservation.payment_status,
        total_price=reservation.total_price,
        message=message,
        receipt_queued=receipt_queued,
        gateway_reference=gateway_reference,
    )


@router.post("/refund", response_model=PaymentRefundResponse)
async def refund_payment(
    payload: PaymentRefundRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaymentRefundResponse:
    try:
        reservation, tx = await PaymentService.process_refund_request(db, current_user, payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ForbiddenError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc

    from app.celery_app.tasks import send_refund_notification

    send_refund_notification.delay(str(reservation.id), tx.gateway_reference)

    return PaymentRefundResponse(
        reservation_id=reservation.id,
        payment_status=reservation.payment_status,
        refund_amount=tx.amount,
        message="Refund processed successfully via payment gateway.",
        refund_queued=True,
        gateway_reference=tx.gateway_reference,
    )


@router.post("/webhook", response_model=PaymentProcessResponse)
async def payment_webhook(
    payload: PaymentWebhookRequest,
    db: AsyncSession = Depends(get_db),
    x_gateway_key: str | None = Header(default=None, alias="X-Gateway-Key"),
) -> PaymentProcessResponse:
    if x_gateway_key != settings.sensor_webhook_api_key:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid gateway key")

    try:
        reservation = await PaymentService.confirm_webhook(db, payload)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc

    return PaymentProcessResponse(
        reservation_id=reservation.id,
        payment_status=reservation.payment_status,
        total_price=reservation.total_price,
        message="Payment confirmed by gateway webhook.",
        receipt_queued=False,
        gateway_reference=payload.gateway_reference,
    )
