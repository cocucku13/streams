from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from .. import models, schemas
from .presence_service import get_viewer_count


def _score_stream(viewer_count: int, peak_viewers: int, started_at: datetime) -> float:
    score = float(viewer_count) + (float(peak_viewers) * 0.3)
    if datetime.utcnow() - started_at < timedelta(minutes=10):
        score += 1.0
    return round(score, 3)


def get_discover_streams(db: Session, limit: int = 20) -> list[schemas.DiscoverStreamResponse]:
    rows = (
        db.query(models.StreamSession, models.Stream, models.User, models.StreamSettings)
        .join(models.Stream, models.StreamSession.stream_id == models.Stream.id)
        .join(models.User, models.Stream.owner_id == models.User.id)
        .join(models.StreamSettings, models.StreamSettings.stream_id == models.Stream.id)
        .filter(models.StreamSession.status == "active")
        .filter(models.Stream.is_live.is_(True))
        .filter(models.StreamSettings.visibility == "public")
        .all()
    )

    ranked: list[schemas.DiscoverStreamResponse] = []
    for session, stream, owner, _settings in rows:
        viewer_count = get_viewer_count(stream.id)
        score = _score_stream(viewer_count, session.peak_viewers, session.started_at)
        ranked.append(
            schemas.DiscoverStreamResponse(
                stream_id=stream.id,
                dj_username=owner.username,
                viewer_count=viewer_count,
                peak_viewers=session.peak_viewers,
                started_at=session.started_at,
                score=score,
            )
        )

    ranked.sort(key=lambda item: (item.score, item.started_at), reverse=True)
    return ranked[: max(1, min(limit, 100))]
