"""Seed parking spots and a default management user for local development."""

import asyncio
import uuid

from sqlalchemy import select

from app.core.enums import SpotStatus, UserRole
from app.core.security import hash_password
from app.database import AsyncSessionLocal
from app.models.parking_spot import ParkingSpot
from app.models.user import User

DEFAULT_SPOTS = [
    ("A-001", "Level-A"),
    ("A-002", "Level-A"),
    ("A-003", "Level-A"),
    ("B-001", "Level-B"),
    ("B-002", "Level-B"),
    ("B-003", "Level-B"),
]

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "Admin123!"
DRIVER_EMAIL = "driver@example.com"
DRIVER_PASSWORD = "Driver123!"


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        existing_spots = await session.scalar(select(ParkingSpot.id).limit(1))
        if not existing_spots:
            for spot_number, level_zone in DEFAULT_SPOTS:
                session.add(
                    ParkingSpot(
                        id=uuid.uuid4(),
                        spot_number=spot_number,
                        level_zone=level_zone,
                        status=SpotStatus.AVAILABLE,
                    )
                )

        admin = await session.scalar(select(User).where(User.email == ADMIN_EMAIL))
        if not admin:
            session.add(
                User(
                    id=uuid.uuid4(),
                    email=ADMIN_EMAIL,
                    password_hash=hash_password(ADMIN_PASSWORD),
                    role=UserRole.MANAGEMENT,
                )
            )

        driver = await session.scalar(select(User).where(User.email == DRIVER_EMAIL))
        if not driver:
            session.add(
                User(
                    id=uuid.uuid4(),
                    email=DRIVER_EMAIL,
                    password_hash=hash_password(DRIVER_PASSWORD),
                    role=UserRole.DRIVER,
                )
            )

        await session.commit()
        print("Seed data applied successfully.")


if __name__ == "__main__":
    asyncio.run(seed())
