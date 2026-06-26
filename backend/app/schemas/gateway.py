from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import Timestamped


class GatewayApplyRequest(BaseModel):
    dry_run: bool = True
    execute: bool = False


class RenderedConfigRead(BaseModel):
    path: str
    content: str
    description: str


class CommandStepRead(BaseModel):
    command: str
    description: str


class FileWriteRead(BaseModel):
    path: str
    bytes_written: int


class CommandExecutionRead(BaseModel):
    command: str
    returncode: int
    stdout: str
    stderr: str


class GatewayApplyResult(BaseModel):
    job_id: int
    component: str
    status: str
    dry_run: bool
    rendered_configs: list[RenderedConfigRead] = Field(default_factory=list)
    commands: list[CommandStepRead] = Field(default_factory=list)
    file_writes: list[FileWriteRead] = Field(default_factory=list)
    command_results: list[CommandExecutionRead] = Field(default_factory=list)
    executed: bool = False
    message: str


class GatewayApplyJobRead(Timestamped):
    id: int
    component: str
    status: str
    dry_run: bool
    requested_by_user_id: int | None = None
    rendered_configs: dict | None = None
    command_plan: list | None = None
    error_message: str | None = None


class HotspotLoginRequest(BaseModel):
    method: Literal["user", "voucher"]
    username: str | None = None
    password: str | None = None
    voucher_code: str | None = None
    pin: str | None = None
    client_ip: str | None = None
    client_mac: str | None = None
    nas_ip: str | None = None


class HotspotLoginResponse(BaseModel):
    accepted: bool
    method: str
    message: str
    username: str | None = None
    plan_name: str | None = None
    session_token: str | None = None
    voucher_code: str | None = None
    attempt_id: int | None = None


class HotspotPortalCreate(BaseModel):
    portal_name: str
    portal_host: str
    landing_path: str = "/login"
    success_path: str = "/status"
    allowed_hosts: list[str] = Field(default_factory=list)
    welcome_message: str | None = None
    builder_config: dict | None = None
    server_settings: dict | None = None
    is_active: bool = True


class HotspotPortalUpdate(BaseModel):
    portal_name: str | None = None
    portal_host: str | None = None
    landing_path: str | None = None
    success_path: str | None = None
    allowed_hosts: list[str] | None = None
    welcome_message: str | None = None
    builder_config: dict | None = None
    server_settings: dict | None = None
    is_active: bool | None = None


class HotspotPortalRead(Timestamped):
    id: int
    portal_name: str
    portal_host: str
    landing_path: str
    success_path: str
    allowed_hosts: list[str]
    welcome_message: str | None = None
    builder_config: dict | None = None
    server_settings: dict | None = None
    is_active: bool


class RadiusProfileCreate(BaseModel):
    access_plan_id: int
    profile_name: str
    radius_group_name: str
    reply_attributes: dict | None = None
    is_default: bool = False


class RadiusProfileUpdate(BaseModel):
    access_plan_id: int | None = None
    profile_name: str | None = None
    radius_group_name: str | None = None
    reply_attributes: dict | None = None
    is_default: bool | None = None


class RadiusProfileRead(Timestamped):
    id: int
    access_plan_id: int
    profile_name: str
    radius_group_name: str
    reply_attributes: dict | None = None
    is_default: bool


class RadiusNasDeviceCreate(BaseModel):
    name: str
    ip_address: str
    secret: str
    short_name: str | None = None
    enabled: bool = True


class RadiusNasDeviceUpdate(BaseModel):
    name: str | None = None
    ip_address: str | None = None
    secret: str | None = None
    short_name: str | None = None
    enabled: bool | None = None


class RadiusNasDeviceRead(Timestamped):
    id: int
    name: str
    ip_address: str
    secret: str
    short_name: str | None = None
    enabled: bool


class RadiusAuthAttemptRead(Timestamped):
    id: int
    username: str
    auth_method: str
    result: str
    reason: str | None = None
    client_ip: str | None = None
    client_mac: str | None = None
    nas_ip: str | None = None
    voucher_code: str | None = None
    plan_name: str | None = None
    session_token: str | None = None
