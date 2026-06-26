from app.db.base import Base
from app.models.audit import AuditLog
from app.models.auth import Permission, Role, User, UserRole
from app.models.firewall import FirewallNatRule, FirewallPortForward, FirewallRule, FirewallZone
from app.models.firmware import FirmwareUpdateJob, FirmwareVersion
from app.models.gateway import GatewayApplyJob
from app.models.license import License, LicenseModule
from app.models.network import (
    DhcpScope,
    DnsSetting,
    DynamicDnsProfile,
    NetworkInterface,
    StaticRoute,
    Vlan,
    WanHealthStatus,
    WanInterface,
)
from app.models.sessions import HotspotSession
from app.models.hotspot import HotspotPortal, RadiusAuthAttempt, RadiusNasDevice, RadiusProfile
from app.models.system import SystemEvent
from app.models.telemetry import TelemetryAlert, TelemetrySample
from app.models.vouchers import AccessPlan, Voucher, VoucherBatch

__all__ = [
    "Base",
    "User",
    "Role",
    "Permission",
    "UserRole",
    "AccessPlan",
    "HotspotSession",
    "HotspotPortal",
    "RadiusProfile",
    "RadiusNasDevice",
    "RadiusAuthAttempt",
    "VoucherBatch",
    "Voucher",
    "NetworkInterface",
    "Vlan",
    "DhcpScope",
    "DnsSetting",
    "DynamicDnsProfile",
    "StaticRoute",
    "WanInterface",
    "WanHealthStatus",
    "FirewallZone",
    "FirewallRule",
    "FirewallNatRule",
    "FirewallPortForward",
    "License",
    "LicenseModule",
    "FirmwareVersion",
    "FirmwareUpdateJob",
    "GatewayApplyJob",
    "TelemetrySample",
    "TelemetryAlert",
    "AuditLog",
    "SystemEvent",
]
