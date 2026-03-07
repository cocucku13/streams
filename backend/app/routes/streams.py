import os

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..deps import get_current_user
from ..permissions.club_policy import get_active_membership
from ..permissions.errors import forbidden, not_member
from ..permissions.stream_policy import can_edit_stream
from ..services.chat_service import get_recent_messages
from ..services.discovery_service import get_discover_streams
from ..services.presence_service import get_viewer_count, join_viewer, leave_viewer
from ..services.stream_sessions import get_active_session, update_peak_viewers

router = APIRouter(prefix="/streams", tags=["streams"])

RTMP_BASE = os.getenv("RTMP_BASE", "rtmp://localhost:1935/live")
HLS_BASE = os.getenv("HLS_BASE", "http://localhost:8888")
WHEP_BASE = os.getenv("WHEP_BASE", "http://localhost:8889")

def _sync_stream_live_state(stream: models.Stream, db: Session) -> bool:
    live_now = get_active_session(stream, db) is not None
    stream.is_live = live_now
    return live_now


def _ensure_stream_settings(stream: models.Stream, db: Session) -> models.StreamSettings:
    settings = db.query(models.StreamSettings).filter(models.StreamSettings.stream_id == stream.id).first()
    if settings:
        return settings

    settings = models.StreamSettings(stream_id=stream.id, visibility="public")
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings


def _club_for_settings(settings: models.StreamSettings | None, db: Session) -> models.Club | None:
    if not settings or not settings.club_id:
        return None
    return db.query(models.Club).filter(models.Club.id == settings.club_id).first()


def to_stream_response(stream: models.Stream, owner: models.User) -> schemas.StreamResponse:
    settings = stream.settings
    club = settings.club if settings else None
    hls_url = f"{HLS_BASE}/live/{owner.stream_key}/index.m3u8"
    whep_url = f"{WHEP_BASE}/live/{owner.stream_key}/whep"
    return schemas.StreamResponse(
        id=stream.id,
        owner_id=owner.id,
        owner_username=owner.username,
        owner_name=owner.display_name,
        owner_avatar=owner.avatar_url,
        title=stream.title,
        description=stream.description,
        genre=stream.genre,
        current_track=stream.current_track,
        visibility=settings.visibility if settings else "public",
        club_id=club.id if club else None,
        club_slug=club.slug if club else None,
        club_title=club.title if club else None,
        is_live=stream.is_live,
        ingest_server=RTMP_BASE,
        stream_key=owner.stream_key,
        hls_url=hls_url,
        whep_url=whep_url,
        created_at=stream.created_at,
        updated_at=stream.updated_at,
    )


