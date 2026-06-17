import json
import logging
from datetime import UTC, datetime, timedelta
from uuid import UUID

import redis
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, selectinload, sessionmaker

from app.celery_app.celery import celery
from app.config import settings
from app.core.enums import ReservationStatus, SensorState, SpotStatus
from app.models.malfunction_alert import MalfunctionAlert
from app.models.parking_spot import ParkingSpot
from app.models.payment_transaction import PaymentTransaction
from app.models.reservation import Reservation
from app.models.sensor_log import SensorLog
from app.schemas.parking_spot import SpotUpdatePayload
from app.services import map_sensor_state_to_spot_status

logger = logging.getLogger(__name__)

sync_engine = create_engine(settings.database_url_sync, pool_pre_ping=True)
SyncSessionLocal = sessionmaker(bind=sync_engine, autocommit=False, autoflush=False)


def _publish_spot_update_sync(payload: SpotUpdatePayload) -> None:
    client = redis.from_url(settings.redis_url, decode_responses=True)
    try:
        client.publish(settings.spot_updates_channel, payload.model_dump_json())
    finally:
        client.close()


def _publish_management_alert_sync(payload_json: str) -> None:
    client = redis.from_url(settings.redis_url, decode_responses=True)
    try:
        client.publish(settings.management_alerts_channel, payload_json)
    finally:
        client.close()


@celery.task(name="app.celery_app.tasks.process_sensor_reading", bind=True, max_retries=3)
def process_sensor_reading(
    self,
    spot_id: str,
    sensor_state: str,
    timestamp: str | None = None,
    device_id: str | None = None,
) -> dict[str, str]:
    """Parse sensor data, persist logs, update spot status, and publish to Redis."""
    state = SensorState(sensor_state)
    reading_time = datetime.fromisoformat(timestamp) if timestamp else datetime.now(UTC)
    spot_uuid = UUID(spot_id)

    with SyncSessionLocal() as db:
        try:
            spot = db.get(ParkingSpot, spot_uuid)
            if not spot:
                logger.error("Spot %s not found during sensor processing", spot_id)
                return {"status": "error", "detail": "spot not found"}

            log = SensorLog(spot_id=spot_uuid, sensor_state=state, timestamp=reading_time)
            db.add(log)

            if state == SensorState.FAULT:
                alert = MalfunctionAlert(
                    spot_id=spot_uuid,
                    message=f"Sensor fault detected on spot {spot.spot_number}",
                    device_id=device_id,
                )
                db.add(alert)
                db.flush()
                from app.schemas.payment import MalfunctionAlertPayload

                alert_payload = MalfunctionAlertPayload(
                    alert_id=alert.id,
                    spot_id=spot.id,
                    spot_number=spot.spot_number,
                    level_zone=spot.level_zone,
                    message=alert.message,
                    device_id=device_id,
                    created_at=alert.created_at,
                )
                _publish_management_alert_sync(alert_payload.model_dump_json())
            else:
                new_status = map_sensor_state_to_spot_status(state)
                if new_status and spot.status != SpotStatus.MAINTENANCE:
                    if spot.status == SpotStatus.RESERVED and new_status == SpotStatus.AVAILABLE:
                        pass
                    else:
                        spot.status = new_status
                        spot.last_updated = reading_time

            db.commit()
            db.refresh(spot)

            payload = SpotUpdatePayload(
                spot_id=spot.id,
                spot_number=spot.spot_number,
                level_zone=spot.level_zone,
                status=spot.status,
                last_updated=spot.last_updated,
                source="sensor",
            )
            _publish_spot_update_sync(payload)
            return {"status": "ok", "spot_status": spot.status.value}
        except Exception as exc:
            db.rollback()
            logger.exception("Failed to process sensor reading for spot %s", spot_id)
            raise self.retry(exc=exc, countdown=2**self.request.retries) from exc


@celery.task(name="app.celery_app.tasks.expire_stale_reservations")
def expire_stale_reservations() -> dict[str, int]:
    """Mark no-show reservations and free spots after the grace period."""
    now = datetime.now(UTC)
    grace_cutoff = now - timedelta(minutes=settings.reservation_grace_period_minutes)
    expired_count = 0

    with SyncSessionLocal() as db:
        query = select(Reservation).where(
            Reservation.status == ReservationStatus.ACTIVE,
            Reservation.start_time <= grace_cutoff,
        )
        stale_reservations = db.scalars(query).all()

        for reservation in stale_reservations:
            spot = db.get(ParkingSpot, reservation.spot_id)
            reservation.status = ReservationStatus.NO_SHOW
            expired_count += 1

            if spot and spot.status == SpotStatus.RESERVED:
                spot.status = SpotStatus.AVAILABLE
                spot.last_updated = now
                db.flush()
                payload = SpotUpdatePayload(
                    spot_id=spot.id,
                    spot_number=spot.spot_number,
                    level_zone=spot.level_zone,
                    status=spot.status,
                    last_updated=spot.last_updated,
                    source="system",
                )
                _publish_spot_update_sync(payload)

        db.commit()

    logger.info("Expired %d stale reservations", expired_count)
    return {"expired": expired_count}


