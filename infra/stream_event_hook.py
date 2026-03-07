import os
import sys

import requests


def _normalize_stream_key(path: str) -> str:
    key = (path or "").strip()
    if key.startswith("live/"):
        return key.split("/", 1)[1]
    return key


def main() -> int:
    if len(sys.argv) < 3:
        print("Usage: stream_event_hook.py <event> <path>", file=sys.stderr)
        return 2

    event = sys.argv[1].strip()
    path = sys.argv[2].strip()
    stream_key = _normalize_stream_key(path)

    if event not in {"stream_started", "stream_ended"}:
        print(f"Unsupported event: {event}", file=sys.stderr)
        return 2
    if not stream_key:
        print("Empty stream key", file=sys.stderr)
        return 2

    endpoint = (os.getenv("STREAM_EVENTS_ENDPOINT") or "").strip()
    token = (os.getenv("STREAM_EVENTS_SECRET") or "").strip()

    if not endpoint or not token:
        print("Missing STREAM_EVENTS_ENDPOINT or STREAM_EVENTS_SECRET", file=sys.stderr)
        return 1

    try:
        response = requests.post(
            endpoint,
            json={"event": event, "stream_key": stream_key},
            headers={"X-Internal-Token": token},
            timeout=3,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        print(f"Webhook request failed: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
