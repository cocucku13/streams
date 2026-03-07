"""add chat messages table

Revision ID: 20260307_0003
Revises: 20260307_0002
Create Date: 2026-03-07 03:00:00

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260307_0003"
down_revision = "20260307_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("stream_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["stream_id"], ["streams.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_chat_messages_id"), "chat_messages", ["id"], unique=False)
    op.create_index(op.f("ix_chat_messages_stream_id"), "chat_messages", ["stream_id"], unique=False)
    op.create_index(op.f("ix_chat_messages_user_id"), "chat_messages", ["user_id"], unique=False)
    op.create_index(op.f("ix_chat_messages_created_at"), "chat_messages", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_chat_messages_created_at"), table_name="chat_messages")
    op.drop_index(op.f("ix_chat_messages_user_id"), table_name="chat_messages")
    op.drop_index(op.f("ix_chat_messages_stream_id"), table_name="chat_messages")
    op.drop_index(op.f("ix_chat_messages_id"), table_name="chat_messages")
    op.drop_table("chat_messages")
