"""add port forward rule fields

Revision ID: 0009_port_forward_rule_fields
Revises: 0008_audit_log_updated_at
Create Date: 2026-06-25
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0009_port_forward_rule_fields"
down_revision = "0008_audit_log_updated_at"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("firewall_port_forwards", sa.Column("action", sa.String(length=32), nullable=False, server_default="forward"))
    op.add_column("firewall_port_forwards", sa.Column("time_restriction", sa.String(length=64), nullable=False, server_default="disable"))
    op.add_column("firewall_port_forwards", sa.Column("connections_per_second", sa.String(length=64), nullable=False, server_default="no_limit"))
    op.add_column("firewall_port_forwards", sa.Column("incoming_zone", sa.String(length=64), nullable=True))
    op.add_column("firewall_port_forwards", sa.Column("original_destination", sa.String(length=128), nullable=True))
    op.add_column("firewall_port_forwards", sa.Column("exclude_original_destination", sa.String(length=128), nullable=True))
    op.add_column("firewall_port_forwards", sa.Column("forward_zone", sa.String(length=64), nullable=True))
    op.add_column("firewall_port_forwards", sa.Column("server_type", sa.String(length=64), nullable=False, server_default="single_server"))
    op.add_column("firewall_port_forwards", sa.Column("forward_port_mode", sa.String(length=64), nullable=False, server_default="original_port"))
    op.add_column("firewall_port_forwards", sa.Column("hairpin_snat_interface", sa.String(length=64), nullable=True))
    op.add_column("firewall_port_forwards", sa.Column("source_address", sa.String(length=128), nullable=True))
    op.add_column("firewall_port_forwards", sa.Column("exclude_source_address", sa.String(length=128), nullable=True))
    op.add_column("firewall_port_forwards", sa.Column("source_ports", sa.String(length=128), nullable=True))
    op.add_column("firewall_port_forwards", sa.Column("source_interface", sa.String(length=64), nullable=True))
    op.add_column("firewall_port_forwards", sa.Column("log", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("firewall_port_forwards", sa.Column("comment", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("firewall_port_forwards", "comment")
    op.drop_column("firewall_port_forwards", "log")
    op.drop_column("firewall_port_forwards", "source_interface")
    op.drop_column("firewall_port_forwards", "source_ports")
    op.drop_column("firewall_port_forwards", "exclude_source_address")
    op.drop_column("firewall_port_forwards", "source_address")
    op.drop_column("firewall_port_forwards", "hairpin_snat_interface")
    op.drop_column("firewall_port_forwards", "forward_port_mode")
    op.drop_column("firewall_port_forwards", "server_type")
    op.drop_column("firewall_port_forwards", "forward_zone")
    op.drop_column("firewall_port_forwards", "exclude_original_destination")
    op.drop_column("firewall_port_forwards", "original_destination")
    op.drop_column("firewall_port_forwards", "incoming_zone")
    op.drop_column("firewall_port_forwards", "connections_per_second")
    op.drop_column("firewall_port_forwards", "time_restriction")
    op.drop_column("firewall_port_forwards", "action")
