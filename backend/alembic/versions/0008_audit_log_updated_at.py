"""add audit log updated_at

Revision ID: 0008_audit_log_updated_at
Revises: 0007_firewall_filter_rule_fields
Create Date: 2026-06-25
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0008_audit_log_updated_at"
down_revision = "0007_firewall_filter_rule_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "audit_logs",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )


def downgrade() -> None:
    op.drop_column("audit_logs", "updated_at")
