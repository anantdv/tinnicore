"""Add reference usage plan fields."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0012_access_plan_reference_fields"
down_revision = "0011_hotspot_portal_builder_config"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("hotspot_access_plans", sa.Column("use_for_new_vouchers", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("hotspot_access_plans", sa.Column("voucher_type", sa.String(length=32), nullable=False, server_default="login"))
    op.add_column("hotspot_access_plans", sa.Column("random_user_id_string_type", sa.String(length=32), nullable=False, server_default="numeric"))
    op.add_column("hotspot_access_plans", sa.Column("random_user_id_prefix", sa.String(length=64), nullable=False, server_default="date_of_month"))
    op.add_column("hotspot_access_plans", sa.Column("password_type", sa.String(length=32), nullable=False, server_default="fixed"))
    op.add_column("hotspot_access_plans", sa.Column("voucher_password", sa.String(length=128), nullable=True))
    op.add_column("hotspot_access_plans", sa.Column("currency_type", sa.String(length=64), nullable=False, server_default="INR"))
    op.add_column("hotspot_access_plans", sa.Column("plan_charge", sa.Integer(), nullable=True))
    op.add_column("hotspot_access_plans", sa.Column("login_method", sa.String(length=64), nullable=False, server_default="default"))
    op.add_column("hotspot_access_plans", sa.Column("mac_binding", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("hotspot_access_plans", sa.Column("mobile_registration", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("hotspot_access_plans", sa.Column("account_validity_type", sa.String(length=96), nullable=False, server_default="days_from_first_login"))
    op.add_column("hotspot_access_plans", sa.Column("account_validity_days", sa.Integer(), nullable=True))
    op.add_column("hotspot_access_plans", sa.Column("voucher_validity_days", sa.Integer(), nullable=True))
    op.add_column("hotspot_access_plans", sa.Column("upload_limit_mode", sa.String(length=32), nullable=False, server_default="enforce_limit"))
    op.add_column("hotspot_access_plans", sa.Column("download_limit_mode", sa.String(length=32), nullable=False, server_default="enforce_limit"))
    op.add_column("hotspot_access_plans", sa.Column("delete_inactive_accounts", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("hotspot_access_plans", sa.Column("max_inactive_days", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("hotspot_access_plans", "max_inactive_days")
    op.drop_column("hotspot_access_plans", "delete_inactive_accounts")
    op.drop_column("hotspot_access_plans", "download_limit_mode")
    op.drop_column("hotspot_access_plans", "upload_limit_mode")
    op.drop_column("hotspot_access_plans", "voucher_validity_days")
    op.drop_column("hotspot_access_plans", "account_validity_days")
    op.drop_column("hotspot_access_plans", "account_validity_type")
    op.drop_column("hotspot_access_plans", "mobile_registration")
    op.drop_column("hotspot_access_plans", "mac_binding")
    op.drop_column("hotspot_access_plans", "login_method")
    op.drop_column("hotspot_access_plans", "plan_charge")
    op.drop_column("hotspot_access_plans", "currency_type")
    op.drop_column("hotspot_access_plans", "voucher_password")
    op.drop_column("hotspot_access_plans", "password_type")
    op.drop_column("hotspot_access_plans", "random_user_id_prefix")
    op.drop_column("hotspot_access_plans", "random_user_id_string_type")
    op.drop_column("hotspot_access_plans", "voucher_type")
    op.drop_column("hotspot_access_plans", "use_for_new_vouchers")
