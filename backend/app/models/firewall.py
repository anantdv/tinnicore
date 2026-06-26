from __future__ import annotations

from sqlalchemy import Boolean, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import TimestampMixin


class FirewallZone(TimestampMixin, Base):
    __tablename__ = "firewall_zones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    policy: Mapped[str] = mapped_column(String(32), default="accept", nullable=False)
    interfaces: Mapped[list | None] = mapped_column(JSON)


class FirewallRule(TimestampMixin, Base):
    __tablename__ = "firewall_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    zone_id: Mapped[int] = mapped_column(ForeignKey("firewall_zones.id", ondelete="CASCADE"), nullable=False)
    destination_zone_id: Mapped[int | None] = mapped_column(ForeignKey("firewall_zones.id", ondelete="SET NULL"))
    rule_name: Mapped[str] = mapped_column(String(128), nullable=False)
    action: Mapped[str] = mapped_column(String(32), nullable=False)
    time_restriction: Mapped[str] = mapped_column(String(64), default="disable", nullable=False)
    connections_per_second: Mapped[str] = mapped_column(String(64), default="no_limit", nullable=False)
    source: Mapped[str | None] = mapped_column(String(128))
    source_mac: Mapped[str | None] = mapped_column(String(128))
    exclude_source: Mapped[str | None] = mapped_column(String(128))
    exclude_source_mac: Mapped[str | None] = mapped_column(String(128))
    source_interface: Mapped[str | None] = mapped_column(String(64))
    destination: Mapped[str | None] = mapped_column(String(128))
    exclude_destination: Mapped[str | None] = mapped_column(String(128))
    destination_interface: Mapped[str | None] = mapped_column(String(64))
    protocol: Mapped[str | None] = mapped_column(String(32))
    port: Mapped[str | None] = mapped_column(String(32))
    log: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    comment: Mapped[str | None] = mapped_column(String(255))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class FirewallNatRule(TimestampMixin, Base):
    __tablename__ = "firewall_nat_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    source: Mapped[str | None] = mapped_column(String(128))
    translated_to: Mapped[str] = mapped_column(String(128), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class FirewallPortForward(TimestampMixin, Base):
    __tablename__ = "firewall_port_forwards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    action: Mapped[str] = mapped_column(String(32), default="forward", nullable=False)
    time_restriction: Mapped[str] = mapped_column(String(64), default="disable", nullable=False)
    connections_per_second: Mapped[str] = mapped_column(String(64), default="no_limit", nullable=False)
    incoming_zone: Mapped[str | None] = mapped_column(String(64))
    external_port: Mapped[str] = mapped_column(String(32), nullable=False)
    original_destination: Mapped[str | None] = mapped_column(String(128))
    exclude_original_destination: Mapped[str | None] = mapped_column(String(128))
    forward_zone: Mapped[str | None] = mapped_column(String(64))
    server_type: Mapped[str] = mapped_column(String(64), default="single_server", nullable=False)
    internal_ip: Mapped[str] = mapped_column(String(64), nullable=False)
    internal_port: Mapped[str] = mapped_column(String(32), nullable=False)
    forward_port_mode: Mapped[str] = mapped_column(String(64), default="original_port", nullable=False)
    hairpin_snat_interface: Mapped[str | None] = mapped_column(String(64))
    source_address: Mapped[str | None] = mapped_column(String(128))
    exclude_source_address: Mapped[str | None] = mapped_column(String(128))
    source_ports: Mapped[str | None] = mapped_column(String(128))
    source_interface: Mapped[str | None] = mapped_column(String(64))
    protocol: Mapped[str] = mapped_column(String(16), nullable=False)
    log: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    comment: Mapped[str | None] = mapped_column(String(255))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
