"""diagram alignment schema

Revision ID: 003_diagram_alignment
Revises: 002_payment
Create Date: 2026-06-18 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "003_diagram_alignment"
down_revision: Union[str, None] = "002_payment"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

payment_transaction_type = postgresql.ENUM(
    "PAYMENT", "REFUND", name="payment_transaction_type", create_type=False
)


def upgrade() -> None:
    bind = op.get_bind()
    payment_transaction_type.create(bind, checkfirst=True)

    op.add_column("users", sa.Column("full_name", sa.String(length=128), nullable=True))

    op.add_column("reservations", sa.Column("vehicle_plate", sa.String(length=32), nullable=True))
    op.add_column(
        "reservations",
        sa.Column("reservation_number", sa.String(length=32), nullable=True),
    )

    op.execute(
        """
        UPDATE reservations
        SET reservation_number = 'SP-LEGACY-' || SUBSTRING(id::text, 1, 8)
        WHERE reservation_number IS NULL
        """
    )
    op.alter_column("reservations", "reservation_number", nullable=False)
    op.create_index(
        op.f("ix_reservations_reservation_number"),
        "reservations",
        ["reservation_number"],
        unique=True,
    )

    op.create_table(
        "malfunction_alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("spot_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("device_id", sa.String(length=64), nullable=True),
        sa.Column("resolved", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["spot_id"], ["parking_spots.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_malfunction_alerts_spot_id"), "malfunction_alerts", ["spot_id"], unique=False
    )

    op.create_table(
        "payment_transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reservation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("transaction_type", payment_transaction_type, nullable=False),
        sa.Column("amount", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("gateway_reference", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="COMPLETED"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["reservation_id"], ["reservations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_payment_transactions_reservation_id"),
        "payment_transactions",
        ["reservation_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_payment_transactions_reservation_id"), table_name="payment_transactions")
    op.drop_table("payment_transactions")
    op.drop_index(op.f("ix_malfunction_alerts_spot_id"), table_name="malfunction_alerts")
    op.drop_table("malfunction_alerts")
    op.drop_index(op.f("ix_reservations_reservation_number"), table_name="reservations")
    op.drop_column("reservations", "reservation_number")
    op.drop_column("reservations", "vehicle_plate")
    op.drop_column("users", "full_name")

    bind = op.get_bind()
    payment_transaction_type.drop(bind, checkfirst=True)
