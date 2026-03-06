from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class SocialLinks(BaseModel):
    telegram: str = ""
    instagram: str = ""
    vk: str = ""
    tiktok: str = ""
    youtube: str = ""
    soundcloud: str = ""
    beatport: str = ""
    yandex_music: str = ""
    spotify: str = ""
    website: str = ""


class MediaAssetResponse(BaseModel):
    id: int
    owner_type: str
    owner_id: int
    type: str
    url: str
    created_at: datetime

    class Config:
        from_attributes = True


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=100)
    display_name: str = Field(min_length=2, max_length=100)


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ProfileResponse(BaseModel):
    id: int
    username: str
    display_name: str
    bio: str
    avatar_url: str
    club_name: str
    global_role: str = "viewer"

    class Config:
        from_attributes = True


class ProfileUpdateRequest(BaseModel):
    display_name: str = Field(min_length=2, max_length=100)
    bio: str = Field(default="", max_length=500)
    avatar_url: str = Field(default="", max_length=255)
    club_name: str = Field(default="", max_length=120)


class MeResponse(ProfileResponse):
    pass


class DJProfileResponse(BaseModel):
    id: int
    user_id: int
    username: str
    display_name: str
    bio: str
    avatar_url: str
    cover_url: str
    socials: SocialLinks
    clubs: list["ClubListItemResponse"]
    is_live: bool
    live_stream_id: int | None


class DJProfileUpdateRequest(BaseModel):
    display_name: str = Field(min_length=2, max_length=100)
    bio: str = Field(default="", max_length=500)
    avatar_url: str = Field(default="", max_length=255)
    cover_url: str = Field(default="", max_length=255)
    socials: SocialLinks = Field(default_factory=SocialLinks)


class ClubListItemResponse(BaseModel):
    id: int
    slug: str
    title: str
    city: str
    avatar_url: str
    role: str


class StreamUpsertRequest(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    description: str = Field(default="", max_length=1000)
    genre: str = Field(default="", max_length=80)
    current_track: str = Field(default="", max_length=200)


class StreamUpdateRequest(StreamUpsertRequest):
    club_id: int | None = None
    visibility: str = Field(default="public", pattern="^(public|unlisted)$")


class StreamResponse(BaseModel):
    id: int
    owner_id: int
    owner_username: str
    owner_name: str
    owner_avatar: str
    title: str
    description: str
    genre: str
    current_track: str
    visibility: str = "public"
    club_id: int | None = None
    club_slug: str | None = None
    club_title: str | None = None
    is_live: bool
    ingest_server: str
    stream_key: str
    hls_url: str
    whep_url: str
    created_at: datetime
    updated_at: datetime


class PublicStreamResponse(BaseModel):
    id: int
    owner_id: int
    owner_username: str
    owner_name: str
    owner_avatar: str
    title: str
    description: str
    genre: str
    current_track: str
    visibility: str = "public"
    club_id: int | None = None
    club_slug: str | None = None
    club_title: str | None = None
    is_live: bool
    hls_url: str
    whep_url: str
    created_at: datetime
    updated_at: datetime


class ActiveStreamLookupResponse(BaseModel):
    stream_id: int
    owner_username: str
    is_live: bool
    watch_path: str
    title: str


class StreamSessionResponse(BaseModel):
    id: int
    stream_id: int
    started_at: datetime
    ended_at: datetime | None
    status: Literal["active", "ended"]
    ingest_type: str
    viewer_peak: int
    viewer_avg: int
    created_at: datetime

    class Config:
        from_attributes = True


class StreamEventRequest(BaseModel):
    event: Literal["stream_started", "stream_ended"]
    stream_key: str = Field(min_length=8, max_length=128)
    timestamp: datetime


class InviteClubSummary(BaseModel):
    id: int
    slug: str
    title: str


class InviteInviterSummary(BaseModel):
    id: int
    username: str
    display_name: str


class InvitePreflightResponse(BaseModel):
    token: str
    status: Literal["pending", "accepted", "declined", "expired"]
    validity: Literal["valid", "expired"]
    can_act: bool
    role_to_assign: str
    expires_at: datetime
    invited_user_id: int | None
    invited_email: str
    club: InviteClubSummary
    invited_by: InviteInviterSummary


class ChatMessage(BaseModel):
    user: str
    message: str
    at: datetime


class ClubCreateRequest(BaseModel):
    slug: str = Field(min_length=2, max_length=120)
    title: str = Field(min_length=2, max_length=150)
    city: str = Field(default="", max_length=120)
    address: str = Field(default="", max_length=200)
    description: str = Field(default="", max_length=1500)
    avatar_url: str = Field(default="", max_length=255)
    cover_url: str = Field(default="", max_length=255)
    socials: SocialLinks = Field(default_factory=SocialLinks)
    visibility: str = Field(default="public", pattern="^(public|unlisted)$")


class ClubUpdateRequest(BaseModel):
    title: str = Field(min_length=2, max_length=150)
    city: str = Field(default="", max_length=120)
    address: str = Field(default="", max_length=200)
    description: str = Field(default="", max_length=1500)
    avatar_url: str = Field(default="", max_length=255)
    cover_url: str = Field(default="", max_length=255)
    socials: SocialLinks = Field(default_factory=SocialLinks)
    visibility: str = Field(default="public", pattern="^(public|unlisted)$")


class ClubMemberResponse(BaseModel):
    id: int
    user_id: int
    username: str
    display_name: str
    role: str
    status: str
    joined_at: datetime


class ClubInviteCreateRequest(BaseModel):
    invited_username: str | None = None
    invited_email: str | None = None
    role_to_assign: str = Field(default="dj", pattern="^(dj|moderator|admin)$")
    expires_in_days: int = Field(default=7, ge=1, le=30)


class ClubInviteResponse(BaseModel):
    id: int
    club_id: int
    invited_user_id: int | None
    invited_email: str
    invited_by_user_id: int
    role_to_assign: str
    status: str
    token: str
    expires_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class ClubInviteCreateResponse(ClubInviteResponse):
    pass


class ClubResponse(BaseModel):
    id: int
    slug: str
    title: str
    city: str
    address: str
    description: str
    avatar_url: str
    cover_url: str
    socials: SocialLinks
    owner_user_id: int
    visibility: str
    gallery: list[MediaAssetResponse]
    dj_members: list[ClubMemberResponse]
    live_streams: list[PublicStreamResponse]
    created_at: datetime
    updated_at: datetime


class ClubPermissionsMeResponse(BaseModel):
    club_id: int
    club_slug: str
    club_title: str
    authenticated: bool
    membership_found: bool
    role: str | None
    can_view_club_studio: bool
    can_manage_members: bool
    can_manage_stream: bool
    can_edit_club_profile: bool
