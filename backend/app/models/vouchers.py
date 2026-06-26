from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import TimestampMixin


class AccessPlan(TimestampMixin, Base):
    __tablename__ = "hotspot_access_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    plan_name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    download_kbps: Mapped[int] = mapped_column(Integer, nullable=False)
    upload_kbps: Mapped[int] = mapped_column(Integer, nullable=False)
    max_data_mb: Mapped[int | None] = mapped_column(Integer)
    max_duration_minutes: Mapped[int | None] = mapped_column(Integer)
    idle_timeout_minutes: Mapped[int | None] = mapped_column(Integer)
    concurrent_sessions: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    use_for_new_vouchers: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    voucher_type: Mapped[str] = mapped_column(String(32), default="login", nullable=False)
    random_user_id_string_type: Mapped[str] = mapped_column(String(32), default="numeric", nullable=False)
    random_user_id_prefix: Mapped[str] = mapped_column(String(64), default="date_of_month", nullable=False)
    password_type: Mapped[str] = mapped_column(String(32), default="fixed", nullable=False)
    voucher_password: Mapped[str | None] = mapped_column(String(128))
    currency_type: Mapped[str] = mapped_column(String(64), default="INR", nullable=False)
    plan_charge: Mapped[int | None] = mapped_column(Integer)
    login_method: Mapped[str] = mapped_column(String(64), default="default", nullable=False)
    mac_binding: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mobile_registration: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    account_validity_type: Mapped[str] = mapped_column(String(96), default="days_from_first_login", nullable=False)
    account_validity_days: Mapped[int | None] = mapped_column(Integer)
    voucher_validity_days: Mapped[int | None] = mapped_column(Integer)
    upload_limit_mode: Mapped[str] = mapped_column(String(32), default="enforce_limit", nullable=False)
    download_limit_mode: Mapped[str] = mapped_column(String(32), default="enforce_limit", nullable=False)
    delete_inactive_accounts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    max_inactive_days: Mapped[int | None] = mapped_column(Integer)


class VoucherBatch(TimestampMixin, Base):
    __tablename__ = "voucher_batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    batch_name: Mapped[str] = mapped_column(String(128), nullable=False)
    code_prefix: Mapped[str] = mapped_column(String(32), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Voucher(TimestampMixin, Base):
    __tablename__ = "vouchers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    batch_id: Mapped[int] = mapped_column(ForeignKey("voucher_batches.id", ondelete="CASCADE"), nullable=False)
    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    pin: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="available", nullable=False)
    redeemed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    blocked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
