from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    dashboard,
    firewall,
    firmware,
    gateway,
    license,
    network,
    plans,
    sessions,
    telemetry,
    users,
    vouchers,
    wan,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(plans.router, prefix="/plans", tags=["plans"])
api_router.include_router(vouchers.router, prefix="/vouchers", tags=["vouchers"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
api_router.include_router(network.router, prefix="/network", tags=["network"])
api_router.include_router(wan.router, prefix="/wan", tags=["wan"])
api_router.include_router(firewall.router, prefix="/firewall", tags=["firewall"])
api_router.include_router(gateway.router, prefix="/gateway", tags=["gateway"])
api_router.include_router(license.router, prefix="/license", tags=["license"])
api_router.include_router(firmware.router, prefix="/firmware", tags=["firmware"])
api_router.include_router(telemetry.router, prefix="/telemetry", tags=["telemetry"])
