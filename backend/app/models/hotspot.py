from __future__ import annotations

from sqlalchemy import Boolean, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import TimestampMixin


class HotspotPortal(TimestampMixin, Base):
    __tablename__ = "hotspot_portals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    portal_name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    portal_host: Mapped[str] = mapped_column(String(255), nullable=False)
    landing_path: Mapped[str] = mapped_column(String(128), default="/login", nullable=False)
    success_path: Mapped[str] = mapped_column(String(128), default="/status", nullable=False)
    allowed_hosts: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    welcome_message: Mapped[str | None] = mapped_column(String(255))
    builder_config: Mapped[dict | None] = mapped_column(JSON)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class RadiusProfile(TimestampMixin, Base):
    __tablename__ = "radius_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    access_plan_id: Mapped[int] = mapped_column(ForeignKey("hotspot_access_plans.id", ondelete="CASCADE"), unique=True, nullable=False)
    profile_name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    radius_group_name: Mapped[str] = mapped_column(String(128), nullable=False)
    reply_attributes: Mapped[dict | None] = mapped_column(JSON)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class RadiusNasDevice(TimestampMixin, Base):
    __tablename__ = "radius_nas_devices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    ip_address: Mapped[str] = mapped_column(String(64), nullable=False)
    secret: Mapped[str] = mapped_column(String(255), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(64))
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class RadiusAuthAttempt(TimestampMixin, Base):
    __tablename__ = "radius_auth_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(128), nullable=False)
    auth_method: Mapped[str] = mapped_column(String(32), nullable=False)
    result: Mapped[str] = mapped_column(String(32), nullable=False)
    reason: Mapped[str | None] = mapped_column(String(255))
    client_ip: Mapped[str | None] = mapped_column(String(64))
    client_mac: Mapped[str | None] = mapped_column(String(64))
    nas_ip: Mapped[str | None] = mapped_column(String(64))
    voucher_code: Mapped[str | None] = mapped_column(String(64))
    plan_name: Mapped[str | None] = mapped_column(String(128))
    session_token: Mapped[str | None] = mapped_column(String(255))
