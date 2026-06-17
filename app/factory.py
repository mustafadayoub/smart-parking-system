import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.config import settings
from app.websockets.routes import _redis_listener, router as ws_router

logger = logging.getLogger(__name__)


def create_app(*, enable_redis_listener: bool = True) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        listener_task = None
        if enable_redis_listener:
            listener_task = asyncio.create_task(_redis_listener())
            logger.info("%s started with Redis listener", settings.app_name)
        else:
            logger.info("%s started (test mode)", settings.app_name)

        try:
            yield
        finally:
            if listener_task is not None:
                listener_task.cancel()
                try:
                    await listener_task
                except asyncio.CancelledError:
                    pass
            if enable_redis_listener:
                from app.database import engine

                await engine.dispose()
            logger.info("%s shutdown complete", settings.app_name)

    application = FastAPI(
        title=settings.app_name,
        description=(
            "Production-ready backend for intelligent parking management with "
            "real-time IoT sensor integration, reservations, and occupancy reporting. "
            "Developed by Mustafa Al Dayoub and Mousa Al Awad."
        ),
        version="1.0.0",
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(api_router, prefix=settings.api_v1_prefix)
    application.include_router(ws_router, prefix="/ws/v1", tags=["WebSockets"])

    @application.get("/health", tags=["Health"])
    async def health_check() -> dict[str, str]:
        return {"status": "ok", "service": settings.app_name}

    return application