def _build_occupancy_report_sync(db: Session, report_date: datetime) -> dict:
    """Synchronous occupancy aggregation for Celery beat tasks."""
    from sqlalchemy import func

    target_date = report_date.date()
    day_start = datetime.combine(target_date, datetime.min.time(), tzinfo=UTC)
    day_end = day_start + timedelta(days=1)

    total_spots = int(db.scalar(select(func.count(ParkingSpot.id))) or 0)

    rows = db.execute(
        select(
            func.extract("hour", SensorLog.timestamp).label("hour"),
            SensorLog.sensor_state,
            func.count(SensorLog.id).label("count"),
        )
        .where(SensorLog.timestamp >= day_start, SensorLog.timestamp < day_end)
        .group_by("hour", SensorLog.sensor_state)
        .order_by("hour")
    ).all()

    hourly: dict[int, dict[str, int]] = {hour: {"DETECTED": 0, "CLEAR": 0} for hour in range(24)}
    for hour, sensor_state, count in rows:
        hour_int = int(hour)
        state_key = sensor_state.value if hasattr(sensor_state, "value") else str(sensor_state)
        if state_key in ("DETECTED", "CLEAR"):
            hourly[hour_int][state_key] = int(count)

    breakdown = []
    peak_hour = None
    peak_rate = 0.0
    utilization_rates: list[float] = []

    for hour in range(24):
        detected = hourly[hour]["DETECTED"]
        clear = hourly[hour]["CLEAR"]
        total_readings = detected + clear
        rate = (detected / total_readings) if total_readings else 0.0
        breakdown.append(
            {
                "hour": hour,
                "detected_readings": detected,
                "clear_readings": clear,
                "utilization_rate": round(rate, 4),
            }
        )
        if total_readings:
            utilization_rates.append(rate)
        if rate > peak_rate:
            peak_rate = rate
            peak_hour = hour

    average_rate = sum(utilization_rates) / len(utilization_rates) if utilization_rates else 0.0

    return {
        "report_date": target_date.isoformat(),
        "total_spots": total_spots,
        "peak_hour": peak_hour,
        "peak_utilization_rate": round(peak_rate, 4),
        "average_utilization_rate": round(average_rate, 4),
        "hourly_breakdown": breakdown,
        "generated_at": datetime.now(UTC).isoformat(),
    }


