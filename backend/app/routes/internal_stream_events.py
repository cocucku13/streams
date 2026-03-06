import os

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
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


@router.post("/stream-events")
def process_stream_event(
    payload: schemas.StreamEventRequest,
    db: Session = Depends(get_db),
    internal_token: str | None = Header(default=None, alias="X-Internal-Token"),
):
    _verify_internal_token(internal_token)
    stream = _resolve_stream_by_key(payload.stream_key, db)

    if payload.event == "stream_started":
        session = start_stream_session(stream, db, ingest_type="rtmp")
        return {"status": "processed", "event": payload.event, "stream_id": stream.id, "session_id": session.id}

    ended = end_stream_session(stream, db)
    return {
        "status": "processed",
        "event": payload.event,
        "stream_id": stream.id,
        "session_id": ended.id if ended else None,
    }
