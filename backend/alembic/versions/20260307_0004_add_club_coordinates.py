"""add club coordinates

Revision ID: 20260307_0004
Revises: 20260307_0003
Create Date: 2026-03-07 12:00:00

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260307_0004"
down_revision = "20260307_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("clubs", sa.Column("lat", sa.Float(), nullable=True))
    op.add_column("clubs", sa.Column("lng", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("clubs", "lng")
    op.drop_column("clubs", "lat")
