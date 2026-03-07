from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(100), default="DJ")
    bio: Mapped[str] = mapped_column(Text, default="")
    avatar_url: Mapped[str] = mapped_column(String(255), default="")
    club_name: Mapped[str] = mapped_column(String(120), default="")
    stream_key: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    streams: Mapped[list["Stream"]] = relationship(back_populates="owner")
    dj_profile: Mapped["DJProfile | None"] = relationship(back_populates="user", uselist=False)
    owned_clubs: Mapped[list["Club"]] = relationship(back_populates="owner")
    club_memberships: Mapped[list["ClubMembership"]] = relationship(back_populates="user")
    sent_club_invites: Mapped[list["ClubInvite"]] = relationship(
        back_populates="invited_by",
        foreign_keys="ClubInvite.invited_by_user_id",
    )


class Stream(Base):
    __tablename__ = "streams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(200), default="Live DJ Set")
    description: Mapped[str] = mapped_column(Text, default="")
    genre: Mapped[str] = mapped_column(String(80), default="")
    current_track: Mapped[str] = mapped_column(String(200), default="")
    is_live: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner: Mapped[User] = relationship(back_populates="streams")
    settings: Mapped["StreamSettings | None"] = relationship(back_populates="stream", uselist=False)
    sessions: Mapped[list["StreamSession"]] = relationship(back_populates="stream")
    chat_messages: Mapped[list["ChatMessage"]] = relationship(back_populates="stream")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    stream_id: Mapped[int] = mapped_column(ForeignKey("streams.id"), index=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True, default=0)
    username: Mapped[str] = mapped_column(String(50), default="Guest")
    message: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    stream: Mapped[Stream] = relationship(back_populates="chat_messages")


class StreamSession(Base):
    __tablename__ = "stream_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    stream_id: Mapped[int] = mapped_column(ForeignKey("streams.id"), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
    ingest_type: Mapped[str] = mapped_column(String(50), default="unknown")
    peak_viewers: Mapped[int] = mapped_column("viewer_peak", Integer, default=0)
    avg_viewers: Mapped[int] = mapped_column("viewer_avg", Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    stream: Mapped[Stream] = relationship(back_populates="sessions")


class DJProfile(Base):
    __tablename__ = "dj_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    cover_url: Mapped[str] = mapped_column(String(255), default="")
    avatar_url: Mapped[str] = mapped_column(String(255), default="")
    bio: Mapped[str] = mapped_column(Text, default="")
    socials: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped[User] = relationship(back_populates="dj_profile")


class Club(Base):
    __tablename__ = "clubs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(150), index=True)
    city: Mapped[str] = mapped_column(String(120), default="")
    address: Mapped[str] = mapped_column(String(200), default="")
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    description: Mapped[str] = mapped_column(Text, default="")
    avatar_url: Mapped[str] = mapped_column(String(255), default="")
    cover_url: Mapped[str] = mapped_column(String(255), default="")
    socials: Mapped[dict] = mapped_column(JSON, default=dict)
    owner_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    visibility: Mapped[str] = mapped_column(String(20), default="public")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner: Mapped[User] = relationship(back_populates="owned_clubs")
    memberships: Mapped[list["ClubMembership"]] = relationship(back_populates="club")
    invites: Mapped[list["ClubInvite"]] = relationship(back_populates="club")
    media_assets: Mapped[list["MediaAsset"]] = relationship(back_populates="club")
    stream_settings: Mapped[list["StreamSettings"]] = relationship(back_populates="club")


class ClubMembership(Base):
    __tablename__ = "club_memberships"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    role: Mapped[str] = mapped_column(String(20), default="dj")
    status: Mapped[str] = mapped_column(String(20), default="active")
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    club: Mapped[Club] = relationship(back_populates="memberships")
    user: Mapped[User] = relationship(back_populates="club_memberships")


class ClubInvite(Base):
    __tablename__ = "club_invites"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    club_id: Mapped[int] = mapped_column(ForeignKey("clubs.id"), index=True)
    invited_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    invited_email: Mapped[str] = mapped_column(String(160), default="")
    invited_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    role_to_assign: Mapped[str] = mapped_column(String(20), default="dj")
    status: Mapped[str] = mapped_column(String(20), default="pending")
    token: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    club: Mapped[Club] = relationship(back_populates="invites")
    invited_by: Mapped[User] = relationship(back_populates="sent_club_invites", foreign_keys=[invited_by_user_id])


class StreamSettings(Base):
    __tablename__ = "stream_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    stream_id: Mapped[int] = mapped_column(ForeignKey("streams.id"), unique=True, index=True)
    club_id: Mapped[int | None] = mapped_column(ForeignKey("clubs.id"), nullable=True, index=True)
    visibility: Mapped[str] = mapped_column(String(20), default="public")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    stream: Mapped[Stream] = relationship(back_populates="settings")
    club: Mapped[Club | None] = relationship(back_populates="stream_settings")


class MediaAsset(Base):
    __tablename__ = "media_assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_type: Mapped[str] = mapped_column(String(20), index=True)
    owner_id: Mapped[int] = mapped_column(Integer, index=True)
    club_id: Mapped[int | None] = mapped_column(ForeignKey("clubs.id"), nullable=True, index=True)
    type: Mapped[str] = mapped_column(String(20), default="gallery")
    url: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    club: Mapped[Club | None] = relationship(back_populates="media_assets")
