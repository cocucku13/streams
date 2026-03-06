"""add stream sessions table

Revision ID: 20260307_0002
Revises: 20260307_0001
Create Date: 2026-03-07 00:30:00

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260307_0002"
down_revision = "20260307_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "stream_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("stream_id", sa.Integer(), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("ingest_type", sa.String(length=50), nullable=False),
        sa.Column("viewer_peak", sa.Integer(), nullable=False),
        sa.Column("viewer_avg", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["stream_id"], ["streams.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_stream_sessions_id"), "stream_sessions", ["id"], unique=False)
    op.create_index(op.f("ix_stream_sessions_stream_id"), "stream_sessions", ["stream_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_stream_sessions_stream_id"), table_name="stream_sessions")
    op.drop_index(op.f("ix_stream_sessions_id"), table_name="stream_sessions")
    op.drop_table("stream_sessions")
