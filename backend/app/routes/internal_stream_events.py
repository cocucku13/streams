import os
from typing import Literal

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..services.presence_service import clear_stream_presence
from ..services.stream_sessions import end_stream_session, start_stream_session

router = APIRouter(prefix="/internal", tags=["internal-stream-events"])


def _verify_internal_token(token: str | None) -> None:
    expected = (os.getenv("STREAM_EVENTS_SECRET") or "").strip()
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="STREAM_EVENTS_SECRET is not configured",
        )
    if token != expected:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid internal token")


def _resolve_stream_by_key(stream_key: str, db: Session) -> models.Stream:
    user = db.query(models.User).filter(models.User.stream_key == stream_key).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stream not found")

    stream = (
        db.query(models.Stream)
        .filter(models.Stream.owner_id == user.id)
        .order_by(models.Stream.updated_at.desc())
        .first()
    )
    if not stream:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stream not found")
    return stream


def _normalize_stream_key(stream_key: str) -> str:
    key = (stream_key or "").strip()
    if key.startswith("live/"):
        key = key.split("/", 1)[1]
    return key


def _resolve_event_payload(
    payload: schemas.StreamEventRequest | None,
    event: Literal["stream_started", "stream_ended"] | None,
    stream_key: str | None,
) -> tuple[Literal["stream_started", "stream_ended"], str]:
    resolved_event = payload.event if payload is not None else event
    resolved_stream_key = payload.stream_key if payload is not None else stream_key

    if not resolved_event or not resolved_stream_key:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="event and stream_key are required",
        )

    normalized_stream_key = _normalize_stream_key(resolved_stream_key)
    if not normalized_stream_key:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="stream_key is invalid",
        )

    return resolved_event, normalized_stream_key


@router.post("/stream-events")
def process_stream_event(
    payload: schemas.StreamEventRequest | None = Body(default=None),
    db: Session = Depends(get_db),
    internal_token: str | None = Header(default=None, alias="X-Internal-Token"),
    token: str | None = Query(default=None),
    event: Literal["stream_started", "stream_ended"] | None = Query(default=None),
    stream_key: str | None = Query(default=None),
):
    _verify_internal_token(internal_token or token)
    resolved_event, resolved_stream_key = _resolve_event_payload(payload, event, stream_key)
    stream = _resolve_stream_by_key(resolved_stream_key, db)

    if resolved_event == "stream_started":
        session = start_stream_session(stream, db, ingest_type="rtmp")
        return {"status": "processed", "event": resolved_event, "stream_id": stream.id, "session_id": session.id}

    clear_stream_presence(stream.id)
    ended = end_stream_session(stream, db)
    return {
        "status": "processed",
        "event": resolved_event,
        "stream_id": stream.id,
        "session_id": ended.id if ended else None,
    }
