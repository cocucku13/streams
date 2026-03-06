"""initial baseline

Revision ID: 20260307_0001
Revises: 
Create Date: 2026-03-07 00:00:00

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260307_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=100), nullable=False),
        sa.Column("bio", sa.Text(), nullable=False),
        sa.Column("avatar_url", sa.String(length=255), nullable=False),
        sa.Column("club_name", sa.String(length=120), nullable=False),
        sa.Column("stream_key", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("stream_key"),
        sa.UniqueConstraint("username"),
    )
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_stream_key"), "users", ["stream_key"], unique=True)
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)

    op.create_table(
        "dj_profiles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("cover_url", sa.String(length=255), nullable=False),
        sa.Column("avatar_url", sa.String(length=255), nullable=False),
        sa.Column("bio", sa.Text(), nullable=False),
        sa.Column("socials", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(op.f("ix_dj_profiles_id"), "dj_profiles", ["id"], unique=False)
    op.create_index(op.f("ix_dj_profiles_user_id"), "dj_profiles", ["user_id"], unique=True)

    op.create_table(
        "clubs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("city", sa.String(length=120), nullable=False),
        sa.Column("address", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("avatar_url", sa.String(length=255), nullable=False),
        sa.Column("cover_url", sa.String(length=255), nullable=False),
        sa.Column("socials", sa.JSON(), nullable=False),
        sa.Column("owner_user_id", sa.Integer(), nullable=False),
        sa.Column("visibility", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index(op.f("ix_clubs_id"), "clubs", ["id"], unique=False)
    op.create_index(op.f("ix_clubs_owner_user_id"), "clubs", ["owner_user_id"], unique=False)
    op.create_index(op.f("ix_clubs_slug"), "clubs", ["slug"], unique=True)
    op.create_index(op.f("ix_clubs_title"), "clubs", ["title"], unique=False)

    op.create_table(
        "streams",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("genre", sa.String(length=80), nullable=False),
        sa.Column("current_track", sa.String(length=200), nullable=False),
        sa.Column("is_live", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_streams_id"), "streams", ["id"], unique=False)
    op.create_index(op.f("ix_streams_owner_id"), "streams", ["owner_id"], unique=False)

    op.create_table(
        "club_invites",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("club_id", sa.Integer(), nullable=False),
        sa.Column("invited_user_id", sa.Integer(), nullable=True),
        sa.Column("invited_email", sa.String(length=160), nullable=False),
        sa.Column("invited_by_user_id", sa.Integer(), nullable=False),
        sa.Column("role_to_assign", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("token", sa.String(length=120), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["club_id"], ["clubs.id"]),
        sa.ForeignKeyConstraint(["invited_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["invited_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token"),
    )
    op.create_index(op.f("ix_club_invites_club_id"), "club_invites", ["club_id"], unique=False)
    op.create_index(op.f("ix_club_invites_id"), "club_invites", ["id"], unique=False)
    op.create_index(op.f("ix_club_invites_invited_by_user_id"), "club_invites", ["invited_by_user_id"], unique=False)
    op.create_index(op.f("ix_club_invites_invited_user_id"), "club_invites", ["invited_user_id"], unique=False)
    op.create_index(op.f("ix_club_invites_token"), "club_invites", ["token"], unique=True)

    op.create_table(
        "club_memberships",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("club_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("joined_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["club_id"], ["clubs.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_club_memberships_club_id"), "club_memberships", ["club_id"], unique=False)
    op.create_index(op.f("ix_club_memberships_id"), "club_memberships", ["id"], unique=False)
    op.create_index(op.f("ix_club_memberships_user_id"), "club_memberships", ["user_id"], unique=False)

    op.create_table(
        "media_assets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("owner_type", sa.String(length=20), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("club_id", sa.Integer(), nullable=True),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("url", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["club_id"], ["clubs.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_media_assets_club_id"), "media_assets", ["club_id"], unique=False)
    op.create_index(op.f("ix_media_assets_id"), "media_assets", ["id"], unique=False)
    op.create_index(op.f("ix_media_assets_owner_id"), "media_assets", ["owner_id"], unique=False)
    op.create_index(op.f("ix_media_assets_owner_type"), "media_assets", ["owner_type"], unique=False)

    op.create_table(
        "stream_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("stream_id", sa.Integer(), nullable=False),
        sa.Column("club_id", sa.Integer(), nullable=True),
        sa.Column("visibility", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["club_id"], ["clubs.id"]),
        sa.ForeignKeyConstraint(["stream_id"], ["streams.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("stream_id"),
    )
    op.create_index(op.f("ix_stream_settings_club_id"), "stream_settings", ["club_id"], unique=False)
    op.create_index(op.f("ix_stream_settings_id"), "stream_settings", ["id"], unique=False)
    op.create_index(op.f("ix_stream_settings_stream_id"), "stream_settings", ["stream_id"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_stream_settings_stream_id"), table_name="stream_settings")
    op.drop_index(op.f("ix_stream_settings_id"), table_name="stream_settings")
    op.drop_index(op.f("ix_stream_settings_club_id"), table_name="stream_settings")
    op.drop_table("stream_settings")

    op.drop_index(op.f("ix_media_assets_owner_type"), table_name="media_assets")
    op.drop_index(op.f("ix_media_assets_owner_id"), table_name="media_assets")
    op.drop_index(op.f("ix_media_assets_id"), table_name="media_assets")
    op.drop_index(op.f("ix_media_assets_club_id"), table_name="media_assets")
    op.drop_table("media_assets")

    op.drop_index(op.f("ix_club_memberships_user_id"), table_name="club_memberships")
    op.drop_index(op.f("ix_club_memberships_id"), table_name="club_memberships")
    op.drop_index(op.f("ix_club_memberships_club_id"), table_name="club_memberships")
    op.drop_table("club_memberships")

    op.drop_index(op.f("ix_club_invites_token"), table_name="club_invites")
    op.drop_index(op.f("ix_club_invites_invited_user_id"), table_name="club_invites")
    op.drop_index(op.f("ix_club_invites_invited_by_user_id"), table_name="club_invites")
    op.drop_index(op.f("ix_club_invites_id"), table_name="club_invites")
    op.drop_index(op.f("ix_club_invites_club_id"), table_name="club_invites")
    op.drop_table("club_invites")

    op.drop_index(op.f("ix_streams_owner_id"), table_name="streams")
    op.drop_index(op.f("ix_streams_id"), table_name="streams")
    op.drop_table("streams")

    op.drop_index(op.f("ix_clubs_title"), table_name="clubs")
    op.drop_index(op.f("ix_clubs_slug"), table_name="clubs")
    op.drop_index(op.f("ix_clubs_owner_user_id"), table_name="clubs")
    op.drop_index(op.f("ix_clubs_id"), table_name="clubs")
    op.drop_table("clubs")

    op.drop_index(op.f("ix_dj_profiles_user_id"), table_name="dj_profiles")
    op.drop_index(op.f("ix_dj_profiles_id"), table_name="dj_profiles")
    op.drop_table("dj_profiles")

    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_index(op.f("ix_users_stream_key"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_table("users")
