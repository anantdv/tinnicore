"""add static route rule fields

Revision ID: 0006_static_route_rule_fields
Revises: 0005_network_interface_configuration
Create Date: 2026-06-25
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0006_static_route_rule_fields"
down_revision = "0005_network_interface_configuration"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("network_static_routes", sa.Column("rule_name", sa.String(length=128), nullable=False, server_default="Static Route"))
    op.add_column("network_static_routes", sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("network_static_routes", sa.Column("dest_type", sa.String(length=32), nullable=False, server_default="network"))
    op.add_column("network_static_routes", sa.Column("subnetmask", sa.String(length=64), nullable=True))
    op.add_column("network_static_routes", sa.Column("route_type", sa.String(length=32), nullable=False, server_default="gateway"))
    op.add_column("network_static_routes", sa.Column("floating", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column("network_static_routes", "floating")
    op.drop_column("network_static_routes", "route_type")
    op.drop_column("network_static_routes", "subnetmask")
    op.drop_column("network_static_routes", "dest_type")
    op.drop_column("network_static_routes", "enabled")
    op.drop_column("network_static_routes", "rule_name")
