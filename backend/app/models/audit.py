from __future__ import annotations

from sqlalchemy import Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import TimestampMixin


class AuditLog(TimestampMixin, Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor: Mapped[str | None] = mapped_column(String(128))
    action: Mapped[str] = mapped_column(String(128), nullable=False)
    resource_type: Mapped[str | None] = mapped_column(String(128))
    resource_id: Mapped[str | None] = mapped_column(String(128))
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON)
