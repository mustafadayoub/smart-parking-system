"""initial schema

Revision ID: 001_initial
Revises:
Create Date: 2026-06-11 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

user_role = postgresql.ENUM("DRIVER", "MANAGEMENT", name="user_role", create_type=False)
spot_status = postgresql.ENUM(
    "AVAILABLE", "RESERVED", "OCCUPIED", "MAINTENANCE", name="spot_status", create_type=False
)
reservation_status = postgresql.ENUM(
    "ACTIVE", "COMPLETED", "CANCELLED", "NO_SHOW", name="reservation_status", create_type=False
)
sensor_state = postgresql.ENUM("DETECTED", "CLEAR", "FAULT", name="sensor_state", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    user_role.create(bind, checkfirst=True)
    spot_status.create(bind, checkfirst=True)
    reservation_status.create(bind, checkfirst=True)
    sensor_state.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "parking_spots",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("spot_number", sa.String(length=32), nullable=False),
        sa.Column("level_zone", sa.String(length=64), nullable=False),
        sa.Column("status", spot_status, nullable=False),
        sa.Column("last_updated", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_parking_spots_level_zone"), "parking_spots", ["level_zone"], unique=False)
    op.create_index(op.f("ix_parking_spots_spot_number"), "parking_spots", ["spot_number"], unique=True)

    op.create_table(
        "reservations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("spot_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", reservation_status, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["spot_id"], ["parking_spots.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_reservations_spot_id"), "reservations", ["spot_id"], unique=False)
    op.create_index(op.f("ix_reservations_user_id"), "reservations", ["user_id"], unique=False)

    op.create_table(
        "sensor_logs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("spot_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sensor_state", sensor_state, nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["spot_id"], ["parking_spots.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_sensor_logs_spot_id"), "sensor_logs", ["spot_id"], unique=False)
    op.create_index(op.f("ix_sensor_logs_timestamp"), "sensor_logs", ["timestamp"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_sensor_logs_timestamp"), table_name="sensor_logs")
    op.drop_index(op.f("ix_sensor_logs_spot_id"), table_name="sensor_logs")
    op.drop_table("sensor_logs")

    op.drop_index(op.f("ix_reservations_user_id"), table_name="reservations")
    op.drop_index(op.f("ix_reservations_spot_id"), table_name="reservations")
    op.drop_table("reservations")

    op.drop_index(op.f("ix_parking_spots_spot_number"), table_name="parking_spots")
    op.drop_index(op.f("ix_parking_spots_level_zone"), table_name="parking_spots")
    op.drop_table("parking_spots")

    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")

    bind = op.get_bind()
    sensor_state.drop(bind, checkfirst=True)
    reservation_status.drop(bind, checkfirst=True)
    spot_status.drop(bind, checkfirst=True)
    user_role.drop(bind, checkfirst=True)
