"""Shared pytest fixtures for API integration tests."""

from __future__ import annotations

import os
from collections.abc import AsyncGenerator, Callable
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session, sessionmaker

# Configure test environment before importing application modules.
os.environ.setdefault(
    "DATABASE_URL",
    os.getenv(
        "TEST_DATABASE_URL",
        "postgresql+asyncpg://parking:parking_secret@localhost:5432/smart_parking_test",
    ),
)
os.environ.setdefault(
    "DATABASE_URL_SYNC",
    os.getenv(
        "TEST_DATABASE_URL_SYNC",
        "postgresql+psycopg2://parking:parking_secret@localhost:5432/smart_parking_test",
    ),
)
os.environ.setdefault("REDIS_URL", os.getenv("TEST_REDIS_URL", "redis://localhost:6379/15"))
os.environ.setdefault("CELERY_BROKER_URL", "redis://localhost:6379/14")
os.environ.setdefault("CELERY_RESULT_BACKEND", "redis://localhost:6379/13")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-pytest-only")
os.environ.setdefault("SENSOR_WEBHOOK_API_KEY", "test-sensor-webhook-key")
os.environ.setdefault("DEBUG", "false")

from app.config import get_settings

get_settings.cache_clear()

from app.core.enums import SpotStatus, UserRole
from app.core.security import hash_password
from app.database import Base, get_db
from app.factory import create_app
from app.models.parking_spot import ParkingSpot
from app.models.user import User

TEST_DRIVER_EMAIL = "pytest-driver@example.com"
TEST_DRIVER_PASSWORD = "Driver123!"
TEST_ADMIN_EMAIL = "pytest-admin@example.com"
TEST_ADMIN_PASSWORD = "Admin123!"
SENSOR_API_KEY = os.environ["SENSOR_WEBHOOK_API_KEY"]


@pytest_asyncio.fixture
async def test_engine():
    engine = create_async_engine(os.environ["DATABASE_URL"], pool_pre_ping=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    session_factory = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
        autocommit=False,
    )

    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session
        await db_session.commit()

    app = create_app(enable_redis_listener=False)
    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as http_client:
        yield http_client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def driver_user(db_session: AsyncSession) -> User:
    user = User(
        email=TEST_DRIVER_EMAIL,
        password_hash=hash_password(TEST_DRIVER_PASSWORD),
        role=UserRole.DRIVER,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession) -> User:
    user = User(
        email=TEST_ADMIN_EMAIL,
        password_hash=hash_password(TEST_ADMIN_PASSWORD),
        role=UserRole.MANAGEMENT,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_spot(db_session: AsyncSession) -> ParkingSpot:
    spot = ParkingSpot(
        spot_number="T-001",
        level_zone="Test-Level",
        status=SpotStatus.AVAILABLE,
    )
    db_session.add(spot)
    await db_session.commit()
    await db_session.refresh(spot)
    return spot


@pytest_asyncio.fixture
async def driver_auth_headers(client: AsyncClient, driver_user: User) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": TEST_DRIVER_EMAIL, "password": TEST_DRIVER_PASSWORD},
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def admin_auth_headers(client: AsyncClient, admin_user: User) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD},
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def reservation_window() -> tuple[datetime, datetime]:
    start = datetime.now(UTC) + timedelta(hours=1)
    end = start + timedelta(hours=2)
    return start, end


@pytest.fixture
def refund_eligible_window() -> tuple[datetime, datetime]:
    start = datetime.now(UTC) + timedelta(hours=3)
    end = start + timedelta(hours=2)
    return start, end


@pytest.fixture
def sync_session_factory(test_engine) -> Callable[[], Session]:
    sync_url = os.environ["DATABASE_URL_SYNC"]
    sync_engine = create_engine(sync_url, pool_pre_ping=True)
    factory = sessionmaker(bind=sync_engine, autocommit=False, autoflush=False)
    return factory


@pytest.fixture
def mock_sensor_task(monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    """Run Celery sensor task synchronously and skip Redis publish."""
    import app.celery_app.tasks as celery_tasks

    captured: dict[str, Any] = {"calls": []}

    def immediate_delay(
        spot_id: str,
        sensor_state: str,
        timestamp: str | None = None,
        device_id: str | None = None,
    ) -> Any:
        captured["calls"].append(
            {
                "spot_id": spot_id,
                "sensor_state": sensor_state,
                "timestamp": timestamp,
                "device_id": device_id,
            }
        )
        result = celery_tasks.process_sensor_reading.apply(
            args=(spot_id, sensor_state, timestamp, device_id)
        ).get()
        captured["last_result"] = result

        class TaskResult:
            id = "pytest-task-id"

        return TaskResult()

    monkeypatch.setattr(celery_tasks.process_sensor_reading, "delay", immediate_delay)
    monkeypatch.setattr(celery_tasks, "_publish_spot_update_sync", lambda _payload: None)
    return captured
