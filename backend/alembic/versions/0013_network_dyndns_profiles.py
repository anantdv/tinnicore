"""Add network dynamic DNS profiles."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0013_network_dyndns_profiles"
down_revision = "0012_access_plan_reference_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "network_dyndns_profiles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("profile_name", sa.String(length=128), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("provider", sa.String(length=64), nullable=False, server_default="custom"),
        sa.Column("protocol", sa.String(length=64), nullable=False, server_default="dyndns2"),
        sa.Column("server", sa.String(length=255), nullable=True),
        sa.Column("hostnames", sa.String(length=512), nullable=False),
        sa.Column("username", sa.String(length=255), nullable=False),
        sa.Column("password", sa.String(length=255), nullable=False),
        sa.Column("interface_name", sa.String(length=64), nullable=True),
        sa.Column("use_ssl", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("check_url", sa.String(length=255), nullable=True),
        sa.Column("update_interval_minutes", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("force_update_days", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("network_dyndns_profiles")
