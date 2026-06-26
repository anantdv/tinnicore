"""add firewall filter rule fields

Revision ID: 0007_firewall_filter_rule_fields
Revises: 0006_static_route_rule_fields
Create Date: 2026-06-25
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0007_firewall_filter_rule_fields"
down_revision = "0006_static_route_rule_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("firewall_rules", sa.Column("destination_zone_id", sa.Integer(), nullable=True))
    op.add_column("firewall_rules", sa.Column("time_restriction", sa.String(length=64), nullable=False, server_default="disable"))
    op.add_column("firewall_rules", sa.Column("connections_per_second", sa.String(length=64), nullable=False, server_default="no_limit"))
    op.add_column("firewall_rules", sa.Column("source_mac", sa.String(length=128), nullable=True))
    op.add_column("firewall_rules", sa.Column("exclude_source", sa.String(length=128), nullable=True))
    op.add_column("firewall_rules", sa.Column("exclude_source_mac", sa.String(length=128), nullable=True))
    op.add_column("firewall_rules", sa.Column("source_interface", sa.String(length=64), nullable=True))
    op.add_column("firewall_rules", sa.Column("exclude_destination", sa.String(length=128), nullable=True))
    op.add_column("firewall_rules", sa.Column("destination_interface", sa.String(length=64), nullable=True))
    op.add_column("firewall_rules", sa.Column("log", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("firewall_rules", sa.Column("comment", sa.String(length=255), nullable=True))
    op.create_foreign_key(
        "fk_firewall_rules_destination_zone_id_firewall_zones",
        "firewall_rules",
        "firewall_zones",
        ["destination_zone_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_firewall_rules_destination_zone_id_firewall_zones", "firewall_rules", type_="foreignkey")
    op.drop_column("firewall_rules", "comment")
    op.drop_column("firewall_rules", "log")
    op.drop_column("firewall_rules", "destination_interface")
    op.drop_column("firewall_rules", "exclude_destination")
    op.drop_column("firewall_rules", "source_interface")
    op.drop_column("firewall_rules", "exclude_source_mac")
    op.drop_column("firewall_rules", "exclude_source")
    op.drop_column("firewall_rules", "source_mac")
    op.drop_column("firewall_rules", "connections_per_second")
    op.drop_column("firewall_rules", "time_restriction")
    op.drop_column("firewall_rules", "destination_zone_id")
