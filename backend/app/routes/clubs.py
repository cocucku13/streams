import os
import re
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..deps import get_current_user
from ..permissions.club_policy import (
    can_edit_club_profile,
    can_manage_invites,
    can_manage_members,
    can_manage_stream,
    can_view_club_studio,
    get_active_membership,
)
from ..permissions.errors import forbidden

router = APIRouter(tags=["clubs"])

HLS_BASE = os.getenv("HLS_BASE", "http://localhost:8888")
WHEP_BASE = os.getenv("WHEP_BASE", "http://localhost:8889")


SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,118}[a-z0-9]$")


def _social_links(raw: dict | None) -> schemas.SocialLinks:
    return schemas.SocialLinks(**(raw or {}))


def _can_manage_club(club_id: int, user_id: int, db: Session) -> bool:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    club = db.query(models.Club).filter(models.Club.id == club_id).first()
    if not user or not club:
        return False
    return can_view_club_studio(user, club, db)


def _club_to_response(club: models.Club, db: Session) -> schemas.ClubResponse:
    gallery = (
        db.query(models.MediaAsset)
        .filter(
            models.MediaAsset.owner_type == "club",
            models.MediaAsset.owner_id == club.id,
            models.MediaAsset.type == "gallery",
        )
        .order_by(models.MediaAsset.created_at.desc())
        .all()
    )

    dj_memberships = (
        db.query(models.ClubMembership, models.User)
        .join(models.User, models.ClubMembership.user_id == models.User.id)
        .filter(
            models.ClubMembership.club_id == club.id,
            models.ClubMembership.status == "active",
            models.ClubMembership.role.in_(["dj", "moderator", "admin", "owner"]),
        )
        .order_by(models.ClubMembership.joined_at.asc())
        .all()
    )

    member_rows = [
        schemas.ClubMemberResponse(
            id=membership.id,
            user_id=user.id,
            username=user.username,
            display_name=user.display_name,
            role=membership.role,
            status=membership.status,
            joined_at=membership.joined_at,
        )
        for membership, user in dj_memberships
    ]

    stream_rows = (
        db.query(models.Stream, models.User, models.StreamSettings)
        .join(models.User, models.Stream.owner_id == models.User.id)
        .join(models.StreamSettings, models.StreamSettings.stream_id == models.Stream.id)
        .filter(
            models.StreamSettings.club_id == club.id,
            models.Stream.is_live.is_(True),
        )
        .order_by(models.Stream.updated_at.desc())
        .all()
    )

    live_streams = [
        schemas.PublicStreamResponse(
            id=stream.id,
            owner_id=owner.id,
            owner_username=owner.username,
            owner_name=owner.display_name,
            owner_avatar=owner.avatar_url,
            title=stream.title,
            description=stream.description,
            genre=stream.genre,
            current_track=stream.current_track,
            visibility=settings.visibility,
            club_id=club.id,
            club_slug=club.slug,
            club_title=club.title,
            is_live=stream.is_live,
            hls_url=f"{HLS_BASE}/live/{owner.stream_key}/index.m3u8",
            whep_url=f"{WHEP_BASE}/live/{owner.stream_key}/whep",
            created_at=stream.created_at,
            updated_at=stream.updated_at,
        )
        for stream, owner, settings in stream_rows
        if settings.visibility == "public"
    ]

    return schemas.ClubResponse(
        id=club.id,
        slug=club.slug,
        title=club.title,
        city=club.city,
        address=club.address,
        description=club.description,
        avatar_url=club.avatar_url,
        cover_url=club.cover_url,
        socials=_social_links(club.socials),
        owner_user_id=club.owner_user_id,
        visibility=club.visibility,
        gallery=[schemas.MediaAssetResponse.model_validate(item) for item in gallery],
        dj_members=member_rows,
        live_streams=live_streams,
        created_at=club.created_at,
        updated_at=club.updated_at,
    )


def _invite_to_preflight_response(
    invite: models.ClubInvite,
    club: models.Club,
    invited_by: models.User,
) -> schemas.InvitePreflightResponse:
    validity = "expired" if invite.status == "expired" else "valid"
    return schemas.InvitePreflightResponse(
        token=invite.token,
        status=invite.status,
        validity=validity,
        can_act=invite.status == "pending",
        role_to_assign=invite.role_to_assign,
        expires_at=invite.expires_at,
        invited_user_id=invite.invited_user_id,
        invited_email=invite.invited_email,
        club=schemas.InviteClubSummary(
            id=club.id,
            slug=club.slug,
            title=club.title,
        ),
        invited_by=schemas.InviteInviterSummary(
            id=invited_by.id,
            username=invited_by.username,
            display_name=invited_by.display_name,
        ),
    )


