"""gateway hotspot radius scaffold

Revision ID: 0003_gateway_hotspot_radius_scaffold
Revises: 0002_add_user_current_plan
Create Date: 2026-06-24
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0003_gateway_hotspot_radius_scaffold"
down_revision = "0002_add_user_current_plan"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "hotspot_portals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("portal_name", sa.String(length=128), nullable=False, unique=True),
        sa.Column("portal_host", sa.String(length=255), nullable=False),
        sa.Column("landing_path", sa.String(length=128), nullable=False, server_default="/login"),
        sa.Column("success_path", sa.String(length=128), nullable=False, server_default="/status"),
        sa.Column("allowed_hosts", sa.JSON(), nullable=False),
        sa.Column("welcome_message", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "radius_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("access_plan_id", sa.Integer(), nullable=False, unique=True),
        sa.Column("profile_name", sa.String(length=128), nullable=False, unique=True),
        sa.Column("radius_group_name", sa.String(length=128), nullable=False),
        sa.Column("reply_attributes", sa.JSON(), nullable=True),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["access_plan_id"], ["hotspot_access_plans.id"], ondelete="CASCADE"),
    )
    op.create_table(
        "radius_nas_devices",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=128), nullable=False, unique=True),
        sa.Column("ip_address", sa.String(length=64), nullable=False),
        sa.Column("secret", sa.String(length=255), nullable=False),
        sa.Column("short_name", sa.String(length=64), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "radius_auth_attempts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=128), nullable=False),
        sa.Column("auth_method", sa.String(length=32), nullable=False),
        sa.Column("result", sa.String(length=32), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("client_ip", sa.String(length=64), nullable=True),
        sa.Column("client_mac", sa.String(length=64), nullable=True),
        sa.Column("nas_ip", sa.String(length=64), nullable=True),
        sa.Column("voucher_code", sa.String(length=64), nullable=True),
        sa.Column("plan_name", sa.String(length=128), nullable=True),
        sa.Column("session_token", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "gateway_apply_jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("component", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="queued"),
        sa.Column("dry_run", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("requested_by_user_id", sa.Integer(), nullable=True),
        sa.Column("rendered_configs", sa.JSON(), nullable=True),
        sa.Column("command_plan", sa.JSON(), nullable=True),
        sa.Column("error_message", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["identity_users.id"], ondelete="SET NULL"),
    )


def downgrade() -> None:
    op.drop_table("gateway_apply_jobs")
    op.drop_table("radius_auth_attempts")
    op.drop_table("radius_nas_devices")
    op.drop_table("radius_profiles")
    op.drop_table("hotspot_portals")
