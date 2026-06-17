import asyncio
import json
import logging

import redis.asyncio as aioredis
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.config import settings
from app.websockets.manager import manager

logger = logging.getLogger(__name__)
router = APIRouter()


async def _redis_listener() -> None:
    """Subscribe to Redis Pub/Sub and forward events to WebSocket clients."""
    client = aioredis.from_url(settings.redis_url, decode_responses=True)
    pubsub = client.pubsub()
    await pubsub.subscribe(
        settings.spot_updates_channel,
        settings.driver_notifications_channel,
        settings.management_alerts_channel,
    )
    logger.info(
        "Subscribed to Redis channels: %s, %s, %s",
        settings.spot_updates_channel,
        settings.driver_notifications_channel,
        settings.management_alerts_channel,
    )

    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            try:
                payload = json.loads(message["data"])
            except json.JSONDecodeError:
                logger.warning("Ignoring non-JSON pub/sub payload")
                continue
            await manager.broadcast(payload)
    except asyncio.CancelledError:
        logger.info("Redis listener cancelled")
        raise
    finally:
        await pubsub.unsubscribe(
            settings.spot_updates_channel,
            settings.driver_notifications_channel,
            settings.management_alerts_channel,
        )
        await pubsub.aclose()
        await client.aclose()


@router.websocket("/spots/updates")
async def spot_updates_websocket(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; clients may send ping messages.
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