@router.get("/me", response_model=schemas.StreamResponse)
def get_my_stream(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stream = db.query(models.Stream).filter(models.Stream.owner_id == current_user.id).first()
    if not stream:
        stream = models.Stream(owner_id=current_user.id)
        db.add(stream)
        db.commit()
        db.refresh(stream)

    settings = _ensure_stream_settings(stream, db)
    stream.settings = settings
    stream.settings.club = _club_for_settings(settings, db)

    live_now = _sync_stream_live_state(stream, db)
    db.add(stream)
    db.commit()
    db.refresh(stream)

    response = to_stream_response(stream, current_user)
    response.is_live = live_now
    return response


@router.put("/me", response_model=schemas.StreamResponse)
def update_my_stream(
    payload: schemas.StreamUpsertRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stream = db.query(models.Stream).filter(models.Stream.owner_id == current_user.id).first()
    if not stream:
        stream = models.Stream(owner_id=current_user.id)

    stream.title = payload.title
    stream.description = payload.description
    stream.genre = payload.genre
    stream.current_track = payload.current_track

    _sync_stream_live_state(stream, db)

    db.add(stream)
    db.commit()
    db.refresh(stream)

    settings = _ensure_stream_settings(stream, db)
    stream.settings = settings
    stream.settings.club = _club_for_settings(settings, db)
    return to_stream_response(stream, current_user)


@router.get("/by-username/{username}/active", response_model=schemas.ActiveStreamLookupResponse)
def get_active_stream_by_username(username: str, db: Session = Depends(get_db)):
    owner = db.query(models.User).filter(models.User.username == username).first()
    if not owner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DJ not found")

    stream = (
        db.query(models.Stream)
        .filter(models.Stream.owner_id == owner.id)
        .order_by(models.Stream.updated_at.desc())
        .first()
    )
    if not stream:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active stream not found")

    settings = _ensure_stream_settings(stream, db)
    live_now = _sync_stream_live_state(stream, db)
    db.add(stream)
    db.commit()

    if not live_now or settings.visibility != "public":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active stream not found")

    return schemas.ActiveStreamLookupResponse(
        stream_id=stream.id,
        owner_username=owner.username,
        is_live=True,
        watch_path=f"/watch/{stream.id}",
        title=stream.title,
    )


@router.get("/discover", response_model=list[schemas.DiscoverStreamResponse])
def discover_streams(limit: int = Query(default=20, ge=1, le=100), db: Session = Depends(get_db)):
    return get_discover_streams(db, limit=limit)


@router.get("/{stream_id:int}", response_model=schemas.PublicStreamResponse)
def get_stream(stream_id: int, db: Session = Depends(get_db)):
    record = (
        db.query(models.Stream, models.User)
        .join(models.User, models.Stream.owner_id == models.User.id)
        .filter(models.Stream.id == stream_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stream not found")

    stream, owner = record
    settings = _ensure_stream_settings(stream, db)
    club = _club_for_settings(settings, db)
    live_now = _sync_stream_live_state(stream, db)
    db.add(stream)
    db.commit()

    if settings.visibility == "unlisted" and not live_now:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stream not found")

    return schemas.PublicStreamResponse(
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
        club_id=club.id if club else None,
        club_slug=club.slug if club else None,
        club_title=club.title if club else None,
        is_live=live_now,
        viewer_count=get_viewer_count(stream.id) if live_now else 0,
        hls_url=f"{HLS_BASE}/live/{owner.stream_key}/index.m3u8",
        whep_url=f"{WHEP_BASE}/live/{owner.stream_key}/whep",
        created_at=stream.created_at,
        updated_at=stream.updated_at,
    )


@router.get("/{stream_id:int}/sessions", response_model=list[schemas.StreamSessionResponse])
def list_stream_sessions(stream_id: int, db: Session = Depends(get_db)):
    stream = db.query(models.Stream).filter(models.Stream.id == stream_id).first()
    if not stream:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stream not found")

    return (
        db.query(models.StreamSession)
        .filter(models.StreamSession.stream_id == stream_id)
        .order_by(models.StreamSession.started_at.desc())
        .all()
    )


@router.get("/{stream_id:int}/chat/history", response_model=list[schemas.ChatMessage])
def get_stream_chat_history(stream_id: int, limit: int = 50, db: Session = Depends(get_db)):
    stream = db.query(models.Stream).filter(models.Stream.id == stream_id).first()
    if not stream:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stream not found")

    rows = get_recent_messages(stream_id, db, limit=limit)
    return [
        schemas.ChatMessage(
            user=row.username,
            message=row.message,
            at=row.created_at,
        )
        for row in rows
    ]


@router.post("/{stream_id:int}/presence/join", response_model=schemas.ViewerCountResponse)
def join_stream_presence(stream_id: int, payload: schemas.PresenceSessionRequest, db: Session = Depends(get_db)):
    stream = db.query(models.Stream).filter(models.Stream.id == stream_id).first()
    if not stream:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stream not found")

    viewer_count = join_viewer(stream_id, payload.session_id)
    update_peak_viewers(stream, db, viewer_count)
    return schemas.ViewerCountResponse(viewer_count=viewer_count)


@router.post("/{stream_id:int}/presence/leave", response_model=schemas.ViewerCountResponse)
def leave_stream_presence(stream_id: int, payload: schemas.PresenceSessionRequest, db: Session = Depends(get_db)):
    stream = db.query(models.Stream).filter(models.Stream.id == stream_id).first()
    if not stream:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stream not found")

    viewer_count = leave_viewer(stream_id, payload.session_id)
    return schemas.ViewerCountResponse(viewer_count=viewer_count)


@router.get("/{stream_id:int}/viewer-count", response_model=schemas.ViewerCountResponse)
def get_stream_viewer_count(stream_id: int, db: Session = Depends(get_db)):
    stream = db.query(models.Stream).filter(models.Stream.id == stream_id).first()
    if not stream:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stream not found")

    return schemas.ViewerCountResponse(viewer_count=get_viewer_count(stream_id))


@router.patch("/{stream_id:int}", response_model=schemas.StreamResponse)
def patch_stream(
    stream_id: int,
    payload: schemas.StreamUpdateRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(models.Stream, models.User)
        .join(models.User, models.Stream.owner_id == models.User.id)
        .filter(models.Stream.id == stream_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stream not found")

    stream, owner = record
    settings = _ensure_stream_settings(stream, db)
    club = _club_for_settings(settings, db)

    is_stream_owner = current_user.id == stream.owner_id
    if not can_edit_stream(current_user, stream, db):
        raise forbidden("Not enough permissions")

    stream.title = payload.title
    stream.description = payload.description
    stream.genre = payload.genre
    stream.current_track = payload.current_track

    if is_stream_owner:
        if payload.club_id is None:
            settings.club_id = None
        else:
            target_club = db.query(models.Club).filter(models.Club.id == payload.club_id).first()
            if not target_club:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Club not found")

            membership = get_active_membership(current_user, target_club, db)
            if not membership:
                raise not_member("No active membership in club")
            settings.club_id = payload.club_id

    settings.visibility = payload.visibility

    _sync_stream_live_state(stream, db)
    db.add(stream)
    db.add(settings)
    db.commit()
    db.refresh(stream)
    stream.settings = settings
    stream.settings.club = _club_for_settings(settings, db)
    return to_stream_response(stream, owner)


@router.get("/live", response_model=list[schemas.PublicStreamResponse])
def list_live_streams(db: Session = Depends(get_db)):
    streams = (
        db.query(models.Stream, models.User)
        .join(models.User, models.Stream.owner_id == models.User.id)
        .order_by(models.Stream.updated_at.desc())
        .all()
    )

    live_streams: list[schemas.PublicStreamResponse] = []
    for stream, owner in streams:
        settings = _ensure_stream_settings(stream, db)
        if settings.visibility != "public":
            continue

        live_now = _sync_stream_live_state(stream, db)
        db.add(stream)
        if not live_now:
            continue

        club = _club_for_settings(settings, db)

        live_streams.append(
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
                club_id=club.id if club else None,
                club_slug=club.slug if club else None,
                club_title=club.title if club else None,
                is_live=True,
                viewer_count=get_viewer_count(stream.id),
                hls_url=f"{HLS_BASE}/live/{owner.stream_key}/index.m3u8",
                whep_url=f"{WHEP_BASE}/live/{owner.stream_key}/whep",
                created_at=stream.created_at,
                updated_at=stream.updated_at,
            )
        )

    db.commit()

    return live_streams
