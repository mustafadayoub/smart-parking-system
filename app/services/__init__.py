from datetime import UTC, datetime, timedelta, date
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

import redis.asyncio as aioredis
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.core.enums import (
    PaymentStatus,
    PaymentTransactionType,
    ReservationStatus,
    SensorState,
    SpotStatus,
    UserRole,
)
from app.core.security import hash_password, verify_password
from app.models.malfunction_alert import MalfunctionAlert
from app.models.parking_spot import ParkingSpot
from app.models.payment_transaction import PaymentTransaction
from app.models.reservation import Reservation
from app.models.sensor_log import SensorLog
from app.models.user import User
from app.schemas.parking_spot import SpotUpdatePayload
from app.schemas.payment import PaymentProcessRequest, PaymentRefundRequest, PaymentWebhookRequest
from app.schemas.report import DailyOccupancyReport, FinancialPeriodMetrics, FinancialReportResponse, HourlyOccupancyBucket
from app.schemas.reservation import ReservationCreate
from app.schemas.user import UserCreate, UserUpdate


class NotFoundError(Exception):
    pass


class ConflictError(Exception):
    pass


class ForbiddenError(Exception):
    pass


class ValidationError(Exception):
    pass


class AuthError(Exception):
    pass


async def get_redis() -> aioredis.Redis:
    return aioredis.from_url(settings.redis_url, decode_responses=True)


async def publish_spot_update(payload: SpotUpdatePayload) -> None:
    client = await get_redis()
    try:
        await client.publish(settings.spot_updates_channel, payload.model_dump_json())
    finally:
        await client.aclose()


async def publish_driver_notification(payload_json: str) -> None:
    client = await get_redis()
    try:
        await client.publish(settings.driver_notifications_channel, payload_json)
    finally:
        await client.aclose()


async def publish_management_alert(payload_json: str) -> None:
    client = await get_redis()
    try:
        await client.publish(settings.management_alerts_channel, payload_json)
    finally:
        await client.aclose()


def build_reservation_response(reservation: Reservation) -> dict:
    return {
        "id": reservation.id,
        "reservation_number": reservation.reservation_number,
        "user_id": reservation.user_id,
        "spot_id": reservation.spot_id,
        "vehicle_plate": reservation.vehicle_plate,
        "start_time": reservation.start_time,
        "end_time": reservation.end_time,
        "status": reservation.status,
        "payment_status": reservation.payment_status,
        "total_price": reservation.total_price,
        "created_at": reservation.created_at,
        "driver_name": reservation.user.full_name if reservation.user else None,
        "spot_number": reservation.spot.spot_number if reservation.spot else None,
        "level_zone": reservation.spot.level_zone if reservation.spot else None,
    }


async def generate_reservation_number(db: AsyncSession) -> str:
    today = datetime.now(UTC).strftime("%Y%m%d")
    prefix = f"SP-{today}-"
    count = await db.scalar(
        select(func.count(Reservation.id)).where(Reservation.reservation_number.like(f"{prefix}%"))
    )
    return f"{prefix}{int(count or 0) + 1:04d}"


def _gateway_reference(prefix: str) -> str:
    import secrets

    return f"{prefix}-{secrets.token_hex(4).upper()}"