@router.get("/clubs/{club_id}/permissions/me", response_model=schemas.ClubPermissionsMeResponse)
def get_club_permissions_me(
    club_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    club = db.query(models.Club).filter(models.Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    membership = get_active_membership(current_user, club, db)

    return schemas.ClubPermissionsMeResponse(
        club_id=club.id,
        club_slug=club.slug,
        club_title=club.title,
        authenticated=True,
        membership_found=membership is not None,
        role=membership.role if membership else None,
        can_view_club_studio=can_view_club_studio(current_user, club, db),
        can_manage_members=can_manage_members(current_user, club, db),
        can_manage_stream=can_manage_stream(current_user, club, db),
        can_edit_club_profile=can_edit_club_profile(current_user, club, db),
    )


@router.post("/clubs", response_model=schemas.ClubResponse)
def create_club(
    payload: schemas.ClubCreateRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    slug = payload.slug.strip().lower()
    if not SLUG_RE.match(slug):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid slug")

    exists = db.query(models.Club).filter(models.Club.slug == slug).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug already exists")

    club = models.Club(
        slug=slug,
        title=payload.title,
        city=payload.city,
        address=payload.address,
        description=payload.description,
        avatar_url=payload.avatar_url,
        cover_url=payload.cover_url,
        socials=payload.socials.model_dump(),
        owner_user_id=current_user.id,
        visibility=payload.visibility,
    )
    db.add(club)
    db.commit()
    db.refresh(club)

    owner_membership = models.ClubMembership(
        club_id=club.id,
        user_id=current_user.id,
        role="owner",
        status="active",
    )
    db.add(owner_membership)
    db.commit()

    return _club_to_response(club, db)


@router.get("/clubs/{slug}", response_model=schemas.ClubResponse)
def get_club(slug: str, db: Session = Depends(get_db)):
    club = db.query(models.Club).filter(models.Club.slug == slug).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")
    if club.visibility == "unlisted":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")
    return _club_to_response(club, db)


@router.get("/clubs/id/{club_id}", response_model=schemas.ClubResponse)
def get_club_by_id(
    club_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    club = db.query(models.Club).filter(models.Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    if not _can_manage_club(club.id, current_user.id, db):
        raise forbidden("Not enough permissions")

    return _club_to_response(club, db)


@router.patch("/clubs/{club_id}", response_model=schemas.ClubResponse)
def patch_club(
    club_id: int,
    payload: schemas.ClubUpdateRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    club = db.query(models.Club).filter(models.Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    if not can_edit_club_profile(current_user, club, db):
        raise forbidden("Not enough permissions")

    club.title = payload.title
    club.city = payload.city
    club.address = payload.address
    club.description = payload.description
    club.avatar_url = payload.avatar_url
    club.cover_url = payload.cover_url
    club.socials = payload.socials.model_dump()
    club.visibility = payload.visibility

    db.add(club)
    db.commit()
    db.refresh(club)

    return _club_to_response(club, db)


@router.get("/clubs/{club_id}/members", response_model=list[schemas.ClubMemberResponse])
def get_club_members(club_id: int, db: Session = Depends(get_db)):
    club = db.query(models.Club).filter(models.Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    rows = (
        db.query(models.ClubMembership, models.User)
        .join(models.User, models.ClubMembership.user_id == models.User.id)
        .filter(models.ClubMembership.club_id == club_id)
        .order_by(models.ClubMembership.joined_at.asc())
        .all()
    )

    return [
        schemas.ClubMemberResponse(
            id=membership.id,
            user_id=user.id,
            username=user.username,
            display_name=user.display_name,
            role=membership.role,
            status=membership.status,
            joined_at=membership.joined_at,
        )
        for membership, user in rows
    ]


@router.post("/clubs/{club_id}/invites", response_model=schemas.ClubInviteResponse)
def create_club_invite(
    club_id: int,
    payload: schemas.ClubInviteCreateRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    club = db.query(models.Club).filter(models.Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    if not can_manage_invites(current_user, club, db):
        raise forbidden("Not enough permissions")

    invited_user_id = None
    invited_email = (payload.invited_email or "").strip().lower()

    if payload.invited_username:
        invited_user = db.query(models.User).filter(models.User.username == payload.invited_username.strip()).first()
        if not invited_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        invited_user_id = invited_user.id
        invited_email = ""

    if not invited_user_id and not invited_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provide invited_username or invited_email")

    token = secrets.token_urlsafe(24)
    invite = models.ClubInvite(
        club_id=club.id,
        invited_user_id=invited_user_id,
        invited_email=invited_email,
        invited_by_user_id=current_user.id,
        role_to_assign=payload.role_to_assign,
        status="pending",
        token=token,
        expires_at=datetime.utcnow() + timedelta(days=payload.expires_in_days),
    )

    db.add(invite)
    db.commit()
    db.refresh(invite)
    return schemas.ClubInviteResponse.model_validate(invite)


@router.get("/clubs/{club_id}/invites", response_model=list[schemas.ClubInviteResponse])
def list_club_invites(
    club_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    club = db.query(models.Club).filter(models.Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    if not can_manage_invites(current_user, club, db):
        raise forbidden("Not enough permissions")

    invites = (
        db.query(models.ClubInvite)
        .filter(models.ClubInvite.club_id == club.id)
        .order_by(models.ClubInvite.created_at.desc())
        .all()
    )
    return [schemas.ClubInviteResponse.model_validate(invite) for invite in invites]


@router.get("/invites/{token}", response_model=schemas.InvitePreflightResponse)
def get_invite_preflight(
    token: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invite = db.query(models.ClubInvite).filter(models.ClubInvite.token == token).first()
    if not invite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")

    if invite.invited_user_id and invite.invited_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invite belongs to another user")

    if invite.status == "pending" and invite.expires_at < datetime.utcnow():
        invite.status = "expired"
        db.add(invite)
        db.commit()
        db.refresh(invite)

    club = db.query(models.Club).filter(models.Club.id == invite.club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    invited_by = db.query(models.User).filter(models.User.id == invite.invited_by_user_id).first()
    if not invited_by:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inviter not found")

    return _invite_to_preflight_response(invite, club, invited_by)


@router.post("/invites/{token}/accept", response_model=schemas.ClubMemberResponse)
def accept_invite(
    token: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invite = db.query(models.ClubInvite).filter(models.ClubInvite.token == token).first()
    if not invite or invite.status != "pending":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")

    if invite.expires_at < datetime.utcnow():
        invite.status = "expired"
        db.add(invite)
        db.commit()
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Invite expired")

    if invite.invited_user_id and invite.invited_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invite belongs to another user")

    existing = (
        db.query(models.ClubMembership)
        .filter(models.ClubMembership.club_id == invite.club_id, models.ClubMembership.user_id == current_user.id)
        .first()
    )

    if existing:
        existing.role = invite.role_to_assign
        existing.status = "active"
        membership = existing
    else:
        membership = models.ClubMembership(
            club_id=invite.club_id,
            user_id=current_user.id,
            role=invite.role_to_assign,
            status="active",
        )

    invite.status = "accepted"
    db.add(membership)
    db.add(invite)
    db.commit()
    db.refresh(membership)

    return schemas.ClubMemberResponse(
        id=membership.id,
        user_id=current_user.id,
        username=current_user.username,
        display_name=current_user.display_name,
        role=membership.role,
        status=membership.status,
        joined_at=membership.joined_at,
    )


@router.post("/invites/{token}/decline", response_model=schemas.ClubInviteResponse)
def decline_invite(
    token: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invite = db.query(models.ClubInvite).filter(models.ClubInvite.token == token).first()
    if not invite or invite.status != "pending":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")

    if invite.invited_user_id and invite.invited_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invite belongs to another user")

    invite.status = "declined"
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return schemas.ClubInviteResponse.model_validate(invite)


@router.delete("/invites/{invite_id}", response_model=schemas.ClubInviteResponse)
def revoke_invite(
    invite_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invite = db.query(models.ClubInvite).filter(models.ClubInvite.id == invite_id).first()
    if not invite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")

    club = db.query(models.Club).filter(models.Club.id == invite.club_id).first()
    if not club:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

    if not can_manage_invites(current_user, club, db):
        raise forbidden("Not enough permissions")

    if invite.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only pending invites can be revoked")

    invite.status = "expired"
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return schemas.ClubInviteResponse.model_validate(invite)
