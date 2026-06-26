from __future__ import annotations

from sqlalchemy import Boolean, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import TimestampMixin


class GatewayApplyJob(TimestampMixin, Base):
    __tablename__ = "gateway_apply_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    component: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="queued", nullable=False)
    dry_run: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    requested_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("identity_users.id", ondelete="SET NULL"))
    rendered_configs: Mapped[dict | None] = mapped_column(JSON)
    command_plan: Mapped[list | None] = mapped_column(JSON)
    error_message: Mapped[str | None] = mapped_column(String(255))

