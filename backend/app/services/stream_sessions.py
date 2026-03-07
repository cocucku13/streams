from datetime import datetime

from sqlalchemy.orm import Session

from .. import models


def get_active_session(stream: models.Stream, db: Session) -> models.StreamSession | None:
    return (
        db.query(models.StreamSession)
        .filter(
            models.StreamSession.stream_id == stream.id,
            models.StreamSession.status == "active",
        )
        .order_by(models.StreamSession.started_at.desc())
        .first()
    )


def start_stream_session(stream: models.Stream, db: Session, ingest_type: str = "unknown") -> models.StreamSession:
    active = get_active_session(stream, db)
    if active:
        return active

    session = models.StreamSession(
        stream_id=stream.id,
        started_at=datetime.utcnow(),
        ended_at=None,
        status="active",
        ingest_type=ingest_type,
        peak_viewers=0,
        avg_viewers=0,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    stream.is_live = True
    db.add(stream)
    db.commit()

    return session


def end_stream_session(stream: models.Stream, db: Session) -> models.StreamSession | None:
    active = get_active_session(stream, db)
    if not active:
        return None

    active.status = "ended"
    active.ended_at = datetime.utcnow()
    db.add(active)

    stream.is_live = False
    db.add(stream)
    db.commit()
    db.refresh(active)

    return active


def update_peak_viewers(stream: models.Stream, db: Session, viewer_count: int) -> models.StreamSession | None:
    active = get_active_session(stream, db)
    if not active:
        return None

    if viewer_count > active.peak_viewers:
        active.peak_viewers = viewer_count
        db.add(active)
        db.commit()
        db.refresh(active)

    return active
