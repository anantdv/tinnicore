"""Add captive portal server settings."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0014_hotspot_portal_server_settings"
down_revision = "0013_network_dyndns_profiles"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("hotspot_portals", sa.Column("server_settings", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("hotspot_portals", "server_settings")
