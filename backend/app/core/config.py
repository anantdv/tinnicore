from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "TINNICORE OS"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    database_url: str = "mysql+pymysql://tinnicore:tinnicore@db:3306/tinnicore"
    radius_database_url: str | None = None
    redis_url: str = "redis://redis:6379/0"
    frontend_origin: str = "http://localhost:5173"
    portal_base_url: str = "http://localhost:8609"
    gateway_config_dir: str = "/opt/advgate/config"
    gateway_execute_commands: bool = False
    gateway_command_timeout_seconds: int = 30
    default_admin_username: str = "admin"
    default_admin_password: str = "admin123"
    default_admin_email: str = "admin@example.com"


settings = Settings()
