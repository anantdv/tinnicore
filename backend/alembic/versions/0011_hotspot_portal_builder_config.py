"""Add captive portal builder config."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0011_hotspot_portal_builder_config"
down_revision = "0010_dhcp_dns_rule_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("hotspot_portals", sa.Column("builder_config", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("hotspot_portals", "builder_config")
