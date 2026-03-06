from collections import defaultdict
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["chat"])


class ChatManager:
    def __init__(self):
        self.connections: dict[int, list[WebSocket]] = defaultdict(list)

    async def connect(self, stream_id: int, websocket: WebSocket):
        await websocket.accept()
        self.connections[stream_id].append(websocket)

    def disconnect(self, stream_id: int, websocket: WebSocket):
        if websocket in self.connections[stream_id]:
            self.connections[stream_id].remove(websocket)
        if not self.connections[stream_id]:
            del self.connections[stream_id]

    async def broadcast(self, stream_id: int, payload: dict):
        for connection in self.connections.get(stream_id, []):
            await connection.send_json(payload)


manager = ChatManager()


@router.websocket("/ws/chat/{stream_id}")
async def chat_socket(websocket: WebSocket, stream_id: int):
    await manager.connect(stream_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            message = {
                "user": data.get("user", "Guest")[:30],
                "message": data.get("message", "")[:300],
                "at": datetime.now(timezone.utc).isoformat(),
            }
            await manager.broadcast(stream_id, message)
    except WebSocketDisconnect:
        manager.disconnect(stream_id, websocket)
