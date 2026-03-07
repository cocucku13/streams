from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app import models
from app.auth import generate_stream_key, hash_password
from app.services import discovery_service


def _make_live_stream_with_session(
    db: Session,
    username: str,
    peak_viewers: int,
    started_at: datetime,
) -> tuple[models.User, models.Stream]:
    user = models.User(
        username=username,
        hashed_password=hash_password("password123"),
        display_name=username,
        stream_key=generate_stream_key(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    stream = models.Stream(owner_id=user.id, title=f"{username} set", is_live=True)
    db.add(stream)
    db.commit()
    db.refresh(stream)

    db.add(models.StreamSettings(stream_id=stream.id, visibility="public"))
    db.add(
        models.StreamSession(
            stream_id=stream.id,
            status="active",
            ingest_type="rtmp",
            peak_viewers=peak_viewers,
            avg_viewers=0,
            started_at=started_at,
        )
    )
    db.commit()

    return user, stream


def test_discover_ranking_order_and_score_calculation(test_client, db_session: Session, monkeypatch) -> None:
    now = datetime.utcnow()
    user_a, stream_a = _make_live_stream_with_session(db_session, "disc_a", peak_viewers=5, started_at=now)
    user_b, stream_b = _make_live_stream_with_session(
        db_session,
        "disc_b",
        peak_viewers=0,
        started_at=now - timedelta(minutes=20),
    )

    counts = {stream_a.id: 10, stream_b.id: 12}
    monkeypatch.setattr(discovery_service, "get_viewer_count", lambda stream_id: counts.get(stream_id, 0))

    response = test_client.get("/api/streams/discover")

    assert response.status_code == 200
    payload = response.json()

    top = payload[0]
    assert top["dj_username"] == user_a.username
    assert top["stream_id"] == stream_a.id
    assert abs(top["score"] - 12.5) < 0.001

    second = payload[1]
    assert second["dj_username"] == user_b.username
    assert second["stream_id"] == stream_b.id
    assert abs(second["score"] - 12.0) < 0.001


def test_discover_includes_viewer_count_from_redis_integration(test_client, db_session: Session, monkeypatch) -> None:
    now = datetime.utcnow()
    user, stream = _make_live_stream_with_session(db_session, "disc_count", peak_viewers=4, started_at=now)

    monkeypatch.setattr(discovery_service, "get_viewer_count", lambda stream_id: 34 if stream_id == stream.id else 0)

    response = test_client.get("/api/streams/discover")

    assert response.status_code == 200
    row = next(item for item in response.json() if item["stream_id"] == stream.id)
    assert row["dj_username"] == user.username
    assert row["viewer_count"] == 34


def test_discover_limit_parameter_applies(test_client, db_session: Session, monkeypatch) -> None:
    now = datetime.utcnow()
    _u1, s1 = _make_live_stream_with_session(db_session, "disc_l1", peak_viewers=1, started_at=now)
    _u2, s2 = _make_live_stream_with_session(db_session, "disc_l2", peak_viewers=2, started_at=now)
    _u3, s3 = _make_live_stream_with_session(db_session, "disc_l3", peak_viewers=3, started_at=now)

    counts = {s1.id: 1, s2.id: 2, s3.id: 3}
    monkeypatch.setattr(discovery_service, "get_viewer_count", lambda stream_id: counts.get(stream_id, 0))

    response = test_client.get("/api/streams/discover?limit=2")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 2
    assert payload[0]["score"] >= payload[1]["score"]