def calculate_reservation_price(start_time: datetime, end_time: datetime) -> Decimal:
    duration_hours = (end_time - start_time).total_seconds() / 3600
    amount = Decimal(str(duration_hours)) * Decimal(str(settings.hourly_parking_rate))
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class UserService:
    @staticmethod
    async def register(db: AsyncSession, data: UserCreate) -> User:
        existing = await db.scalar(select(User).where(User.email == data.email))
        if existing:
            raise ConflictError("Email already registered")

        user = User(
            email=data.email,
            password_hash=hash_password(data.password),
            role=data.role,
            full_name=data.full_name,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
        return user

    @staticmethod
    async def authenticate(db: AsyncSession, email: str, password: str) -> User:
        user = await db.scalar(select(User).where(User.email == email))
        if not user or not verify_password(password, user.password_hash):
            raise AuthError("Invalid email or password")
        return user

    @staticmethod
    async def get_by_id(db: AsyncSession, user_id: UUID) -> User:
        user = await db.get(User, user_id)
        if not user:
            raise NotFoundError("User not found")
        return user

    @staticmethod
    async def list_users(db: AsyncSession) -> list[User]:
        result = await db.scalars(select(User).order_by(User.created_at.desc()))
        return list(result.all())

    @staticmethod
    async def update_user(db: AsyncSession, user_id: UUID, data: UserUpdate) -> User:
        user = await UserService.get_by_id(db, user_id)
        if data.full_name is not None:
            user.full_name = data.full_name
        if data.role is not None:
            user.role = data.role
        await db.flush()
        await db.refresh(user)
        return user

    @staticmethod
    async def delete_user(db: AsyncSession, user_id: UUID, *, requesting_user: User) -> None:
        if requesting_user.id == user_id:
            raise ValidationError("You cannot delete your own account")

        user = await UserService.get_by_id(db, user_id)
        if user.role == UserRole.MANAGEMENT:
            mgmt_count = await db.scalar(
                select(func.count(User.id)).where(User.role == UserRole.MANAGEMENT)
            )
            if int(mgmt_count or 0) <= 1:
                raise ConflictError("Cannot delete the last management user")

        await db.delete(user)
        await db.flush()


class SpotService:
    @staticmethod
    def _apply_filters(
        query: Select[tuple[ParkingSpot]],
        *,
        status: SpotStatus | None = None,
        level_zone: str | None = None,
    ) -> Select[tuple[ParkingSpot]]:
        if status is not None:
            query = query.where(ParkingSpot.status == status)
        if level_zone is not None:
            query = query.where(ParkingSpot.level_zone == level_zone)
        return query

    @staticmethod
    async def list_spots(
        db: AsyncSession,
        *,
        status: SpotStatus | None = None,
        level_zone: str | None = None,
    ) -> list[ParkingSpot]:
        query = select(ParkingSpot).order_by(ParkingSpot.level_zone, ParkingSpot.spot_number)
        query = SpotService._apply_filters(query, status=status, level_zone=level_zone)
        result = await db.scalars(query)
        return list(result.all())

    @staticmethod
    async def get_spot(db: AsyncSession, spot_id: UUID) -> ParkingSpot:
        spot = await db.get(ParkingSpot, spot_id)
        if not spot:
            raise NotFoundError("Parking spot not found")
        return spot

    @staticmethod
    async def create_spot(
        db: AsyncSession,
        *,
        spot_number: str,
        level_zone: str,
        status: SpotStatus = SpotStatus.AVAILABLE,
    ) -> ParkingSpot:
        existing = await db.scalar(
            select(ParkingSpot).where(ParkingSpot.spot_number == spot_number)
        )
        if existing:
            raise ConflictError(f"Spot number {spot_number} already exists")

        spot = ParkingSpot(
            spot_number=spot_number,
            level_zone=level_zone,
            status=status,
        )
        db.add(spot)
        await db.flush()
        await db.refresh(spot)

        if status != SpotStatus.AVAILABLE:
            await SpotService.update_status(db, spot, status, source="management")

        return spot

    @staticmethod
    async def patch_spot(
        db: AsyncSession,
        spot_id: UUID,
        *,
        status: SpotStatus | None = None,
        spot_number: str | None = None,
        level_zone: str | None = None,
    ) -> ParkingSpot:
        spot = await SpotService.get_spot(db, spot_id)

        if spot_number and spot_number != spot.spot_number:
            existing = await db.scalar(
                select(ParkingSpot).where(ParkingSpot.spot_number == spot_number)
            )
            if existing:
                raise ConflictError(f"Spot number {spot_number} already exists")
            spot.spot_number = spot_number

        if level_zone:
            spot.level_zone = level_zone

        if status is not None:
            return await SpotService.update_status(db, spot, status, source="management")

        spot.last_updated = datetime.now(UTC)
        await db.flush()
        await db.refresh(spot)
        await publish_spot_update(
            SpotUpdatePayload(
                spot_id=spot.id,
                spot_number=spot.spot_number,
                level_zone=spot.level_zone,
                status=spot.status,
                last_updated=spot.last_updated,
                source="management",
            )
        )
        return spot

    @staticmethod
    async def update_status(
        db: AsyncSession,
        spot: ParkingSpot,
        status: SpotStatus,
        *,
        source: str = "system",
        publish: bool = True,
    ) -> ParkingSpot:
        spot.status = status
        spot.last_updated = datetime.now(UTC)
        await db.flush()
        await db.refresh(spot)

        if publish:
            await publish_spot_update(
                SpotUpdatePayload(
                    spot_id=spot.id,
                    spot_number=spot.spot_number,
                    level_zone=spot.level_zone,
                    status=spot.status,
                    last_updated=spot.last_updated,
                    source=source,
                )
            )
        return spot


class ReservationService:
    @staticmethod
    async def _has_overlap(
        db: AsyncSession,
        spot_id: UUID,
        start_time: datetime,
        end_time: datetime,
        *,
        exclude_reservation_id: UUID | None = None,
    ) -> bool:
        query = select(Reservation.id).where(
            Reservation.spot_id == spot_id,
            Reservation.status == ReservationStatus.ACTIVE,
            Reservation.start_time < end_time,
            Reservation.end_time > start_time,
        )
        if exclude_reservation_id:
            query = query.where(Reservation.id != exclude_reservation_id)
        overlap = await db.scalar(query.limit(1))
        return overlap is not None

    @staticmethod
    async def create_reservation(
        db: AsyncSession,
        user: User,
        data: ReservationCreate,
    ) -> Reservation:
        spot = await SpotService.get_spot(db, data.spot_id)

        if spot.status in (SpotStatus.OCCUPIED, SpotStatus.MAINTENANCE):
            raise ConflictError(f"Spot is not bookable (current status: {spot.status.value})")

        if data.start_time < datetime.now(UTC):
            raise ValidationError("start_time must be in the future")

        if await ReservationService._has_overlap(db, spot.id, data.start_time, data.end_time):
            raise ConflictError("Spot already has an active reservation for the requested window")

        total_price = calculate_reservation_price(data.start_time, data.end_time)
        reservation_number = await generate_reservation_number(db)

        reservation = Reservation(
            reservation_number=reservation_number,
            user_id=user.id,
            spot_id=spot.id,
            vehicle_plate=data.vehicle_plate,
            start_time=data.start_time,
            end_time=data.end_time,
            status=ReservationStatus.ACTIVE,
            payment_status=PaymentStatus.PENDING,
            total_price=total_price,
        )
        db.add(reservation)

        await SpotService.update_status(db, spot, SpotStatus.RESERVED, source="reservation")
        await db.flush()
        await db.refresh(reservation, attribute_names=["spot", "user"])
        return reservation

    @staticmethod
    async def get_reservation(db: AsyncSession, reservation_id: UUID) -> Reservation:
        query = (
            select(Reservation)
            .options(selectinload(Reservation.spot), selectinload(Reservation.user))
            .where(Reservation.id == reservation_id)
        )
        reservation = await db.scalar(query)
        if not reservation:
            raise NotFoundError("Reservation not found")
        return reservation

    @staticmethod
    def _is_cancellable(reservation: Reservation) -> tuple[bool, str]:
        if reservation.status != ReservationStatus.ACTIVE:
            return False, f"Reservation is {reservation.status.value} and cannot be cancelled"

        now = datetime.now(UTC)
        if now >= reservation.end_time:
            return False, "Reservation window has already ended"

        return True, "Cancellation allowed"

    @staticmethod
    def _refund_eligible(reservation: Reservation) -> bool:
        now = datetime.now(UTC)
        hours_until_start = (reservation.start_time - now).total_seconds() / 3600
        return hours_until_start >= 1

    @staticmethod
    async def cancel_reservation(
        db: AsyncSession,
        reservation_id: UUID,
        *,
        requesting_user: User,
    ) -> tuple[Reservation, bool, str]:
        reservation = await ReservationService.get_reservation(db, reservation_id)

        if (
            reservation.user_id != requesting_user.id
            and requesting_user.role != UserRole.MANAGEMENT
        ):
            raise ForbiddenError("You can only cancel your own reservations")

        allowed, reason = ReservationService._is_cancellable(reservation)
        if not allowed:
            raise ValidationError(reason)

        refund_eligible = ReservationService._refund_eligible(reservation)
        refund_processed = False
        reservation.status = ReservationStatus.CANCELLED

        if refund_eligible and reservation.payment_status == PaymentStatus.PAID:
            await PaymentService.process_refund(db, reservation)
            refund_processed = True

        spot = reservation.spot
        if spot.status == SpotStatus.RESERVED:
            await SpotService.update_status(db, spot, SpotStatus.AVAILABLE, source="reservation")

        await db.flush()
        await db.refresh(reservation, attribute_names=["spot", "user"])
        return reservation, refund_eligible, refund_processed, "Reservation cancelled successfully"

    @staticmethod
    async def list_for_user(
        db: AsyncSession,
        user_id: UUID,
        *,
        active_only: bool = False,
    ) -> list[Reservation]:
        query = (
            select(Reservation)
            .options(selectinload(Reservation.spot), selectinload(Reservation.user))
            .where(Reservation.user_id == user_id)
            .order_by(Reservation.start_time.desc())
        )
        if active_only:
            query = query.where(Reservation.status == ReservationStatus.ACTIVE)

        result = await db.scalars(query)
        return list(result.all())


class PaymentService:
    @staticmethod
    def _validate_card_details(data: PaymentProcessRequest) -> bool:
        if not PaymentService._card_is_successful(data.card_number):
            return False
        month_str, year_str = data.expiry.split("/")
        month = int(month_str)
        if month < 1 or month > 12:
            return False
        if len(data.cvv) not in (3, 4):
            return False
        return True

    @staticmethod
    def _card_is_successful(card_number: str) -> bool:
        normalized = card_number.replace(" ", "").replace("-", "")
        return normalized == settings.mock_payment_success_card

    @staticmethod
    async def _record_transaction(
        db: AsyncSession,
        reservation: Reservation,
        *,
        transaction_type: PaymentTransactionType,
        amount: Decimal,
        gateway_reference: str,
    ) -> PaymentTransaction:
        tx = PaymentTransaction(
            reservation_id=reservation.id,
            transaction_type=transaction_type,
            amount=amount,
            gateway_reference=gateway_reference,
            status="COMPLETED",
        )
        db.add(tx)
        await db.flush()
        return tx

    @staticmethod
    async def process_payment(
        db: AsyncSession,
        user: User,
        data: PaymentProcessRequest,
    ) -> tuple[Reservation, bool, str | None]:
        reservation = await ReservationService.get_reservation(db, data.reservation_id)

        if reservation.user_id != user.id:
            raise ForbiddenError("You can only pay for your own reservations")

        if reservation.status != ReservationStatus.ACTIVE:
            raise ValidationError(f"Reservation is {reservation.status.value} and cannot be paid")

        if reservation.payment_status == PaymentStatus.PAID:
            raise ConflictError("Reservation is already paid")

        if reservation.payment_status == PaymentStatus.REFUNDED:
            raise ValidationError("Reservation payment was refunded")

        success = PaymentService._validate_card_details(data)
        gateway_reference = None
        if success:
            reservation.payment_status = PaymentStatus.PAID
            gateway_reference = _gateway_reference("PAY")
            await PaymentService._record_transaction(
                db,
                reservation,
                transaction_type=PaymentTransactionType.PAYMENT,
                amount=reservation.total_price,
                gateway_reference=gateway_reference,
            )
        else:
            reservation.payment_status = PaymentStatus.FAILED

        await db.flush()
        await db.refresh(reservation, attribute_names=["spot", "user"])
        return reservation, success, gateway_reference

    @staticmethod
    async def process_refund(db: AsyncSession, reservation: Reservation) -> PaymentTransaction:
        if reservation.payment_status != PaymentStatus.PAID:
            raise ValidationError("Only paid reservations can be refunded")

        reservation.payment_status = PaymentStatus.REFUNDED
        gateway_reference = _gateway_reference("REF")
        tx = await PaymentService._record_transaction(
            db,
            reservation,
            transaction_type=PaymentTransactionType.REFUND,
            amount=reservation.total_price,
            gateway_reference=gateway_reference,
        )
        await db.flush()
        return tx

    @staticmethod
    async def process_refund_request(
        db: AsyncSession,
        user: User,
        data: PaymentRefundRequest,
    ) -> tuple[Reservation, PaymentTransaction]:
        reservation = await ReservationService.get_reservation(db, data.reservation_id)

        if reservation.user_id != user.id and user.role != UserRole.MANAGEMENT:
            raise ForbiddenError("You can only refund your own reservations")

        if not ReservationService._refund_eligible(reservation):
            raise ValidationError("Refund is not eligible for this reservation")

        tx = await PaymentService.process_refund(db, reservation)
        await db.refresh(reservation, attribute_names=["spot", "user"])
        return reservation, tx

    @staticmethod
    async def confirm_webhook(
        db: AsyncSession,
        data: PaymentWebhookRequest,
    ) -> Reservation:
        reservation = await ReservationService.get_reservation(db, data.reservation_id)

        if data.status.upper() != "CONFIRMED":
            raise ValidationError("Gateway payment was not confirmed")

        if reservation.payment_status != PaymentStatus.PAID:
            reservation.payment_status = PaymentStatus.PAID
            await PaymentService._record_transaction(
                db,
                reservation,
                transaction_type=PaymentTransactionType.PAYMENT,
                amount=data.amount,
                gateway_reference=data.gateway_reference,
            )
            await db.flush()

        await db.refresh(reservation, attribute_names=["spot", "user"])
        return reservation


class MalfunctionAlertService:
    @staticmethod
    async def list_alerts(
        db: AsyncSession,
        *,
        unresolved_only: bool = True,
        limit: int = 50,
    ) -> list[MalfunctionAlert]:
        query = (
            select(MalfunctionAlert)
            .options(selectinload(MalfunctionAlert.spot))
            .order_by(MalfunctionAlert.created_at.desc())
            .limit(limit)
        )
        if unresolved_only:
            query = query.where(MalfunctionAlert.resolved.is_(False))
        result = await db.scalars(query)
        return list(result.all())

    @staticmethod
    async def resolve_alert(db: AsyncSession, alert_id: UUID) -> MalfunctionAlert:
        alert = await db.get(MalfunctionAlert, alert_id)
        if not alert:
            raise NotFoundError("Alert not found")
        alert.resolved = True
        await db.flush()
        await db.refresh(alert, attribute_names=["spot"])
        return alert


class ReportService:
    @staticmethod
    async def get_cached_occupancy_report(
        report_date: date | None = None,
    ) -> tuple[DailyOccupancyReport, str]:
        import json
        from datetime import date as date_type

        target_date = report_date or (datetime.now(UTC) - timedelta(days=1)).date()
        cache_key = f"occupancy_report:{target_date.isoformat()}"

        client = await get_redis()
        try:
            raw = await client.get(cache_key)
        finally:
            await client.aclose()

        if not raw:
            raise NotFoundError(f"No cached report found for {target_date.isoformat()}")

        data = json.loads(raw)
        report = DailyOccupancyReport(
            report_date=date_type.fromisoformat(data["report_date"]),
            total_spots=data["total_spots"],
            peak_hour=data["peak_hour"],
            peak_utilization_rate=data["peak_utilization_rate"],
            average_utilization_rate=data["average_utilization_rate"],
            hourly_breakdown=[
                HourlyOccupancyBucket(**bucket) for bucket in data["hourly_breakdown"]
            ],
            generated_at=datetime.fromisoformat(data["generated_at"]),
        )
        return report, cache_key

    @staticmethod
    async def get_occupancy_report(
        db: AsyncSession,
        *,
        report_date: datetime | None = None,
        level_zone: str | None = None,
    ) -> DailyOccupancyReport:
        target_date = (report_date or datetime.now(UTC)).date()
        day_start = datetime.combine(target_date, datetime.min.time(), tzinfo=UTC)
        day_end = day_start + timedelta(days=1)

        total_spots_query = select(func.count(ParkingSpot.id))
        if level_zone:
            total_spots_query = total_spots_query.where(ParkingSpot.level_zone == level_zone)
        total_spots = int(await db.scalar(total_spots_query) or 0)

        logs_query = (
            select(
                func.extract("hour", SensorLog.timestamp).label("hour"),
                SensorLog.sensor_state,
                func.count(SensorLog.id).label("count"),
            )
            .join(ParkingSpot, ParkingSpot.id == SensorLog.spot_id)
            .where(SensorLog.timestamp >= day_start, SensorLog.timestamp < day_end)
        )
        if level_zone:
            logs_query = logs_query.where(ParkingSpot.level_zone == level_zone)
        logs_query = logs_query.group_by("hour", SensorLog.sensor_state).order_by("hour")

        rows = (await db.execute(logs_query)).all()

        hourly: dict[int, dict[str, int]] = {
            hour: {"DETECTED": 0, "CLEAR": 0} for hour in range(24)
        }
        for hour, sensor_state, count in rows:
            hour_int = int(hour)
            state_key = sensor_state.value if hasattr(sensor_state, "value") else str(sensor_state)
            if state_key in ("DETECTED", "CLEAR"):
                hourly[hour_int][state_key] = int(count)

        breakdown: list[HourlyOccupancyBucket] = []
        peak_hour: int | None = None
        peak_rate = 0.0
        utilization_rates: list[float] = []

        for hour in range(24):
            detected = hourly[hour]["DETECTED"]
            clear = hourly[hour]["CLEAR"]
            total_readings = detected + clear
            rate = (detected / total_readings) if total_readings else 0.0
            breakdown.append(
                HourlyOccupancyBucket(
                    hour=hour,
                    detected_readings=detected,
                    clear_readings=clear,
                    utilization_rate=round(rate, 4),
                )
            )
            if total_readings:
                utilization_rates.append(rate)
            if rate > peak_rate:
                peak_rate = rate
                peak_hour = hour

        average_rate = sum(utilization_rates) / len(utilization_rates) if utilization_rates else 0.0

        return DailyOccupancyReport(
            report_date=target_date,
            total_spots=total_spots,
            peak_hour=peak_hour,
            peak_utilization_rate=round(peak_rate, 4),
            average_utilization_rate=round(average_rate, 4),
            hourly_breakdown=breakdown,
            generated_at=datetime.now(UTC),
        )

    @staticmethod
    async def _aggregate_financial_period(
        db: AsyncSession,
        period_start: datetime,
        period_end: datetime,
    ) -> FinancialPeriodMetrics:
        row = await db.execute(
            select(
                func.coalesce(func.sum(Reservation.total_price), 0),
                func.count(Reservation.id),
            ).where(
                Reservation.payment_status == PaymentStatus.PAID,
                Reservation.created_at >= period_start,
                Reservation.created_at < period_end,
            )
        )
        total_revenue_raw, paid_count = row.one()
        total_revenue = Decimal(str(total_revenue_raw)).quantize(Decimal("0.01"))
        paid_reservations = int(paid_count or 0)
        if paid_reservations:
            average = (total_revenue / paid_reservations).quantize(Decimal("0.01"))
        else:
            average = Decimal("0.00")

        return FinancialPeriodMetrics(
            total_revenue=total_revenue,
            paid_reservations=paid_reservations,
            average_transaction_value=average,
        )

    @staticmethod
    async def get_financial_report(db: AsyncSession) -> FinancialReportResponse:
        now = datetime.now(UTC)
        today_start = datetime.combine(now.date(), datetime.min.time(), tzinfo=UTC)
        week_start = today_start - timedelta(days=now.weekday())
        month_start = datetime(now.year, now.month, 1, tzinfo=UTC)
        tomorrow = today_start + timedelta(days=1)

        today = await ReportService._aggregate_financial_period(db, today_start, tomorrow)
        this_week = await ReportService._aggregate_financial_period(db, week_start, tomorrow)
        this_month = await ReportService._aggregate_financial_period(db, month_start, tomorrow)

        return FinancialReportResponse(
            today=today,
            this_week=this_week,
            this_month=this_month,
            generated_at=now,
        )


def map_sensor_state_to_spot_status(sensor_state: SensorState) -> SpotStatus | None:
    if sensor_state == SensorState.DETECTED:
        return SpotStatus.OCCUPIED
    if sensor_state == SensorState.CLEAR:
        return SpotStatus.AVAILABLE
    return None
