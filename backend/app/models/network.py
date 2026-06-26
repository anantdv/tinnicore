from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import TimestampMixin


class NetworkInterface(TimestampMixin, Base):
    __tablename__ = "network_interfaces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    role: Mapped[str] = mapped_column(String(32), default="unassigned", nullable=False)
    ip_mode: Mapped[str] = mapped_column(String(32), default="dhcp", nullable=False)
    description: Mapped[str | None] = mapped_column(String(128))
    address: Mapped[str | None] = mapped_column(String(64))
    netmask: Mapped[str | None] = mapped_column(String(64))
    gateway: Mapped[str | None] = mapped_column(String(64))
    mtu: Mapped[int | None] = mapped_column(Integer)
    mac_address: Mapped[str | None] = mapped_column(String(64))
    settings: Mapped[dict | None] = mapped_column(JSON)
    is_up: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Vlan(TimestampMixin, Base):
    __tablename__ = "network_vlans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    interface_id: Mapped[int] = mapped_column(ForeignKey("network_interfaces.id", ondelete="CASCADE"), nullable=False)
    vlan_id: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)


class DhcpScope(TimestampMixin, Base):
    __tablename__ = "network_dhcp_scopes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    interface_id: Mapped[int] = mapped_column(ForeignKey("network_interfaces.id", ondelete="CASCADE"), nullable=False)
    scope_name: Mapped[str] = mapped_column(String(128), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    start_ip: Mapped[str] = mapped_column(String(64), nullable=False)
    end_ip: Mapped[str] = mapped_column(String(64), nullable=False)
    subnet_mask: Mapped[str | None] = mapped_column(String(64))
    gateway: Mapped[str | None] = mapped_column(String(64))
    dns_primary: Mapped[str | None] = mapped_column(String(64))
    dns_secondary: Mapped[str | None] = mapped_column(String(64))
    domain_name: Mapped[str | None] = mapped_column(String(128))
    lease_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    options: Mapped[dict | None] = mapped_column(JSON)


class DnsSetting(TimestampMixin, Base):
    __tablename__ = "network_dns_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    resolver_name: Mapped[str] = mapped_column(String(128), default="default", nullable=False)
    primary_dns: Mapped[str] = mapped_column(String(64), nullable=False)
    secondary_dns: Mapped[str | None] = mapped_column(String(64))
    search_domain: Mapped[str | None] = mapped_column(String(128))
    cache_size: Mapped[int] = mapped_column(Integer, default=1000, nullable=False)
    local_ttl: Mapped[int] = mapped_column(Integer, default=300, nullable=False)


class DynamicDnsProfile(TimestampMixin, Base):
    __tablename__ = "network_dyndns_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    profile_name: Mapped[str] = mapped_column(String(128), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    provider: Mapped[str] = mapped_column(String(64), default="custom", nullable=False)
    protocol: Mapped[str] = mapped_column(String(64), default="dyndns2", nullable=False)
    server: Mapped[str | None] = mapped_column(String(255))
    hostnames: Mapped[str] = mapped_column(String(512), nullable=False)
    username: Mapped[str] = mapped_column(String(255), nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    interface_name: Mapped[str | None] = mapped_column(String(64))
    use_ssl: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    check_url: Mapped[str | None] = mapped_column(String(255))
    update_interval_minutes: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    force_update_days: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)


class StaticRoute(TimestampMixin, Base):
    __tablename__ = "network_static_routes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    rule_name: Mapped[str] = mapped_column(String(128), default="Static Route", nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    dest_type: Mapped[str] = mapped_column(String(32), default="network", nullable=False)
    destination: Mapped[str] = mapped_column(String(64), nullable=False)
    subnetmask: Mapped[str | None] = mapped_column(String(64))
    gateway: Mapped[str] = mapped_column(String(64), nullable=False)
    interface_name: Mapped[str | None] = mapped_column(String(64))
    metric: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    route_type: Mapped[str] = mapped_column(String(32), default="gateway", nullable=False)
    floating: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class WanInterface(TimestampMixin, Base):
    __tablename__ = "network_wan_interfaces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    weight: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    failover_mode: Mapped[str] = mapped_column(String(32), default="auto", nullable=False)
    load_balancing_mode: Mapped[str] = mapped_column(String(32), default="weighted", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="up", nullable=False)


class WanHealthStatus(Base):
    __tablename__ = "network_wan_health_status"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    wan_interface_id: Mapped[int] = mapped_column(ForeignKey("network_wan_interfaces.id", ondelete="CASCADE"), nullable=False)
    state: Mapped[str] = mapped_column(String(32), nullable=False)
    latency_ms: Mapped[int | None] = mapped_column(Integer)
    loss_percent: Mapped[int | None] = mapped_column(Integer)
    checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
