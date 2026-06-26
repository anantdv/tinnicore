"""add network interface configuration fields

Revision ID: 0005_network_interface_configuration
Revises: 0004_add_hotspot_session_timestamps
Create Date: 2026-06-25
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0005_network_interface_configuration"
down_revision = "0004_add_hotspot_session_timestamps"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("network_interfaces", sa.Column("role", sa.String(length=32), nullable=False, server_default="unassigned"))
    op.add_column("network_interfaces", sa.Column("ip_mode", sa.String(length=32), nullable=False, server_default="dhcp"))
    op.add_column("network_interfaces", sa.Column("description", sa.String(length=128), nullable=True))
    op.add_column("network_interfaces", sa.Column("mac_address", sa.String(length=64), nullable=True))
    op.add_column("network_interfaces", sa.Column("settings", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("network_interfaces", "settings")
    op.drop_column("network_interfaces", "mac_address")
    op.drop_column("network_interfaces", "description")
    op.drop_column("network_interfaces", "ip_mode")
    op.drop_column("network_interfaces", "role")
