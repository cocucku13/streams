import json
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import AsyncIterator

from redis.asyncio import Redis
from sqlalchemy.orm import Session

from .. import models
from ..settings import settings

MAX_MESSAGE_LENGTH = 300
RATE_LIMIT_COUNT = 5
RATE_LIMIT_WINDOW_SECONDS = 10

# Basic process-local anti-spam guard.
_recent_messages_by_user: dict[tuple[int, str], deque[float]] = defaultdict(deque)


def _channel_name(stream_id: int) -> str:
    return f"chat:stream:{stream_id}"


def _get_redis_client() -> Redis:
    return Redis.from_url(settings.redis_url, decode_responses=True)


def normalize_and_validate_message(stream_id: int, username: str, raw_message: str) -> str:
    message = raw_message.strip()
    if not message:
        raise ValueError("Message cannot be empty")
    if len(message) > MAX_MESSAGE_LENGTH:
        raise ValueError(f"Message is too long (max {MAX_MESSAGE_LENGTH})")

    user_key = (stream_id, username[:50] or "Guest")
    now = time.monotonic()
    bucket = _recent_messages_by_user[user_key]
    while bucket and now - bucket[0] > RATE_LIMIT_WINDOW_SECONDS:
        bucket.popleft()
    if len(bucket) >= RATE_LIMIT_COUNT:
        raise ValueError("Rate limit exceeded")
    bucket.append(now)

    return message


async def publish_message(stream_id: int, message: dict) -> None:
    redis = _get_redis_client()
    await redis.publish(_channel_name(stream_id), json.dumps(message))
    await redis.aclose()


async def subscribe_stream(stream_id: int) -> AsyncIterator[dict]:
    redis = _get_redis_client()
    pubsub = redis.pubsub()
    await pubsub.subscribe(_channel_name(stream_id))

    try:
        async for incoming in pubsub.listen():
            if incoming.get("type") != "message":
                continue
            raw_data = incoming.get("data")
            if not raw_data:
                continue
            yield json.loads(raw_data)
    finally:
        await pubsub.unsubscribe(_channel_name(stream_id))
        await pubsub.close()
        await redis.aclose()


def store_message(stream_id: int, user_id: int, message: str, db: Session, username: str = "Guest") -> models.ChatMessage:
    record = models.ChatMessage(
        stream_id=stream_id,
        user_id=user_id,
        username=(username or "Guest")[:50],
        message=message,
        created_at=datetime.now(timezone.utc),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_recent_messages(stream_id: int, db: Session, limit: int = 50) -> list[models.ChatMessage]:
    bounded_limit = max(1, min(limit, 200))
    rows = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.stream_id == stream_id)
        .order_by(models.ChatMessage.created_at.desc())
        .limit(bounded_limit)
        .all()
    )
    return list(reversed(rows))
