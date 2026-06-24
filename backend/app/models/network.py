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
    address: Mapped[str | None] = mapped_column(String(64))
    netmask: Mapped[str | None] = mapped_column(String(64))
    gateway: Mapped[str | None] = mapped_column(String(64))
    mtu: Mapped[int | None] = mapped_column(Integer)
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
    start_ip: Mapped[str] = mapped_column(String(64), nullable=False)
    end_ip: Mapped[str] = mapped_column(String(64), nullable=False)
    lease_minutes: Mapped[int] = mapped_column(Integer, nullable=False)


class DnsSetting(TimestampMixin, Base):
    __tablename__ = "network_dns_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    primary_dns: Mapped[str] = mapped_column(String(64), nullable=False)
    secondary_dns: Mapped[str | None] = mapped_column(String(64))
    search_domain: Mapped[str | None] = mapped_column(String(128))


class StaticRoute(TimestampMixin, Base):
    __tablename__ = "network_static_routes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    destination: Mapped[str] = mapped_column(String(64), nullable=False)
    gateway: Mapped[str] = mapped_column(String(64), nullable=False)
    interface_name: Mapped[str | None] = mapped_column(String(64))
    metric: Mapped[int] = mapped_column(Integer, default=1, nullable=False)


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
