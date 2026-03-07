from sqlalchemy.orm import Session

from app import models
from app.auth import generate_stream_key, hash_password
from app.services import presence_service
from app.services.stream_sessions import get_active_session, start_stream_session


class _FakeRedis:
    def __init__(self):
        self.sets: dict[str, set[str]] = {}

    def sadd(self, key: str, value: str) -> int:
        bucket = self.sets.setdefault(key, set())
        before = len(bucket)
        bucket.add(value)
        return 1 if len(bucket) > before else 0

    def srem(self, key: str, value: str) -> int:
        bucket = self.sets.setdefault(key, set())
        before = len(bucket)
        bucket.discard(value)
        return 1 if len(bucket) < before else 0

    def scard(self, key: str) -> int:
        return len(self.sets.get(key, set()))

    def delete(self, key: str) -> int:
        existed = key in self.sets
        self.sets.pop(key, None)
        return 1 if existed else 0

    def close(self) -> None:
        return None


def _make_user_with_stream(db: Session, username: str) -> tuple[models.User, models.Stream]:
    user = models.User(
        username=username,
        hashed_password=hash_password("password123"),
        display_name=username,
        stream_key=generate_stream_key(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    stream = models.Stream(owner_id=user.id, title="Presence Stream")
    db.add(stream)
    db.commit()
    db.refresh(stream)

    db.add(models.StreamSettings(stream_id=stream.id, visibility="public"))
    db.commit()

    return user, stream


def test_presence_join_leave_and_viewer_count_endpoint(test_client, db_session: Session, monkeypatch) -> None:
    fake_redis = _FakeRedis()
    monkeypatch.setattr(presence_service, "_get_redis_client", lambda: fake_redis)

    _user, stream = _make_user_with_stream(db_session, "presence_join_leave")

    join_1 = test_client.post(f"/api/streams/{stream.id}/presence/join", json={"session_id": "sess-a-12345678"})
    assert join_1.status_code == 200
    assert join_1.json()["viewer_count"] == 1

    join_2 = test_client.post(f"/api/streams/{stream.id}/presence/join", json={"session_id": "sess-b-12345678"})
    assert join_2.status_code == 200
    assert join_2.json()["viewer_count"] == 2

    count = test_client.get(f"/api/streams/{stream.id}/viewer-count")
    assert count.status_code == 200
    assert count.json()["viewer_count"] == 2

    leave = test_client.post(f"/api/streams/{stream.id}/presence/leave", json={"session_id": "sess-a-12345678"})
    assert leave.status_code == 200
    assert leave.json()["viewer_count"] == 1


def test_presence_join_updates_peak_viewers_for_active_session(test_client, db_session: Session, monkeypatch) -> None:
    fake_redis = _FakeRedis()
    monkeypatch.setattr(presence_service, "_get_redis_client", lambda: fake_redis)

    _user, stream = _make_user_with_stream(db_session, "presence_peak")
    start_stream_session(stream, db_session, ingest_type="rtmp")

    first_join = test_client.post(f"/api/streams/{stream.id}/presence/join", json={"session_id": "sess-1-12345678"})
    assert first_join.status_code == 200
    assert first_join.json()["viewer_count"] == 1

    second_join = test_client.post(f"/api/streams/{stream.id}/presence/join", json={"session_id": "sess-2-12345678"})
    assert second_join.status_code == 200
    assert second_join.json()["viewer_count"] == 2

    active = get_active_session(stream, db_session)
    assert active is not None
    assert active.peak_viewers == 2


def test_live_streams_exposes_viewer_count(test_client, db_session: Session, monkeypatch) -> None:
    fake_redis = _FakeRedis()
    monkeypatch.setattr(presence_service, "_get_redis_client", lambda: fake_redis)

    user, stream = _make_user_with_stream(db_session, "presence_live_list")
    start_stream_session(stream, db_session, ingest_type="rtmp")

    test_client.post(f"/api/streams/{stream.id}/presence/join", json={"session_id": "sess-1-abcdef12"})
    test_client.post(f"/api/streams/{stream.id}/presence/join", json={"session_id": "sess-2-abcdef12"})

    response = test_client.get("/api/streams/live")
    assert response.status_code == 200

    rows = response.json()
    row = next(item for item in rows if item["owner_username"] == user.username)
    assert row["viewer_count"] == 2


def test_stream_ended_event_cleans_presence_set(test_client, db_session: Session, monkeypatch) -> None:
    fake_redis = _FakeRedis()
    monkeypatch.setattr(presence_service, "_get_redis_client", lambda: fake_redis)
    monkeypatch.setenv("STREAM_EVENTS_SECRET", "wave9-secret")

    user, stream = _make_user_with_stream(db_session, "presence_cleanup")

    start_response = test_client.post(
        "/api/internal/stream-events",
        json={"event": "stream_started", "stream_key": user.stream_key},
        headers={"X-Internal-Token": "wave9-secret"},
    )
    assert start_response.status_code == 200

    test_client.post(f"/api/streams/{stream.id}/presence/join", json={"session_id": "sess-clean-1"})
    test_client.post(f"/api/streams/{stream.id}/presence/join", json={"session_id": "sess-clean-2"})

    before = test_client.get(f"/api/streams/{stream.id}/viewer-count")
    assert before.status_code == 200
    assert before.json()["viewer_count"] == 2

    end_response = test_client.post(
        "/api/internal/stream-events",
        json={"event": "stream_ended", "stream_key": user.stream_key},
        headers={"X-Internal-Token": "wave9-secret"},
    )
    assert end_response.status_code == 200

    after = test_client.get(f"/api/streams/{stream.id}/viewer-count")
    assert after.status_code == 200
    assert after.json()["viewer_count"] == 0
