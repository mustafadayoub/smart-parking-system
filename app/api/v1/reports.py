from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.core.enums import UserRole
from app.database import get_db
from app.models.user import User
from app.schemas.report import CachedOccupancyReportResponse, DailyOccupancyReport, FinancialReportResponse
from app.services import NotFoundError, ReportService

router = APIRouter()


@router.get("/occupancy", response_model=DailyOccupancyReport)
async def get_occupancy_report(
    report_date: date | None = Query(
        default=None, description="Report date (UTC). Defaults to today."
    ),
    level_zone: str | None = Query(default=None, description="Optional zone filter"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.MANAGEMENT)),
) -> DailyOccupancyReport:
    from datetime import UTC, datetime

    target = datetime.combine(report_date, datetime.min.time(), tzinfo=UTC) if report_date else None
    return await ReportService.get_occupancy_report(db, report_date=target, level_zone=level_zone)


@router.get("/occupancy/cached", response_model=CachedOccupancyReportResponse)
async def get_cached_occupancy_report(
    report_date: date | None = Query(
        default=None, description="Cached report date (UTC). Defaults to yesterday."
    ),
    _: User = Depends(require_role(UserRole.MANAGEMENT)),
) -> CachedOccupancyReportResponse:
    try:
        report, cache_key = await ReportService.get_cached_occupancy_report(report_date)
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return CachedOccupancyReportResponse(report=report, cache_key=cache_key)


@router.get("/financial", response_model=FinancialReportResponse)
async def get_financial_report(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(UserRole.MANAGEMENT)),
) -> FinancialReportResponse:
    return await ReportService.get_financial_report(db)
