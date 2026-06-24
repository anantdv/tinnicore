from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.auth import User
from app.models.network import WanHealthStatus, WanInterface

router = APIRouter()


@router.get("/interfaces")
def wan_interfaces(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    return [
        {
            "id": item.id,
            "name": item.name,
            "priority": item.priority,
            "weight": item.weight,
            "failover_mode": item.failover_mode,
            "load_balancing_mode": item.load_balancing_mode,
            "status": item.status,
        }
        for item in db.query(WanInterface).all()
    ]


@router.get("/health")
def health_status(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    return [
        {
            "id": item.id,
            "wan_interface_id": item.wan_interface_id,
            "state": item.state,
            "latency_ms": item.latency_ms,
            "loss_percent": item.loss_percent,
            "checked_at": item.checked_at,
        }
        for item in db.query(WanHealthStatus).order_by(WanHealthStatus.id.desc()).all()
    ]
