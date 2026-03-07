from sqlalchemy.orm import Session

from app import models
from app.auth import generate_stream_key, hash_password


def _make_user_with_stream(db: Session, username: str, display_name: str, stream_key: str) -> tuple[models.User, models.Stream]:
    user = models.User(
        username=username,
        hashed_password=hash_password("password123"),
        display_name=display_name,
        stream_key=stream_key,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    stream = models.Stream(owner_id=user.id, title="Pipeline set")
    db.add(stream)
    db.commit()
    db.refresh(stream)

    db.add(models.StreamSettings(stream_id=stream.id, visibility="public"))
    db.commit()

    return user, stream


def _event_payload(event: str, stream_key: str) -> dict[str, str]:
    return {
        "event": event,
        "stream_key": stream_key,
    }


def test_stream_started_event_creates_session(test_client, db_session: Session, monkeypatch) -> None:
    monkeypatch.setenv("STREAM_EVENTS_SECRET", "wave6-secret")
    stream_key = generate_stream_key()
    _user, stream = _make_user_with_stream(db_session, "evt_start", "Event Start", stream_key)

    response = test_client.post(
        "/api/internal/stream-events",
        json=_event_payload("stream_started", stream_key),
        headers={"X-Internal-Token": "wave6-secret"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["event"] == "stream_started"
    assert payload["stream_id"] == stream.id

    active = (
        db_session.query(models.StreamSession)
        .filter(models.StreamSession.stream_id == stream.id, models.StreamSession.status == "active")
        .first()
    )
    assert active is not None


def test_stream_ended_event_closes_session(test_client, db_session: Session, monkeypatch) -> None:
    monkeypatch.setenv("STREAM_EVENTS_SECRET", "wave6-secret")
    stream_key = generate_stream_key()
    _user, stream = _make_user_with_stream(db_session, "evt_end", "Event End", stream_key)

    start_response = test_client.post(
        "/api/internal/stream-events",
        json=_event_payload("stream_started", stream_key),
        headers={"X-Internal-Token": "wave6-secret"},
    )
    assert start_response.status_code == 200

    response = test_client.post(
        "/api/internal/stream-events",
        json=_event_payload("stream_ended", stream_key),
        headers={"X-Internal-Token": "wave6-secret"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["event"] == "stream_ended"

    active = (
        db_session.query(models.StreamSession)
        .filter(models.StreamSession.stream_id == stream.id, models.StreamSession.status == "active")
        .first()
    )
    assert active is None

    ended = (
        db_session.query(models.StreamSession)
        .filter(models.StreamSession.stream_id == stream.id, models.StreamSession.status == "ended")
        .first()
    )
    assert ended is not None
    assert ended.ended_at is not None


def test_stream_event_invalid_token_returns_403(test_client, db_session: Session, monkeypatch) -> None:
    monkeypatch.setenv("STREAM_EVENTS_SECRET", "wave6-secret")
    stream_key = generate_stream_key()
    _make_user_with_stream(db_session, "evt_bad_token", "Event Bad Token", stream_key)

    response = test_client.post(
        "/api/internal/stream-events",
        json=_event_payload("stream_started", stream_key),
        headers={"X-Internal-Token": "wrong-token"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Invalid internal token"


def test_stream_event_accepts_query_params_and_query_token(test_client, db_session: Session, monkeypatch) -> None:
    monkeypatch.setenv("STREAM_EVENTS_SECRET", "wave6-secret")
    stream_key = generate_stream_key()
    _user, stream = _make_user_with_stream(db_session, "evt_query", "Event Query", stream_key)

    response = test_client.post(
        f"/api/internal/stream-events?event=stream_started&stream_key={stream_key}&token=wave6-secret"
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["event"] == "stream_started"
    assert payload["stream_id"] == stream.id

    active = (
        db_session.query(models.StreamSession)
        .filter(models.StreamSession.stream_id == stream.id, models.StreamSession.status == "active")
        .first()
    )
    assert active is not None


def test_stream_event_normalizes_live_prefix_stream_key(test_client, db_session: Session, monkeypatch) -> None:
    monkeypatch.setenv("STREAM_EVENTS_SECRET", "wave6-secret")
    stream_key = generate_stream_key()
    _user, stream = _make_user_with_stream(db_session, "evt_norm", "Event Normalize", stream_key)

    response = test_client.post(
        "/api/internal/stream-events",
        params={
            "event": "stream_started",
            "stream_key": f"live/{stream_key}",
            "token": "wave6-secret",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["event"] == "stream_started"
    assert payload["stream_id"] == stream.id


def test_stream_event_normalizes_live_prefix_stream_key_from_json(test_client, db_session: Session, monkeypatch) -> None:
    monkeypatch.setenv("STREAM_EVENTS_SECRET", "wave6-secret")
    stream_key = generate_stream_key()
    _user, stream = _make_user_with_stream(db_session, "evt_norm_json", "Event Normalize Json", stream_key)

    response = test_client.post(
        "/api/internal/stream-events",
        json=_event_payload("stream_started", f"live/{stream_key}"),
        headers={"X-Internal-Token": "wave6-secret"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["event"] == "stream_started"
    assert payload["stream_id"] == stream.id


def test_stream_event_query_params_without_token_returns_403(test_client, db_session: Session, monkeypatch) -> None:
    monkeypatch.setenv("STREAM_EVENTS_SECRET", "wave6-secret")
    stream_key = generate_stream_key()
    _make_user_with_stream(db_session, "evt_no_token", "Event No Token", stream_key)

    response = test_client.post(
        f"/api/internal/stream-events?event=stream_started&stream_key={stream_key}"
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Invalid internal token"
