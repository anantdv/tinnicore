from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import TimestampMixin


class License(TimestampMixin, Base):
    __tablename__ = "licensing_licenses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    license_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="inactive", nullable=False)
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class LicenseModule(TimestampMixin, Base):
    __tablename__ = "licensing_modules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    license_id: Mapped[int] = mapped_column(ForeignKey("licensing_licenses.id", ondelete="CASCADE"), nullable=False)
    module_name: Mapped[str] = mapped_column(String(128), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    entitlements: Mapped[dict | None] = mapped_column(JSON)
