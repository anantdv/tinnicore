from __future__ import annotations

from pydantic import BaseModel

from app.schemas.common import Timestamped


class AccessPlanCreate(BaseModel):
    plan_name: str
    download_kbps: int
    upload_kbps: int
    max_data_mb: int | None = None
    max_duration_minutes: int | None = None
    idle_timeout_minutes: int | None = None
    concurrent_sessions: int = 1
    status: str = "active"
    use_for_new_vouchers: bool = True
    voucher_type: str = "login"
    random_user_id_string_type: str = "numeric"
    random_user_id_prefix: str = "date_of_month"
    password_type: str = "fixed"
    voucher_password: str | None = None
    currency_type: str = "INR"
    plan_charge: int | None = None
    login_method: str = "default"
    mac_binding: bool = False
    mobile_registration: bool = False
    account_validity_type: str = "days_from_first_login"
    account_validity_days: int | None = None
    voucher_validity_days: int | None = None
    upload_limit_mode: str = "enforce_limit"
    download_limit_mode: str = "enforce_limit"
    delete_inactive_accounts: bool = True
    max_inactive_days: int | None = None


class AccessPlanUpdate(BaseModel):
    plan_name: str | None = None
    download_kbps: int | None = None
    upload_kbps: int | None = None
    max_data_mb: int | None = None
    max_duration_minutes: int | None = None
    idle_timeout_minutes: int | None = None
    concurrent_sessions: int | None = None
    status: str | None = None
    use_for_new_vouchers: bool | None = None
    voucher_type: str | None = None
    random_user_id_string_type: str | None = None
    random_user_id_prefix: str | None = None
    password_type: str | None = None
    voucher_password: str | None = None
    currency_type: str | None = None
    plan_charge: int | None = None
    login_method: str | None = None
    mac_binding: bool | None = None
    mobile_registration: bool | None = None
    account_validity_type: str | None = None
    account_validity_days: int | None = None
    voucher_validity_days: int | None = None
    upload_limit_mode: str | None = None
    download_limit_mode: str | None = None
    delete_inactive_accounts: bool | None = None
    max_inactive_days: int | None = None


class AccessPlanRead(Timestamped):
    id: int
    plan_name: str
    download_kbps: int
    upload_kbps: int
    max_data_mb: int | None = None
    max_duration_minutes: int | None = None
    idle_timeout_minutes: int | None = None
    concurrent_sessions: int
    status: str
    use_for_new_vouchers: bool
    voucher_type: str
    random_user_id_string_type: str
    random_user_id_prefix: str
    password_type: str
    voucher_password: str | None = None
    currency_type: str
    plan_charge: int | None = None
    login_method: str
    mac_binding: bool
    mobile_registration: bool
    account_validity_type: str
    account_validity_days: int | None = None
    voucher_validity_days: int | None = None
    upload_limit_mode: str
    download_limit_mode: str
    delete_inactive_accounts: bool
    max_inactive_days: int | None = None
