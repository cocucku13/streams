from datetime import datetime, timezone

import pytest
from sqlalchemy.orm import Session

from app import models
from app.auth import generate_stream_key, hash_password
from app.services import chat_service as chat_service


class _FakePubSub:
    def __init__(self, messages):
        self._messages = messages

    async def subscribe(self, _channel):
        return None

    async def unsubscribe(self, _channel):
        return None

    async def close(self):
        return None

    async def listen(self):
        for item in self._messages:
            yield item


class _FakeRedis:
    def __init__(self, messages=None):
        self.published = []
        self._messages = messages or []

    async def publish(self, channel, payload):
        self.published.append((channel, payload))

    def pubsub(self):
        return _FakePubSub(self._messages)

    async def aclose(self):
        return None


def _make_user_with_stream(db: Session, username: str, stream_key: str) -> models.Stream:
    user = models.User(
        username=username,
        hashed_password=hash_password("password123"),
        display_name=username,
        stream_key=stream_key,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    stream = models.Stream(owner_id=user.id, title="Chat stream")
    db.add(stream)
    db.commit()
    db.refresh(stream)
    return stream


@pytest.mark.anyio
async def test_publish_and_subscribe_stream(monkeypatch):
    fake = _FakeRedis(
        messages=[
            {
                "type": "message",
                "data": '{"user": "dj", "message": "hello", "at": "2026-03-07T00:00:00+00:00"}',
            }
        ]
    )
    monkeypatch.setattr(chat_service, "_get_redis_client", lambda: fake)

    payload = {"user": "dj", "message": "hello", "at": datetime.now(timezone.utc).isoformat()}
    await chat_service.publish_message(7, payload)

    received = []
    async for item in chat_service.subscribe_stream(7):
        received.append(item)
        break

    assert len(fake.published) == 1
    assert fake.published[0][0] == "chat:stream:7"
    assert received[0]["message"] == "hello"


def test_store_and_get_recent_messages(db_session: Session) -> None:
    stream = _make_user_with_stream(db_session, "chat_user", generate_stream_key())

    chat_service.store_message(stream.id, 0, "first", db_session, username="Guest")
    chat_service.store_message(stream.id, 1, "second", db_session, username="dj")

    rows = chat_service.get_recent_messages(stream.id, db_session, limit=50)

    assert len(rows) == 2
    assert rows[0].message == "first"
    assert rows[1].message == "second"


def test_moderation_hooks_empty_too_long_rate_limit() -> None:
    with pytest.raises(ValueError, match="empty"):
        chat_service.normalize_and_validate_message(1, "guest", "   ")

    with pytest.raises(ValueError, match="too long"):
        chat_service.normalize_and_validate_message(1, "guest", "x" * (chat_service.MAX_MESSAGE_LENGTH + 1))

    for _ in range(chat_service.RATE_LIMIT_COUNT):
        chat_service.normalize_and_validate_message(777, "rate-user", "ok")

    with pytest.raises(ValueError, match="Rate limit"):
        chat_service.normalize_and_validate_message(777, "rate-user", "blocked")
