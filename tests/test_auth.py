"""Authentication and authorization tests."""

import pytest
from httpx import AsyncClient

from tests.conftest import TEST_DRIVER_EMAIL, TEST_DRIVER_PASSWORD


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "new-user@example.com",
            "password": "SecurePass123!",
            "role": "DRIVER",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "new-user@example.com"
    assert body["role"] == "DRIVER"
    assert "id" in body


@pytest.mark.asyncio
async def test_login_success_returns_jwt(client: AsyncClient, driver_user) -> None:
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": TEST_DRIVER_EMAIL, "password": TEST_DRIVER_PASSWORD},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == TEST_DRIVER_EMAIL


@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient, driver_user) -> None:
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": TEST_DRIVER_EMAIL, "password": "WrongPassword!"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


@pytest.mark.asyncio
async def test_get_me_authenticated(client: AsyncClient, driver_auth_headers) -> None:
    response = await client.get("/api/v1/auth/me", headers=driver_auth_headers)

    assert response.status_code == 200
    assert response.json()["email"] == TEST_DRIVER_EMAIL
    assert response.json()["role"] == "DRIVER"


@pytest.mark.asyncio
async def test_get_me_unauthorized(client: AsyncClient) -> None:
    response = await client.get("/api/v1/auth/me")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_driver_cannot_create_spot(
    client: AsyncClient,
    driver_auth_headers,
    test_spot,
) -> None:
    response = await client.post(
        "/api/v1/spots",
        headers=driver_auth_headers,
        json={"spot_number": "X-999", "level_zone": "Level-X", "status": "AVAILABLE"},
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_create_spot(client: AsyncClient, admin_auth_headers) -> None:
    response = await client.post(
        "/api/v1/spots",
        headers=admin_auth_headers,
        json={"spot_number": "M-001", "level_zone": "Level-M", "status": "AVAILABLE"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["spot_number"] == "M-001"
    assert body["status"] == "AVAILABLE"
