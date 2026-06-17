"""add payment fields to reservations

Revision ID: 002_payment
Revises: 001_initial
Create Date: 2026-06-11 12:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002_payment"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

payment_status = postgresql.ENUM(
    "PENDING", "PAID", "FAILED", "REFUNDED", name="payment_status", create_type=False
)


def upgrade() -> None:
    bind = op.get_bind()
    payment_status.create(bind, checkfirst=True)

    op.add_column(
        "reservations",
        sa.Column(
            "payment_status",
            payment_status,
            nullable=False,
            server_default="PENDING",
        ),
    )
    op.add_column(
        "reservations",
        sa.Column(
            "total_price",
            sa.Numeric(precision=10, scale=2),
            nullable=False,
            server_default="0.00",
        ),
    )
    op.alter_column("reservations", "payment_status", server_default=None)
    op.alter_column("reservations", "total_price", server_default=None)


def downgrade() -> None:
    op.drop_column("reservations", "total_price")
    op.drop_column("reservations", "payment_status")

    bind = op.get_bind()
    payment_status.drop(bind, checkfirst=True)
