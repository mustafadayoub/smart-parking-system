import asyncio
import json
import logging
from typing import Any

from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSocket clients and broadcasts spot update events."""

    def __init__(self) -> None:
        self.active_connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        logger.info("WebSocket client connected (%d total)", len(self.active_connections))

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self.active_connections.discard(websocket)
        logger.info("WebSocket client disconnected (%d total)", len(self.active_connections))

    async def broadcast(self, message: dict[str, Any]) -> None:
        if not self.active_connections:
            return

        payload = json.dumps(message)
        stale: list[WebSocket] = []

        async with self._lock:
            connections = list(self.active_connections)

        for connection in connections:
            try:
                await connection.send_text(payload)
            except WebSocketDisconnect:
                stale.append(connection)
            except RuntimeError:
                stale.append(connection)

        for connection in stale:
            await self.disconnect(connection)


manager = ConnectionManager()
