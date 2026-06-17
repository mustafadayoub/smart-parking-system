"""Reservation cancellation and refund policy tests."""

from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import PaymentStatus, ReservationStatus, SpotStatus
from app.models.parking_spot import ParkingSpot
from tests.test_payments import _create_reservation


@pytest.mark.asyncio
async def test_cancel_with_refund_when_paid_and_eligible(
    client: AsyncClient,
    driver_auth_headers,
    test_spot: ParkingSpot,
    refund_eligible_window,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import app.celery_app.tasks as celery_tasks

    cancel_calls: list[tuple] = []
    refund_calls: list[str] = []

    def mock_cancel(reservation_id: str, refund_eligible: bool, refund_processed: bool) -> None:
        cancel_calls.append((reservation_id, refund_eligible, refund_processed))

    def mock_refund(reservation_id: str, gateway_reference: str | None = None) -> None:
        refund_calls.append(reservation_id)

    monkeypatch.setattr(celery_tasks.send_cancellation_notification, "delay", mock_cancel)
    monkeypatch.setattr(celery_tasks.send_refund_notification, "delay", mock_refund)

    reservation = await _create_reservation(
        client, driver_auth_headers, str(test_spot.id), refund_eligible_window
    )

    pay = await client.post(
        "/api/v1/payments/process",
        headers=driver_auth_headers,
        json={
            "reservation_id": reservation["id"],
            "card_number": "4242 4242 4242 4242",
            "expiry": "12/28",
            "cvv": "123",
        },
    )
    assert pay.status_code == 200

    response = await client.delete(
        f"/api/v1/reservations/{reservation['id']}",
        headers=driver_auth_headers,
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["refund_eligible"] is True
    assert body["refund_processed"] is True
    assert body["notification_queued"] is True
    assert body["reservation"]["status"] == ReservationStatus.CANCELLED.value
    assert body["reservation"]["payment_status"] == PaymentStatus.REFUNDED.value
    assert len(cancel_calls) == 1
    assert cancel_calls[0][1] is True
    assert cancel_calls[0][2] is True
    assert len(refund_calls) == 1


@pytest.mark.asyncio
async def test_cancel_without_refund_when_start_within_one_hour(
    client: AsyncClient,
    driver_auth_headers,
    test_spot: ParkingSpot,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import app.celery_app.tasks as celery_tasks

    cancel_calls: list[tuple] = []

    def mock_cancel(reservation_id: str, refund_eligible: bool, refund_processed: bool) -> None:
        cancel_calls.append((reservation_id, refund_eligible, refund_processed))

    monkeypatch.setattr(celery_tasks.send_cancellation_notification, "delay", mock_cancel)
    monkeypatch.setattr(celery_tasks.send_refund_notification, "delay", lambda *_: None)

    start = datetime.now(UTC) + timedelta(minutes=30)
    end = start + timedelta(hours=2)

    create = await client.post(
        "/api/v1/reservations",
        headers=driver_auth_headers,
        json={
            "spot_id": str(test_spot.id),
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "vehicle_plate": "LATE-001",
        },
    )
    assert create.status_code == 201
    reservation = create.json()

    pay = await client.post(
        "/api/v1/payments/process",
        headers=driver_auth_headers,
        json={
            "reservation_id": reservation["id"],
            "card_number": "4242 4242 4242 4242",
            "expiry": "12/28",
            "cvv": "123",
        },
    )
    assert pay.status_code == 200

    response = await client.delete(
        f"/api/v1/reservations/{reservation['id']}",
        headers=driver_auth_headers,
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["refund_eligible"] is False
    assert body["refund_processed"] is False
    assert body["reservation"]["payment_status"] == PaymentStatus.PAID.value
    assert cancel_calls[0][1] is False
    assert cancel_calls[0][2] is False


@pytest.mark.asyncio
async def test_cancel_frees_reserved_spot(
    db_session: AsyncSession,
    client: AsyncClient,
    driver_auth_headers,
    test_spot: ParkingSpot,
    reservation_window,
) -> None:
    spot_id = test_spot.id
    reservation = await _create_reservation(
        client, driver_auth_headers, str(spot_id), reservation_window
    )

    db_session.expire_all()
    spot = await db_session.get(ParkingSpot, spot_id)
    assert spot is not None
    assert spot.status == SpotStatus.RESERVED

    response = await client.delete(
        f"/api/v1/reservations/{reservation['id']}",
        headers=driver_auth_headers,
    )
    assert response.status_code == 200

    db_session.expire_all()
    spot = await db_session.get(ParkingSpot, spot_id)
    assert spot is not None
    assert spot.status == SpotStatus.AVAILABLE


@pytest.mark.asyncio
async def test_refund_endpoint(
    client: AsyncClient,
    driver_auth_headers,
    test_spot: ParkingSpot,
    refund_eligible_window,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import app.celery_app.tasks as celery_tasks

    refund_calls: list[str] = []

    def mock_refund(reservation_id: str, gateway_reference: str | None = None) -> None:
        refund_calls.append(reservation_id)

    monkeypatch.setattr(celery_tasks.send_refund_notification, "delay", mock_refund)

    reservation = await _create_reservation(
        client, driver_auth_headers, str(test_spot.id), refund_eligible_window
    )

    pay = await client.post(
        "/api/v1/payments/process",
        headers=driver_auth_headers,
        json={
            "reservation_id": reservation["id"],
            "card_number": "4242 4242 4242 4242",
            "expiry": "12/28",
            "cvv": "123",
        },
    )
    assert pay.status_code == 200

    response = await client.post(
        "/api/v1/payments/refund",
        headers=driver_auth_headers,
        json={"reservation_id": reservation["id"]},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["payment_status"] == PaymentStatus.REFUNDED.value
    assert Decimal(body["refund_amount"]) == Decimal("10.00")
    assert body["refund_queued"] is True
    assert len(refund_calls) == 1
