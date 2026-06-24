from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.auth import User
from app.models.telemetry import TelemetryAlert, TelemetrySample

router = APIRouter()


@router.get("/samples")
def samples(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    return [
        {
            "id": item.id,
            "sample_type": item.sample_type,
            "scope": item.scope,
            "value": item.value,
            "unit": item.unit,
            "captured_at": item.captured_at,
        }
        for item in db.query(TelemetrySample).order_by(TelemetrySample.id.desc()).limit(100).all()
    ]


@router.get("/alerts")
def alerts(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    return [
        {
            "id": item.id,
            "severity": item.severity,
            "message": item.message,
            "status": item.status,
            "acknowledged_at": item.acknowledged_at,
            "created_at": item.created_at,
        }
        for item in db.query(TelemetryAlert).order_by(TelemetryAlert.id.desc()).all()
    ]


@router.get("/audit-logs")
def audit_logs(_: User = Depends(get_current_user)) -> list[dict]:
    return []
