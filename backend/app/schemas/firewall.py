from __future__ import annotations

from pydantic import BaseModel, Field


class FirewallZoneCreate(BaseModel):
    name: str
    policy: str = "accept"
    interfaces: list[str] = Field(default_factory=list)


class FirewallZoneUpdate(BaseModel):
    name: str | None = None
    policy: str | None = None
    interfaces: list[str] | None = None


class FirewallRuleCreate(BaseModel):
    zone_id: int
    rule_name: str
    action: str
    source: str | None = None
    destination: str | None = None
    protocol: str | None = None
    port: str | None = None
    enabled: bool = True


class FirewallRuleUpdate(BaseModel):
    zone_id: int | None = None
    rule_name: str | None = None
    action: str | None = None
    source: str | None = None
    destination: str | None = None
    protocol: str | None = None
    port: str | None = None
    enabled: bool | None = None
