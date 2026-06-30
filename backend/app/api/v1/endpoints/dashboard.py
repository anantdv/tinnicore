from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.adapters.system import SystemCommandExecutor
from app.models.auth import User
from app.models.firewall import FirewallRule
from app.models.firmware import FirmwareVersion
from app.models.license import License
from app.models.network import DhcpScope, NetworkInterface, WanHealthStatus, WanInterface
from app.models.sessions import HotspotSession
from app.models.telemetry import TelemetryAlert
from app.models.vouchers import AccessPlan, VoucherBatch

router = APIRouter()


def _format_duration(seconds: int) -> str:
    days, remainder = divmod(max(seconds, 0), 86400)
    hours, remainder = divmod(remainder, 3600)
    minutes, _ = divmod(remainder, 60)
    if days:
        return f"{days}D {hours}H {minutes}M"
    if hours:
        return f"{hours}H {minutes}M"
    return f"{minutes}M"


def _format_relative_time(timestamp: datetime | None) -> str:
    if timestamp is None:
        return "recent"

    now = datetime.now(timezone.utc)
    delta = max(int((now - timestamp).total_seconds()), 0)
    if delta < 60:
        return f"{delta}s ago"
    if delta < 3600:
        return f"{delta // 60}m ago"
    if delta < 86400:
        return f"{delta // 3600}h ago"
    return f"{delta // 86400}d ago"


def _build_bandwidth_history(sessions: list[HotspotSession]) -> list[dict[str, float | str]]:
    recent_sessions = sorted(sessions, key=lambda item: item.last_seen_at or item.started_at, reverse=True)[:7]
    points = list(reversed(recent_sessions))
    chart = []
    for index, session in enumerate(points, start=1):
        chart.append(
            {
                "name": (session.last_seen_at or session.started_at).strftime("%d %b"),
                "down": round(session.bytes_down / 1024 / 1024, 2),
                "up": round(session.bytes_up / 1024 / 1024, 2),
            }
        )

    while len(chart) < 7:
        chart.insert(
            0,
            {
                "name": f"S{7 - len(chart)}",
                "down": 0.0,
                "up": 0.0,
            },
        )
    return chart


@router.get("/summary")
def summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> dict:
    system = SystemCommandExecutor().collect_snapshot()
    online_users = db.query(HotspotSession).filter(HotspotSession.status == "active").count()
    active_sessions = online_users
    total_users = db.query(User).count()
    total_plans = db.query(AccessPlan).count()
    total_voucher_batches = db.query(VoucherBatch).count()
    total_lan_networks = db.query(NetworkInterface).filter(NetworkInterface.role == "lan").count()
    if total_lan_networks == 0:
        total_lan_networks = db.query(DhcpScope).count()
    total_interfaces = db.query(NetworkInterface).count()
    total_firewall_rules = db.query(FirewallRule).filter(FirewallRule.enabled.is_(True)).count()
    wan_rows = db.query(WanInterface).order_by(WanInterface.priority.asc()).all()
    wan = wan_rows[0] if wan_rows else None
    alerts = db.query(TelemetryAlert).order_by(TelemetryAlert.id.desc()).limit(5).all()
    version = db.query(FirmwareVersion).filter(FirmwareVersion.is_current.is_(True)).first()
    license_row = db.query(License).first()
    sessions = db.query(HotspotSession).order_by(HotspotSession.last_seen_at.desc()).limit(7).all()
    interface_rows = db.query(NetworkInterface).order_by(NetworkInterface.name.asc()).all()
    wan_health_rows = db.query(WanHealthStatus).order_by(WanHealthStatus.checked_at.desc()).all()
    latest_health: dict[int, WanHealthStatus] = {}
    for row in wan_health_rows:
        latest_health.setdefault(row.wan_interface_id, row)

    total_download_mb = round(sum(session.bytes_down for session in sessions) / 1024 / 1024, 2)
    total_upload_mb = round(sum(session.bytes_up for session in sessions) / 1024 / 1024, 2)
    total_usage = total_download_mb + total_upload_mb

    return {
        "online_users": online_users,
        "active_sessions": active_sessions,
        "total_users": total_users,
        "total_plans": total_plans,
        "total_voucher_batches": total_voucher_batches,
        "total_lan_networks": total_lan_networks,
        "total_interfaces": max(total_interfaces, system.interface_count),
        "total_firewall_rules": total_firewall_rules,
        "total_data_usage_mb": total_usage,
        "wan_status": {"name": wan.name if wan else "wan0", "status": wan.status if wan else "unknown"},
        "wan_interfaces": [
            {
                "name": item.name,
                "status": item.status,
                "latency_ms": latest_health.get(item.id).latency_ms if latest_health.get(item.id) else None,
                "loss_percent": latest_health.get(item.id).loss_percent if latest_health.get(item.id) else None,
            }
            for item in wan_rows
        ],
        "system_health": {
            "cpu": system.cpu_percent,
            "memory": system.memory_percent,
            "disk": system.disk_percent,
            "temperature": system.temperature_c,
        },
        "system_runtime": {
            "uptime_seconds": system.uptime_seconds,
            "uptime_label": _format_duration(system.uptime_seconds),
            "hostname": system.hostname,
            "primary_ip": system.primary_ip,
            "cpu_cores": system.cpu_cores,
            "memory_total_mb": system.memory_total_mb,
            "disk_total_gb": system.disk_total_gb,
            "kernel_version": system.kernel_version,
        },
        "recent_alerts": [
            {
                "severity": item.severity,
                "message": item.message,
                "status": _format_relative_time(item.created_at),
            }
            for item in alerts
        ],
        "bandwidth_usage": _build_bandwidth_history(sessions),
        "bandwidth_totals": {
            "download_mb": total_download_mb,
            "upload_mb": total_upload_mb,
        },
        "interfaces": [
            {
                "name": item.name,
                "role": item.role,
                "address": item.address,
                "status": "online" if item.is_up else "offline",
                "kind": item.kind,
            }
            for item in interface_rows
        ],
        "device_info": {
            "product": "TINNICORE OS",
            "firmware": version.version if version else "1.0.0",
            "license": license_row.status if license_row else "inactive",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "model": "TINNICORE 150",
            "serial_number": system.hostname.upper(),
            "os_version": f"TINNICORE OS {version.version if version else '1.0.0'}",
            "cpu_model": system.cpu_model,
            "cpu_cores": system.cpu_cores,
            "memory_total_mb": system.memory_total_mb,
            "disk_total_gb": system.disk_total_gb,
            "hostname": system.hostname,
            "primary_ip": system.primary_ip,
            "kernel_version": system.kernel_version,
            "uptime_label": _format_duration(system.uptime_seconds),
            "license_expires_at": license_row.expires_at.isoformat() if license_row and license_row.expires_at else None,
        },
    }
