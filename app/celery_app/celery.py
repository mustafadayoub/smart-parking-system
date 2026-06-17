from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery = Celery(
    "smart_parking",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.celery_app.tasks"],
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
)

celery.conf.beat_schedule = {
    "expire-stale-reservations": {
        "task": "app.celery_app.tasks.expire_stale_reservations",
        "schedule": crontab(minute="*/5"),
    },
    "generate-daily-occupancy-report": {
        "task": "app.celery_app.tasks.generate_daily_occupancy_report",
        "schedule": crontab(
            hour=settings.daily_report_hour,
            minute=settings.daily_report_minute,
        ),
    },
}
