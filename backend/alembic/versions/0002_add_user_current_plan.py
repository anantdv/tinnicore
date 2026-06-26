"""add user current plan

Revision ID: 0002_add_user_current_plan
Revises: 0001_initial_schema
Create Date: 2026-06-24
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0002_add_user_current_plan"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "identity_users",
        sa.Column("current_plan_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_identity_users_current_plan_id_hotspot_access_plans",
        "identity_users",
        "hotspot_access_plans",
        ["current_plan_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_identity_users_current_plan_id_hotspot_access_plans",
        "identity_users",
        type_="foreignkey",
    )
    op.drop_column("identity_users", "current_plan_id")
