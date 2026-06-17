"""User management API tests."""

from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import UserRole
from app.core.security import hash_password
from app.models.user import User
from app.services import ConflictError, UserService


@pytest.mark.asyncio
async def test_list_users_requires_management(
    client: AsyncClient,
    driver_auth_headers,
) -> None:
    response = await client.get("/api/v1/users", headers=driver_auth_headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_users_for_management(
    client: AsyncClient,
    admin_auth_headers,
    driver_user: User,
    admin_user: User,
) -> None:
    response = await client.get("/api/v1/users", headers=admin_auth_headers)

    assert response.status_code == 200
    emails = {user["email"] for user in response.json()}
    assert driver_user.email in emails
    assert admin_user.email in emails


@pytest.mark.asyncio
async def test_update_user_role_and_name(
    client: AsyncClient,
    admin_auth_headers,
    driver_user: User,
) -> None:
    response = await client.patch(
        f"/api/v1/users/{driver_user.id}",
        headers=admin_auth_headers,
        json={"full_name": "Updated Driver", "role": UserRole.MANAGEMENT.value},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["full_name"] == "Updated Driver"
    assert body["role"] == UserRole.MANAGEMENT.value


@pytest.mark.asyncio
async def test_delete_user(
    client: AsyncClient,
    admin_auth_headers,
    db_session: AsyncSession,
) -> None:
    extra = User(
        email="extra-driver@example.com",
        password_hash=hash_password("Driver123!"),
        role=UserRole.DRIVER,
        full_name="Extra Driver",
    )
    db_session.add(extra)
    await db_session.commit()
    await db_session.refresh(extra)

    response = await client.delete(f"/api/v1/users/{extra.id}", headers=admin_auth_headers)
    assert response.status_code == 204

    listed = await client.get("/api/v1/users", headers=admin_auth_headers)
    emails = {user["email"] for user in listed.json()}
    assert extra.email not in emails


@pytest.mark.asyncio
async def test_cannot_delete_own_account(
    client: AsyncClient,
    admin_auth_headers,
    admin_user: User,
) -> None:
    response = await client.delete(f"/api/v1/users/{admin_user.id}", headers=admin_auth_headers)
    assert response.status_code == 422
    assert "cannot delete your own account" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_cannot_delete_last_management_user(
    db_session: AsyncSession,
    admin_user: User,
) -> None:
    other_admin = User(
        id=uuid4(),
        email="ghost-admin@example.com",
        password_hash=hash_password("Admin123!"),
        role=UserRole.MANAGEMENT,
    )

    with pytest.raises(ConflictError, match="last management user"):
        await UserService.delete_user(
            db_session,
            admin_user.id,
            requesting_user=other_admin,
        )
