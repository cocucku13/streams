from redis import Redis
from redis.exceptions import RedisError

from ..settings import settings


def _get_redis_client() -> Redis:
    return Redis.from_url(settings.redis_url, decode_responses=True)


def _viewers_key(stream_id: int) -> str:
    return f"stream:{stream_id}:viewers"


def join_viewer(stream_id: int, session_id: str) -> int:
    redis = _get_redis_client()
    try:
        key = _viewers_key(stream_id)
        redis.sadd(key, session_id)
        return int(redis.scard(key))
    except RedisError:
        return 0
    finally:
        redis.close()


def leave_viewer(stream_id: int, session_id: str) -> int:
    redis = _get_redis_client()
    try:
        key = _viewers_key(stream_id)
        redis.srem(key, session_id)
        return int(redis.scard(key))
    except RedisError:
        return 0
    finally:
        redis.close()


def get_viewer_count(stream_id: int) -> int:
    redis = _get_redis_client()
    try:
        return int(redis.scard(_viewers_key(stream_id)))
    except RedisError:
        return 0
    finally:
        redis.close()


def clear_stream_presence(stream_id: int) -> None:
    redis = _get_redis_client()
    try:
        redis.delete(_viewers_key(stream_id))
    except RedisError:
        return
    finally:
        redis.close()
