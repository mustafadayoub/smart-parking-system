"""Payment gateway and financial reporting tests."""

from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import PaymentStatus, ReservationStatus
from app.models.parking_spot import ParkingSpot
from app.models.reservation import Reservation
from app.models.user import User


async def _create_reservation(
    client: AsyncClient,
    headers: dict[str, str],
    spot_id: str,
    reservation_window,
) -> dict:
    start, end = reservation_window
    response = await client.post(
        "/api/v1/reservations",
        headers=headers,
        json={
            "spot_id": spot_id,
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "vehicle_plate": "TEST-001",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.mark.asyncio
async def test_reservation_includes_payment_fields(
    client: AsyncClient,
    driver_auth_headers,
    test_spot: ParkingSpot,
    reservation_window,
) -> None:
    body = await _create_reservation(
        client, driver_auth_headers, str(test_spot.id), reservation_window
    )

    assert body["payment_status"] == PaymentStatus.PENDING.value
    assert Decimal(body["total_price"]) == Decimal("10.00")
    assert body["vehicle_plate"] == "TEST-001"
    assert body["reservation_number"].startswith("SP-")


@pytest.mark.asyncio
async def test_payment_success_with_mock_card(
    client: AsyncClient,
    driver_auth_headers,
    test_spot: ParkingSpot,
    reservation_window,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import app.celery_app.tasks as celery_tasks

    queued: list[str] = []

    def mock_delay(reservation_id: str) -> None:
        queued.append(reservation_id)

    monkeypatch.setattr(celery_tasks.send_booking_receipt, "delay", mock_delay)

    reservation = await _create_reservation(
        client, driver_auth_headers, str(test_spot.id), reservation_window
    )

    response = await client.post(
        "/api/v1/payments/process",
        headers=driver_auth_headers,
        json={
            "reservation_id": reservation["id"],
            "card_number": "4242 4242 4242 4242",
            "expiry": "12/28",
            "cvv": "123",
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["payment_status"] == PaymentStatus.PAID.value
    assert body["receipt_queued"] is True
    assert len(queued) == 1


@pytest.mark.asyncio
async def test_payment_failure_with_invalid_card(
    client: AsyncClient,
    driver_auth_headers,
    test_spot: ParkingSpot,
    reservation_window,
) -> None:
    reservation = await _create_reservation(
        client, driver_auth_headers, str(test_spot.id), reservation_window
    )

    response = await client.post(
        "/api/v1/payments/process",
        headers=driver_auth_headers,
        json={
            "reservation_id": reservation["id"],
            "card_number": "4000 0000 0000 0002",
            "expiry": "12/28",
            "cvv": "123",
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["payment_status"] == PaymentStatus.FAILED.value
    assert body["receipt_queued"] is False


@pytest.mark.asyncio
async def test_cannot_pay_for_other_users_reservation(
    client: AsyncClient,
    driver_auth_headers,
    admin_auth_headers,
    driver_user: User,
    test_spot: ParkingSpot,
    reservation_window,
) -> None:
    reservation = await _create_reservation(
        client, driver_auth_headers, str(test_spot.id), reservation_window
    )

    response = await client.post(
        "/api/v1/payments/process",
        headers=admin_auth_headers,
        json={
            "reservation_id": reservation["id"],
            "card_number": "4242 4242 4242 4242",
            "expiry": "12/28",
            "cvv": "123",
        },
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_financial_report_for_management(
    db_session: AsyncSession,
    client: AsyncClient,
    admin_auth_headers,
    driver_user: User,
    test_spot: ParkingSpot,
) -> None:
    now = datetime.now(UTC)
    paid = Reservation(
        reservation_number="SP-TEST-0001",
        user_id=driver_user.id,
        spot_id=test_spot.id,
        vehicle_plate="TEST-99",
        start_time=now + timedelta(hours=1),
        end_time=now + timedelta(hours=3),
        status=ReservationStatus.ACTIVE,
        payment_status=PaymentStatus.PAID,
        total_price=Decimal("15.00"),
        created_at=now,
    )
    db_session.add(paid)
    await db_session.commit()

    response = await client.get("/api/v1/reports/financial", headers=admin_auth_headers)

    assert response.status_code == 200, response.text
    body = response.json()
    assert Decimal(body["today"]["total_revenue"]) == Decimal("15.00")
    assert body["today"]["paid_reservations"] == 1
    assert Decimal(body["today"]["average_transaction_value"]) == Decimal("15.00")


@pytest.mark.asyncio
async def test_financial_report_requires_management(
    client: AsyncClient,
    driver_auth_headers,
) -> None:
    response = await client.get("/api/v1/reports/financial", headers=driver_auth_headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_payment_webhook_confirms_payment(
    client: AsyncClient,
    driver_auth_headers,
    test_spot: ParkingSpot,
    reservation_window,
) -> None:
    from tests.conftest import SENSOR_API_KEY

    reservation = await _create_reservation(
        client, driver_auth_headers, str(test_spot.id), reservation_window
    )

    response = await client.post(
        "/api/v1/payments/webhook",
        headers={"X-Gateway-Key": SENSOR_API_KEY},
        json={
            "reservation_id": reservation["id"],
            "gateway_reference": "GW-TEST-001",
            "amount": "10.00",
            "status": "CONFIRMED",
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["payment_status"] == PaymentStatus.PAID.value
    assert body["gateway_reference"] == "GW-TEST-001"


@pytest.mark.asyncio
async def test_payment_webhook_rejects_invalid_key(
    client: AsyncClient,
    driver_auth_headers,
    test_spot: ParkingSpot,
    reservation_window,
) -> None:
    reservation = await _create_reservation(
        client, driver_auth_headers, str(test_spot.id), reservation_window
    )

    response = await client.post(
        "/api/v1/payments/webhook",
        headers={"X-Gateway-Key": "wrong-key"},
        json={
            "reservation_id": reservation["id"],
            "gateway_reference": "GW-TEST-002",
            "amount": "10.00",
            "status": "CONFIRMED",
        },
    )

    assert response.status_code == 403

