from sqlalchemy.orm import Session

from app import models
from app.auth import generate_stream_key, hash_password
from app.services.stream_sessions import end_stream_session, get_active_session, start_stream_session


def _make_user(db: Session, username: str, display_name: str) -> models.User:
    user = models.User(
        username=username,
        hashed_password=hash_password("password123"),
        display_name=display_name,
        stream_key=generate_stream_key(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_start_stream_session_creates_active_and_sets_stream_live(db_session: Session) -> None:
    owner = _make_user(db_session, "sess_owner_start", "Session Owner Start")
    stream = models.Stream(owner_id=owner.id, title="Session start")
    db_session.add(stream)
    db_session.commit()
    db_session.refresh(stream)

    session = start_stream_session(stream, db_session, ingest_type="rtmp")

    assert session.stream_id == stream.id
    assert session.status == "active"
    assert session.ended_at is None
    db_session.refresh(stream)
    assert stream.is_live is True


def test_start_stream_session_is_idempotent_when_active_exists(db_session: Session) -> None:
    owner = _make_user(db_session, "sess_owner_idem", "Session Owner Idempotent")
    stream = models.Stream(owner_id=owner.id, title="Session idempotent")
    db_session.add(stream)
    db_session.commit()
    db_session.refresh(stream)

    first = start_stream_session(stream, db_session, ingest_type="rtmp")
    second = start_stream_session(stream, db_session, ingest_type="rtmp")

    assert first.id == second.id
    count = db_session.query(models.StreamSession).filter(models.StreamSession.stream_id == stream.id).count()
    assert count == 1


def test_end_stream_session_marks_session_ended_and_stream_offline(db_session: Session) -> None:
    owner = _make_user(db_session, "sess_owner_end", "Session Owner End")
    stream = models.Stream(owner_id=owner.id, title="Session end")
    db_session.add(stream)
    db_session.commit()
    db_session.refresh(stream)

    start_stream_session(stream, db_session)
    ended = end_stream_session(stream, db_session)

    assert ended is not None
    assert ended.status == "ended"
    assert ended.ended_at is not None
    assert get_active_session(stream, db_session) is None
    db_session.refresh(stream)
    assert stream.is_live is False


def test_stream_sessions_endpoint_returns_session_history(test_client, db_session: Session) -> None:
    owner = _make_user(db_session, "sess_history", "Session History")
    stream = models.Stream(owner_id=owner.id, title="History")
    db_session.add(stream)
    db_session.commit()
    db_session.refresh(stream)

    older = models.StreamSession(stream_id=stream.id, status="ended", ingest_type="rtmp")
    active = models.StreamSession(stream_id=stream.id, status="active", ingest_type="rtmp")
    db_session.add(older)
    db_session.commit()
    db_session.refresh(older)
    db_session.add(active)
    db_session.commit()
    db_session.refresh(active)

    response = test_client.get(f"/api/streams/{stream.id}/sessions")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 2
    assert payload[0]["id"] == active.id
    assert payload[1]["id"] == older.id


def test_stream_sessions_endpoint_404_when_stream_missing(test_client) -> None:
    response = test_client.get("/api/streams/999999/sessions")

    assert response.status_code == 404
    assert response.json()["detail"] == "Stream not found"
