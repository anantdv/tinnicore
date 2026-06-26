"""add timestamp columns to hotspot sessions

Revision ID: 0004_add_hotspot_session_timestamps
Revises: 0003_gateway_hotspot_radius_scaffold
Create Date: 2026-06-24
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0004_add_hotspot_session_timestamps"
down_revision = "0003_gateway_hotspot_radius_scaffold"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "hotspot_sessions",
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.add_column(
        "hotspot_sessions",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )


def downgrade() -> None:
    op.drop_column("hotspot_sessions", "updated_at")
    op.drop_column("hotspot_sessions", "created_at")
