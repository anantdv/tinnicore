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
    destination_zone_id: int | None = None
    rule_name: str
    action: str
    time_restriction: str = "disable"
    connections_per_second: str = "no_limit"
    source: str | None = None
    source_mac: str | None = None
    exclude_source: str | None = None
    exclude_source_mac: str | None = None
    source_interface: str | None = None
    destination: str | None = None
    exclude_destination: str | None = None
    destination_interface: str | None = None
    protocol: str | None = None
    port: str | None = None
    log: bool = False
    comment: str | None = None
    enabled: bool = True


class FirewallRuleUpdate(BaseModel):
    zone_id: int | None = None
    destination_zone_id: int | None = None
    rule_name: str | None = None
    action: str | None = None
    time_restriction: str | None = None
    connections_per_second: str | None = None
    source: str | None = None
    source_mac: str | None = None
    exclude_source: str | None = None
    exclude_source_mac: str | None = None
    source_interface: str | None = None
    destination: str | None = None
    exclude_destination: str | None = None
    destination_interface: str | None = None
    protocol: str | None = None
    port: str | None = None
    log: bool | None = None
    comment: str | None = None
    enabled: bool | None = None


class FirewallPortForwardCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    action: str = "forward"
    time_restriction: str = "disable"
    connections_per_second: str = "no_limit"
    incoming_zone: str | None = None
    external_port: str = Field(min_length=1, max_length=32)
    original_destination: str | None = None
    exclude_original_destination: str | None = None
    forward_zone: str | None = None
    server_type: str = "single_server"
    internal_ip: str = Field(min_length=1, max_length=64)
    internal_port: str = Field(default="", max_length=32)
    forward_port_mode: str = "original_port"
    hairpin_snat_interface: str | None = None
    source_address: str | None = None
    exclude_source_address: str | None = None
    source_ports: str | None = None
    source_interface: str | None = None
    protocol: str = "tcp"
    log: bool = False
    comment: str | None = None
    enabled: bool = True


class FirewallPortForwardUpdate(BaseModel):
    name: str | None = None
    action: str | None = None
    time_restriction: str | None = None
    connections_per_second: str | None = None
    incoming_zone: str | None = None
    external_port: str | None = None
    original_destination: str | None = None
    exclude_original_destination: str | None = None
    forward_zone: str | None = None
    server_type: str | None = None
    internal_ip: str | None = None
    internal_port: str | None = None
    forward_port_mode: str | None = None
    hairpin_snat_interface: str | None = None
    source_address: str | None = None
    exclude_source_address: str | None = None
    source_ports: str | None = None
    source_interface: str | None = None
    protocol: str | None = None
    log: bool | None = None
    comment: str | None = None
    enabled: bool | None = None
