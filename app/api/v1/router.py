from fastapi import APIRouter

from app.api.v1 import alerts, auth, payments, reports, reservations, sensors, spots, users

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(spots.router, prefix="/spots", tags=["Parking Spots"])
api_router.include_router(reservations.router, prefix="/reservations", tags=["Reservations"])
api_router.include_router(payments.router, prefix="/payments", tags=["Payments"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(sensors.router, prefix="/sensors", tags=["Sensors"])
