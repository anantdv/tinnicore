from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.auth import User
from app.models.firewall import FirewallRule
from app.models.firmware import FirmwareVersion
from app.models.license import License
from app.models.network import WanInterface
from app.models.sessions import HotspotSession
from app.models.telemetry import TelemetryAlert, TelemetrySample
from app.models.vouchers import AccessPlan, Voucher

router = APIRouter()


@router.get("/summary")
def summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> dict:
    online_users = db.query(HotspotSession).filter(HotspotSession.status == "active").count()
    active_sessions = online_users
    total_usage = db.query(TelemetrySample).filter(TelemetrySample.sample_type.in_(["traffic_rx", "traffic_tx"])).count()
    wan = db.query(WanInterface).order_by(WanInterface.priority.asc()).first()
    alerts = db.query(TelemetryAlert).order_by(TelemetryAlert.id.desc()).limit(5).all()
    version = db.query(FirmwareVersion).filter(FirmwareVersion.is_current.is_(True)).first()
    license_row = db.query(License).first()

    return {
        "online_users": online_users,
        "active_sessions": active_sessions,
        "total_data_usage_mb": total_usage * 128,
        "wan_status": {"name": wan.name if wan else "wan0", "status": wan.status if wan else "unknown"},
        "system_health": {"cpu": 22.5, "memory": 61.2, "disk": 44.1},
        "recent_alerts": [{"severity": item.severity, "message": item.message, "status": item.status} for item in alerts],
        "bandwidth_usage": [
            {"name": "Mon", "down": 220, "up": 90},
            {"name": "Tue", "down": 260, "up": 110},
            {"name": "Wed", "down": 198, "up": 84},
            {"name": "Thu", "down": 280, "up": 132},
            {"name": "Fri", "down": 340, "up": 150},
            {"name": "Sat", "down": 300, "up": 122},
            {"name": "Sun", "down": 210, "up": 88},
        ],
        "device_info": {
            "product": "TINNICORE OS",
            "firmware": version.version if version else "1.0.0",
            "license": license_row.status if license_row else "inactive",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }
