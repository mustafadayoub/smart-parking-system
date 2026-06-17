"""Reservation business-logic tests."""

from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import ReservationStatus, SpotStatus
from app.models.parking_spot import ParkingSpot
from app.models.reservation import Reservation
from app.models.user import User


@pytest.mark.asyncio
async def test_create_reservation_success(
    client: AsyncClient,
    driver_auth_headers,
    driver_user: User,
    test_spot: ParkingSpot,
    reservation_window,
) -> None:
    start, end = reservation_window

    response = await client.post(
        "/api/v1/reservations",
        headers=driver_auth_headers,
        json={
            "spot_id": str(test_spot.id),
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "vehicle_plate": "ABC-1234",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["user_id"] == str(driver_user.id)
    assert body["spot_id"] == str(test_spot.id)
    assert body["status"] == ReservationStatus.ACTIVE.value
    assert body["vehicle_plate"] == "ABC-1234"
    assert body["reservation_number"].startswith("SP-")


@pytest.mark.asyncio
async def test_prevent_double_booking_same_window(
    client: AsyncClient,
    driver_auth_headers,
    test_spot: ParkingSpot,
    reservation_window,
) -> None:
    start, end = reservation_window
    payload = {
        "spot_id": str(test_spot.id),
        "start_time": start.isoformat(),
        "end_time": end.isoformat(),
        "vehicle_plate": "ABC-1234",
    }

    first = await client.post("/api/v1/reservations", headers=driver_auth_headers, json=payload)
    assert first.status_code == 201

    second = await client.post("/api/v1/reservations", headers=driver_auth_headers, json=payload)
    assert second.status_code == 409
    assert "already has an active reservation" in second.json()["detail"]


@pytest.mark.asyncio
async def test_list_my_reservations(
    client: AsyncClient,
    driver_auth_headers,
    test_spot: ParkingSpot,
    reservation_window,
) -> None:
    start, end = reservation_window
    await client.post(
        "/api/v1/reservations",
        headers=driver_auth_headers,
        json={
            "spot_id": str(test_spot.id),
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "vehicle_plate": "ABC-1234",
        },
    )

    response = await client.get("/api/v1/reservations/me", headers=driver_auth_headers)

    assert response.status_code == 200
    reservations = response.json()
    assert len(reservations) == 1
    assert reservations[0]["spot_id"] == str(test_spot.id)


@pytest.mark.asyncio
async def test_reserved_spot_marked_as_reserved_in_database(
    db_session: AsyncSession,
    client: AsyncClient,
    driver_auth_headers,
    test_spot: ParkingSpot,
    reservation_window,
) -> None:
    start, end = reservation_window

    response = await client.post(
        "/api/v1/reservations",
        headers=driver_auth_headers,
        json={
            "spot_id": str(test_spot.id),
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "vehicle_plate": "ABC-1234",
        },
    )
    assert response.status_code == 201

    refreshed = await db_session.get(ParkingSpot, test_spot.id)
    assert refreshed is not None
    assert refreshed.status == SpotStatus.RESERVED


@pytest.mark.asyncio
async def test_overlapping_reservation_conflict(
    db_session: AsyncSession,
    client: AsyncClient,
    driver_auth_headers,
    driver_user: User,
    test_spot: ParkingSpot,
) -> None:
    start = datetime.now(UTC) + timedelta(hours=2)
    end = start + timedelta(hours=4)

    existing = Reservation(
        reservation_number="SP-TEST-OVERLAP",
        user_id=driver_user.id,
        spot_id=test_spot.id,
        vehicle_plate="OVR-001",
        start_time=start,
        end_time=end,
        status=ReservationStatus.ACTIVE,
    )
    db_session.add(existing)
    await db_session.flush()

    overlap_start = start + timedelta(hours=1)
    overlap_end = overlap_start + timedelta(hours=2)

    response = await client.post(
        "/api/v1/reservations",
        headers=driver_auth_headers,
        json={
            "spot_id": str(test_spot.id),
            "start_time": overlap_start.isoformat(),
            "end_time": overlap_end.isoformat(),
            "vehicle_plate": "ABC-5678",
        },
    )

    assert response.status_code == 409
