from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Smart Parking System"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    database_url: str = "postgresql+asyncpg://parking:parking_secret@localhost:5432/smart_parking"
    database_url_sync: str = (
        "postgresql+psycopg2://parking:parking_secret@localhost:5432/smart_parking"
    )

    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    secret_key: str = "change-me-to-a-long-random-secret-key-in-production"
    access_token_expire_minutes: int = 60
    algorithm: str = "HS256"

    reservation_grace_period_minutes: int = 15
    sensor_webhook_api_key: str = "dev-sensor-webhook-key"

    daily_report_hour: int = 0
    daily_report_minute: int = 0

    spot_updates_channel: str = "spot_updates"
    driver_notifications_channel: str = "driver_notifications"
    management_alerts_channel: str = "management_alerts"

    hourly_parking_rate: float = 5.0
    mock_payment_success_card: str = "4242424242424242"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
