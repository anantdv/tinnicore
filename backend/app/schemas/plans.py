from __future__ import annotations

from pydantic import BaseModel

from app.schemas.common import Timestamped


class AccessPlanCreate(BaseModel):
    plan_name: str
    download_kbps: int
    upload_kbps: int
    max_data_mb: int | None = None
    max_duration_minutes: int | None = None
    idle_timeout_minutes: int | None = None
    concurrent_sessions: int = 1
    status: str = "active"


class AccessPlanUpdate(BaseModel):
    plan_name: str | None = None
    download_kbps: int | None = None
    upload_kbps: int | None = None
    max_data_mb: int | None = None
    max_duration_minutes: int | None = None
    idle_timeout_minutes: int | None = None
    concurrent_sessions: int | None = None
    status: str | None = None


class AccessPlanRead(Timestamped):
    id: int
    plan_name: str
    download_kbps: int
    upload_kbps: int
    max_data_mb: int | None = None
    max_duration_minutes: int | None = None
    idle_timeout_minutes: int | None = None
    concurrent_sessions: int
    status: str
