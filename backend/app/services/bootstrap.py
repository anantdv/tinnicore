from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models.auth import Role, User
from app.models.firewall import FirewallRule, FirewallZone
from app.models.firmware import FirmwareVersion
from app.models.license import License, LicenseModule
from app.models.network import NetworkInterface, WanHealthStatus, WanInterface
from app.models.telemetry import TelemetryAlert, TelemetrySample
from app.models.vouchers import AccessPlan


def ensure_bootstrap_data(db: Session) -> None:
    admin = db.query(User).filter(User.username == settings.default_admin_username).first()
    if not admin:
        admin = User(
            username=settings.default_admin_username,
            email=settings.default_admin_email,
            full_name="System Administrator",
            password_hash=hash_password(settings.default_admin_password),
            is_active=True,
            is_admin=True,
        )
        db.add(admin)
    elif admin.email != settings.default_admin_email:
        admin.email = settings.default_admin_email
        db.add(admin)

    for role_name in ["admin", "operator", "viewer"]:
        if not db.query(Role).filter(Role.name == role_name).first():
            db.add(Role(name=role_name, description=f"{role_name.title()} role"))

    if not db.query(AccessPlan).first():
        db.add_all(
            [
                AccessPlan(plan_name="Guest 1h", download_kbps=2048, upload_kbps=1024, max_duration_minutes=60, idle_timeout_minutes=15, concurrent_sessions=1),
                AccessPlan(plan_name="Premium Day", download_kbps=10240, upload_kbps=5120, max_data_mb=5000, max_duration_minutes=1440, idle_timeout_minutes=30, concurrent_sessions=2),
            ]
        )

    if not db.query(NetworkInterface).first():
        db.add_all(
            [
                NetworkInterface(name="lan0", kind="bridge", address="192.168.10.1", netmask="255.255.255.0", mtu=1500, is_up=True),
                NetworkInterface(name="wan0", kind="ethernet", address="dhcp", mtu=1500, is_up=True),
            ]
        )

    if not db.query(WanInterface).first():
        wan = WanInterface(name="wan0", priority=1, weight=10, failover_mode="auto", load_balancing_mode="weighted", status="up")
        db.add(wan)
        db.flush()
        db.add(WanHealthStatus(wan_interface_id=wan.id, state="healthy", latency_ms=18, loss_percent=0, checked_at=datetime.now(timezone.utc)))

    if not db.query(FirewallZone).first():
        zone = FirewallZone(name="guest", policy="drop", interfaces=["lan0"])
        db.add(zone)
        db.flush()
        db.add(FirewallRule(zone_id=zone.id, rule_name="Allow DNS", action="accept", protocol="udp", port="53", enabled=True))

    if not db.query(License).first():
        license_row = License(license_key="DEMO-LICENSE-0001", status="active", activated_at=datetime.now(timezone.utc), expires_at=datetime.now(timezone.utc) + timedelta(days=365))
        db.add(license_row)
        db.flush()
        db.add(LicenseModule(license_id=license_row.id, module_name="hotspot", enabled=True, entitlements={"max_users": 1000, "priority_support": False}))

    if not db.query(FirmwareVersion).first():
        db.add_all(
            [
                FirmwareVersion(version="1.0.0", release_notes="Initial development build", is_current=True, is_available=False),
                FirmwareVersion(version="1.1.0", release_notes="Stability and security improvements", is_current=False, is_available=True),
            ]
        )

    if not db.query(TelemetryAlert).first():
        db.add(TelemetryAlert(severity="warning", message="WAN latency slightly elevated", status="open"))

    if not db.query(TelemetrySample).first():
        db.add_all(
            [
                TelemetrySample(sample_type="cpu", scope="system", value=22.5, unit="percent", captured_at=datetime.now(timezone.utc)),
                TelemetrySample(sample_type="memory", scope="system", value=61.2, unit="percent", captured_at=datetime.now(timezone.utc)),
            ]
        )

    db.commit()
