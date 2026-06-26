"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-06-23
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "identity_roles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=64), nullable=False, unique=True),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "identity_permissions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(length=128), nullable=False, unique=True),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "identity_users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=64), nullable=False, unique=True),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "identity_user_roles",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["identity_users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["role_id"], ["identity_roles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "role_id"),
    )
    op.create_table(
        "hotspot_access_plans",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("plan_name", sa.String(length=128), nullable=False, unique=True),
        sa.Column("download_kbps", sa.Integer(), nullable=False),
        sa.Column("upload_kbps", sa.Integer(), nullable=False),
        sa.Column("max_data_mb", sa.Integer(), nullable=True),
        sa.Column("max_duration_minutes", sa.Integer(), nullable=True),
        sa.Column("idle_timeout_minutes", sa.Integer(), nullable=True),
        sa.Column("concurrent_sessions", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "voucher_batches",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("batch_name", sa.String(length=128), nullable=False),
        sa.Column("code_prefix", sa.String(length=32), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "vouchers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("batch_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False, unique=True),
        sa.Column("pin", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="available"),
        sa.Column("redeemed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("blocked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["batch_id"], ["voucher_batches.id"], ondelete="CASCADE"),
    )
    op.create_table(
        "network_interfaces",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=64), nullable=False, unique=True),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("address", sa.String(length=64), nullable=True),
        sa.Column("netmask", sa.String(length=64), nullable=True),
        sa.Column("gateway", sa.String(length=64), nullable=True),
        sa.Column("mtu", sa.Integer(), nullable=True),
        sa.Column("is_up", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "network_vlans",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("interface_id", sa.Integer(), nullable=False),
        sa.Column("vlan_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["interface_id"], ["network_interfaces.id"], ondelete="CASCADE"),
    )
    op.create_table(
        "network_dhcp_scopes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("interface_id", sa.Integer(), nullable=False),
        sa.Column("scope_name", sa.String(length=128), nullable=False),
        sa.Column("start_ip", sa.String(length=64), nullable=False),
        sa.Column("end_ip", sa.String(length=64), nullable=False),
        sa.Column("lease_minutes", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["interface_id"], ["network_interfaces.id"], ondelete="CASCADE"),
    )
    op.create_table(
        "network_dns_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("primary_dns", sa.String(length=64), nullable=False),
        sa.Column("secondary_dns", sa.String(length=64), nullable=True),
        sa.Column("search_domain", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "network_static_routes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("destination", sa.String(length=64), nullable=False),
        sa.Column("gateway", sa.String(length=64), nullable=False),
        sa.Column("interface_name", sa.String(length=64), nullable=True),
        sa.Column("metric", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "network_wan_interfaces",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=64), nullable=False, unique=True),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("weight", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("failover_mode", sa.String(length=32), nullable=False, server_default="auto"),
        sa.Column("load_balancing_mode", sa.String(length=32), nullable=False, server_default="weighted"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="up"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "network_wan_health_status",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("wan_interface_id", sa.Integer(), nullable=False),
        sa.Column("state", sa.String(length=32), nullable=False),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("loss_percent", sa.Integer(), nullable=True),
        sa.Column("checked_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["wan_interface_id"], ["network_wan_interfaces.id"], ondelete="CASCADE"),
    )
    op.create_table(
        "firewall_zones",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=64), nullable=False, unique=True),
        sa.Column("policy", sa.String(length=32), nullable=False, server_default="accept"),
        sa.Column("interfaces", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "firewall_rules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("zone_id", sa.Integer(), nullable=False),
        sa.Column("rule_name", sa.String(length=128), nullable=False),
        sa.Column("action", sa.String(length=32), nullable=False),
        sa.Column("source", sa.String(length=128), nullable=True),
        sa.Column("destination", sa.String(length=128), nullable=True),
        sa.Column("protocol", sa.String(length=32), nullable=True),
        sa.Column("port", sa.String(length=32), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["zone_id"], ["firewall_zones.id"], ondelete="CASCADE"),
    )
    op.create_table(
        "firewall_nat_rules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("source", sa.String(length=128), nullable=True),
        sa.Column("translated_to", sa.String(length=128), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "firewall_port_forwards",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("external_port", sa.String(length=32), nullable=False),
        sa.Column("internal_ip", sa.String(length=64), nullable=False),
        sa.Column("internal_port", sa.String(length=32), nullable=False),
        sa.Column("protocol", sa.String(length=16), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "licensing_licenses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("license_key", sa.String(length=255), nullable=False, unique=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="inactive"),
        sa.Column("activated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "licensing_modules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("license_id", sa.Integer(), nullable=False),
        sa.Column("module_name", sa.String(length=128), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("entitlements", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["license_id"], ["licensing_licenses.id"], ondelete="CASCADE"),
    )
    op.create_table(
        "firmware_versions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("version", sa.String(length=64), nullable=False, unique=True),
        sa.Column("release_notes", sa.Text(), nullable=True),
        sa.Column("is_current", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_available", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "firmware_update_jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("firmware_version_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="queued"),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["firmware_version_id"], ["firmware_versions.id"], ondelete="CASCADE"),
    )
    op.create_table(
        "telemetry_samples",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("sample_type", sa.String(length=64), nullable=False),
        sa.Column("scope", sa.String(length=128), nullable=True),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(length=32), nullable=True),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "telemetry_alerts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("severity", sa.String(length=32), nullable=False),
        sa.Column("message", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="open"),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actor", sa.String(length=128), nullable=True),
        sa.Column("action", sa.String(length=128), nullable=False),
        sa.Column("resource_type", sa.String(length=128), nullable=True),
        sa.Column("resource_id", sa.String(length=128), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "system_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_type", sa.String(length=128), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "hotspot_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("plan_id", sa.Integer(), nullable=True),
        sa.Column("session_token", sa.String(length=255), nullable=False, unique=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("mac_address", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("bytes_up", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("bytes_down", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["identity_users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["plan_id"], ["hotspot_access_plans.id"], ondelete="SET NULL"),
    )


def downgrade() -> None:
    for table in [
        "hotspot_sessions",
        "system_events",
        "audit_logs",
        "telemetry_alerts",
        "telemetry_samples",
        "firmware_update_jobs",
        "firmware_versions",
        "licensing_modules",
        "licensing_licenses",
        "firewall_port_forwards",
        "firewall_nat_rules",
        "firewall_rules",
        "firewall_zones",
        "network_wan_health_status",
        "network_wan_interfaces",
        "network_static_routes",
        "network_dns_settings",
        "network_dhcp_scopes",
        "network_vlans",
        "network_interfaces",
        "vouchers",
        "voucher_batches",
        "hotspot_access_plans",
        "identity_user_roles",
        "identity_users",
        "identity_permissions",
        "identity_roles",
    ]:
        op.drop_table(table)
