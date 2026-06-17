"""IoT sensor ingest and processing tests."""

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import SensorState, SpotStatus
from app.models.parking_spot import ParkingSpot
from app.models.sensor_log import SensorLog
from tests.conftest import SENSOR_API_KEY


@pytest.mark.asyncio
async def test_sensor_ingest_requires_api_key(client: AsyncClient, test_spot: ParkingSpot) -> None:
    response = await client.post(
        "/api/v1/sensors/ingest",
        json={"spot_id": str(test_spot.id), "sensor_state": "DETECTED"},
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_sensor_ingest_rejects_invalid_api_key(
    client: AsyncClient,
    test_spot: ParkingSpot,
) -> None:
    response = await client.post(
        "/api/v1/sensors/ingest",
        headers={"X-API-Key": "wrong-key"},
        json={"spot_id": str(test_spot.id), "sensor_state": "DETECTED"},
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_sensor_ingest_success(
    client: AsyncClient,
    test_spot: ParkingSpot,
    mock_sensor_task,
) -> None:
    response = await client.post(
        "/api/v1/sensors/ingest",
        headers={"X-API-Key": SENSOR_API_KEY},
        json={"spot_id": str(test_spot.id), "sensor_state": "DETECTED"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["accepted"] is True
    assert body["task_id"] == "pytest-task-id"
    assert len(mock_sensor_task["calls"]) == 1
    assert mock_sensor_task["last_result"]["status"] == "ok"
    assert mock_sensor_task["last_result"]["spot_status"] == SpotStatus.OCCUPIED.value


@pytest.mark.asyncio
async def test_sensor_processing_updates_spot_and_writes_log(
    client: AsyncClient,
    db_session: AsyncSession,
    test_spot: ParkingSpot,
    mock_sensor_task,
) -> None:
    response = await client.post(
        "/api/v1/sensors/ingest",
        headers={"X-API-Key": SENSOR_API_KEY},
        json={"spot_id": str(test_spot.id), "sensor_state": "CLEAR"},
    )
    assert response.status_code == 200

    spot_id = test_spot.id
    db_session.expire_all()
    spot = await db_session.get(ParkingSpot, spot_id)
    assert spot is not None
    assert spot.status == SpotStatus.AVAILABLE

    logs = (await db_session.scalars(select(SensorLog).where(SensorLog.spot_id == spot_id))).all()
    assert len(logs) == 1
    assert logs[0].sensor_state == SensorState.CLEAR


@pytest.mark.asyncio
async def test_sensor_detected_marks_spot_occupied(
    client: AsyncClient,
    db_session: AsyncSession,
    test_spot: ParkingSpot,
    mock_sensor_task,
) -> None:
    spot_id = test_spot.id
    await client.post(
        "/api/v1/sensors/ingest",
        headers={"X-API-Key": SENSOR_API_KEY},
        json={"spot_id": str(spot_id), "sensor_state": "DETECTED"},
    )

    db_session.expire_all()
    spot = await db_session.get(ParkingSpot, spot_id)
    assert spot is not None
    assert spot.status == SpotStatus.OCCUPIED


@pytest.mark.asyncio
async def test_sensor_fault_creates_malfunction_alert(
    client: AsyncClient,
    db_session: AsyncSession,
    test_spot: ParkingSpot,
    mock_sensor_task,
) -> None:
    from sqlalchemy import select

    from app.models.malfunction_alert import MalfunctionAlert

    spot_id = test_spot.id
    response = await client.post(
        "/api/v1/sensors/ingest",
        headers={"X-API-Key": SENSOR_API_KEY},
        json={
            "spot_id": str(spot_id),
            "sensor_state": "FAULT",
            "device_id": "sensor-test-01",
        },
    )

    assert response.status_code == 200
    assert mock_sensor_task["last_result"]["status"] == "ok"

    db_session.expire_all()
    spot = await db_session.get(ParkingSpot, spot_id)
    assert spot is not None
    assert spot.status == SpotStatus.AVAILABLE

    alerts = (
        await db_session.scalars(
            select(MalfunctionAlert).where(MalfunctionAlert.spot_id == spot_id)
        )
    ).all()
    assert len(alerts) == 1
    assert alerts[0].device_id == "sensor-test-01"
    assert "fault" in alerts[0].message.lower()


@pytest.mark.asyncio
async def test_management_can_list_malfunction_alerts(
    client: AsyncClient,
    admin_auth_headers,
    test_spot: ParkingSpot,
    mock_sensor_task,
) -> None:
    await client.post(
        "/api/v1/sensors/ingest",
        headers={"X-API-Key": SENSOR_API_KEY},
        json={"spot_id": str(test_spot.id), "sensor_state": "FAULT"},
    )

    response = await client.get("/api/v1/alerts", headers=admin_auth_headers)
    assert response.status_code == 200
    alerts = response.json()
    assert len(alerts) >= 1
    assert alerts[0]["spot_id"] == str(test_spot.id)
    assert alerts[0]["resolved"] is False

