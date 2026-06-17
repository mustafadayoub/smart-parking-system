from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class HourlyOccupancyBucket(BaseModel):
    hour: int = Field(ge=0, le=23)
    detected_readings: int
    clear_readings: int
    utilization_rate: float = Field(
        description="Ratio of DETECTED readings to total readings in the hour"
    )


class DailyOccupancyReport(BaseModel):
    report_date: date
    total_spots: int
    peak_hour: int | None
    peak_utilization_rate: float
    average_utilization_rate: float
    hourly_breakdown: list[HourlyOccupancyBucket]
    generated_at: datetime


class OccupancyReportQuery(BaseModel):
    report_date: date | None = None
    level_zone: str | None = None


class CachedOccupancyReportResponse(BaseModel):
    report: DailyOccupancyReport
    cache_key: str
    source: str = "redis"


class FinancialPeriodMetrics(BaseModel):
    total_revenue: Decimal = Field(description="Sum of total_price for PAID reservations")
    paid_reservations: int = Field(description="Count of reservations with PAID status")
    average_transaction_value: Decimal = Field(
        description="Average total_price per paid reservation"
    )


class FinancialReportResponse(BaseModel):
    today: FinancialPeriodMetrics
    this_week: FinancialPeriodMetrics
    this_month: FinancialPeriodMetrics
    generated_at: datetime