@celery.task(name="app.celery_app.tasks.generate_daily_occupancy_report")
def generate_daily_occupancy_report() -> dict[str, str]:
    """Aggregate sensor logs nightly and cache a summary for management dashboards."""
    report_date = (datetime.now(UTC) - timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    with SyncSessionLocal() as db:
        report = _build_occupancy_report_sync(db, report_date)

    cache_key = f"occupancy_report:{report['report_date']}"
    client = redis.from_url(settings.redis_url, decode_responses=True)
    try:
        client.setex(cache_key, timedelta(days=30), json.dumps(report))
    finally:
        client.close()

    logger.info("Generated daily occupancy report for %s", report["report_date"])
    return {"report_date": report["report_date"], "cache_key": cache_key}


def _publish_driver_notification_sync(payload_json: str) -> None:
    client = redis.from_url(settings.redis_url, decode_responses=True)
    try:
        client.publish(settings.driver_notifications_channel, payload_json)
    finally:
        client.close()


@celery.task(name="app.celery_app.tasks.send_booking_receipt")
def send_booking_receipt(reservation_id: str) -> dict[str, str]:
    """Simulate email receipt delivery and notify the driver via WebSocket."""
    from decimal import Decimal

    from app.core.enums import PaymentStatus
    from app.schemas.payment import BookingReceiptPayload

    reservation_uuid = UUID(reservation_id)
    now = datetime.now(UTC)

    with SyncSessionLocal() as db:
        reservation = db.scalar(
            select(Reservation)
            .options(
                selectinload(Reservation.spot),
                selectinload(Reservation.user),
            )
            .where(Reservation.id == reservation_uuid)
        )
        if not reservation:
            logger.error("Reservation %s not found for receipt task", reservation_id)
            return {"status": "error", "detail": "reservation not found"}

        if reservation.payment_status != PaymentStatus.PAID:
            logger.warning(
                "Skipping receipt for reservation %s with status %s",
                reservation_id,
                reservation.payment_status.value,
            )
            return {"status": "skipped", "detail": "not paid"}

        spot = reservation.spot
        user = reservation.user
        total_price = Decimal(str(reservation.total_price))

        receipt_lines = [
            "=" * 52,
            "  SMART PARKING SYSTEM — BOOKING RECEIPT (MOCK EMAIL)",
            "=" * 52,
            f"  To:      {user.email}",
            f"  Name:    {user.full_name or 'N/A'}",
            f"  Ref:     {reservation.reservation_number}",
            f"  Plate:   {reservation.vehicle_plate or 'N/A'}",
            f"  Spot:    {spot.spot_number} ({spot.level_zone})",
            f"  From:    {reservation.start_time.isoformat()}",
            f"  Until:   {reservation.end_time.isoformat()}",
            f"  Amount:  ${total_price:.2f}",
            f"  Status:  {reservation.payment_status.value}",
            f"  Paid at: {now.isoformat()}",
            "=" * 52,
        ]
        logger.info("\n%s", "\n".join(receipt_lines))
        print("\n".join(receipt_lines), flush=True)

        payload = BookingReceiptPayload(
            user_id=reservation.user_id,
            reservation_id=reservation.id,
            reservation_number=reservation.reservation_number,
            spot_number=spot.spot_number,
            level_zone=spot.level_zone,
            vehicle_plate=reservation.vehicle_plate,
            driver_name=user.full_name,
            start_time=reservation.start_time,
            end_time=reservation.end_time,
            total_price=total_price,
            payment_status=reservation.payment_status,
            message="Payment successful! Your spot is confirmed.",
            paid_at=now,
        )
        _publish_driver_notification_sync(payload.model_dump_json())

    return {"status": "ok", "reservation_id": reservation_id}


@celery.task(name="app.celery_app.tasks.send_cancellation_notification")
def send_cancellation_notification(
    reservation_id: str,
    refund_eligible: bool,
    refund_processed: bool,
) -> dict[str, str]:
    from app.schemas.payment import CancellationNotificationPayload

    reservation_uuid = UUID(reservation_id)
    now = datetime.now(UTC)

    with SyncSessionLocal() as db:
        reservation = db.scalar(
            select(Reservation)
            .options(selectinload(Reservation.spot), selectinload(Reservation.user))
            .where(Reservation.id == reservation_uuid)
        )
        if not reservation:
            return {"status": "error", "detail": "reservation not found"}

        spot = reservation.spot
        message = "Reservation cancelled successfully."
        if refund_processed:
            message = "Reservation cancelled and refund processed."

        lines = [
            "=" * 52,
            "  SMART PARKING SYSTEM — CANCELLATION NOTICE (MOCK EMAIL)",
            "=" * 52,
            f"  Ref:     {reservation.reservation_number}",
            f"  Spot:    {spot.spot_number}",
            f"  Refund:  {'Yes' if refund_processed else 'No'}",
            "=" * 52,
        ]
        print("\n".join(lines), flush=True)

        payload = CancellationNotificationPayload(
            user_id=reservation.user_id,
            reservation_id=reservation.id,
            reservation_number=reservation.reservation_number,
            spot_number=spot.spot_number,
            refund_eligible=refund_eligible,
            refund_processed=refund_processed,
            message=message,
            cancelled_at=now,
        )
        _publish_driver_notification_sync(payload.model_dump_json())

    return {"status": "ok", "reservation_id": reservation_id}


@celery.task(name="app.celery_app.tasks.send_refund_notification")
def send_refund_notification(
    reservation_id: str,
    gateway_reference: str | None = None,
) -> dict[str, str]:
    from decimal import Decimal

    from app.core.enums import PaymentTransactionType
    from app.schemas.payment import RefundNotificationPayload

    reservation_uuid = UUID(reservation_id)
    now = datetime.now(UTC)

    with SyncSessionLocal() as db:
        reservation = db.scalar(
            select(Reservation)
            .options(selectinload(Reservation.user))
            .where(Reservation.id == reservation_uuid)
        )
        if not reservation:
            return {"status": "error", "detail": "reservation not found"}

        tx = db.scalar(
            select(PaymentTransaction)
            .where(
                PaymentTransaction.reservation_id == reservation_uuid,
                PaymentTransaction.transaction_type == PaymentTransactionType.REFUND,
            )
            .order_by(PaymentTransaction.created_at.desc())
        )
        ref = gateway_reference or (tx.gateway_reference if tx else "REF-UNKNOWN")
        amount = Decimal(str(tx.amount)) if tx else Decimal(str(reservation.total_price))

        lines = [
            "=" * 52,
            "  SMART PARKING SYSTEM — REFUND RECEIPT (MOCK EMAIL)",
            "=" * 52,
            f"  Ref:     {reservation.reservation_number}",
            f"  Amount:  ${amount:.2f}",
            f"  Gateway: {ref}",
            "=" * 52,
        ]
        print("\n".join(lines), flush=True)

        payload = RefundNotificationPayload(
            user_id=reservation.user_id,
            reservation_id=reservation.id,
            reservation_number=reservation.reservation_number,
            refund_amount=amount,
            gateway_reference=ref,
            message="Refund processed successfully.",
            refunded_at=now,
        )
        _publish_driver_notification_sync(payload.model_dump_json())

    return {"status": "ok", "reservation_id": reservation_id}
