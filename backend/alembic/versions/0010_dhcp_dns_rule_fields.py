"""add dhcp and dns management fields

Revision ID: 0010_dhcp_dns_rule_fields
Revises: 0009_port_forward_rule_fields
Create Date: 2026-06-26
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0010_dhcp_dns_rule_fields"
down_revision = "0009_port_forward_rule_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("network_dhcp_scopes", sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("network_dhcp_scopes", sa.Column("subnet_mask", sa.String(length=64), nullable=True))
    op.add_column("network_dhcp_scopes", sa.Column("gateway", sa.String(length=64), nullable=True))
    op.add_column("network_dhcp_scopes", sa.Column("dns_primary", sa.String(length=64), nullable=True))
    op.add_column("network_dhcp_scopes", sa.Column("dns_secondary", sa.String(length=64), nullable=True))
    op.add_column("network_dhcp_scopes", sa.Column("domain_name", sa.String(length=128), nullable=True))
    op.add_column("network_dhcp_scopes", sa.Column("options", sa.JSON(), nullable=True))
    op.add_column("network_dns_settings", sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("network_dns_settings", sa.Column("resolver_name", sa.String(length=128), nullable=False, server_default="default"))
    op.add_column("network_dns_settings", sa.Column("cache_size", sa.Integer(), nullable=False, server_default="1000"))
    op.add_column("network_dns_settings", sa.Column("local_ttl", sa.Integer(), nullable=False, server_default="300"))


def downgrade() -> None:
    op.drop_column("network_dns_settings", "local_ttl")
    op.drop_column("network_dns_settings", "cache_size")
    op.drop_column("network_dns_settings", "resolver_name")
    op.drop_column("network_dns_settings", "enabled")
    op.drop_column("network_dhcp_scopes", "options")
    op.drop_column("network_dhcp_scopes", "domain_name")
    op.drop_column("network_dhcp_scopes", "dns_secondary")
    op.drop_column("network_dhcp_scopes", "dns_primary")
    op.drop_column("network_dhcp_scopes", "gateway")
    op.drop_column("network_dhcp_scopes", "subnet_mask")
    op.drop_column("network_dhcp_scopes", "enabled")
