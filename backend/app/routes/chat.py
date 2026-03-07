import asyncio
import contextlib

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from ..db import SessionLocal
from ..services.chat_service import normalize_and_validate_message, publish_message, store_message, subscribe_stream

router = APIRouter(tags=["chat"])


@router.websocket("/ws/chat/{stream_id}")
async def chat_socket(websocket: WebSocket, stream_id: int):
    await websocket.accept()

    async def _forward_pubsub_messages() -> None:
        async for payload in subscribe_stream(stream_id):
            await websocket.send_json(payload)

    pubsub_task = asyncio.create_task(_forward_pubsub_messages())

    try:
        while True:
            data = await websocket.receive_json()
            username = str(data.get("user", "Guest") or "Guest")[:50]
            try:
                user_id = int(data.get("user_id", 0) or 0)
            except (TypeError, ValueError):
                user_id = 0
            raw_message = str(data.get("message", ""))

            try:
                message_text = normalize_and_validate_message(stream_id, username, raw_message)
            except ValueError as exc:
                await websocket.send_json({"type": "error", "detail": str(exc)})
                continue

            db: Session = SessionLocal()
            try:
                stored = store_message(stream_id, user_id, message_text, db, username=username)
            finally:
                db.close()

            payload = {
                "user": stored.username,
                "message": stored.message,
                "at": stored.created_at.isoformat(),
            }
            await publish_message(stream_id, payload)
    except WebSocketDisconnect:
        pass
    finally:
        pubsub_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await pubsub_task
