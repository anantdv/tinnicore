from __future__ import annotations

import json
import subprocess
from ipaddress import ip_interface

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.auth import User
from app.models.network import DhcpScope, DnsSetting, DynamicDnsProfile, NetworkInterface, StaticRoute, Vlan
from app.schemas.gateway import GatewayApplyRequest, GatewayApplyResult
from app.services.gateway import GatewayService
from dataclasses import asdict

router = APIRouter()


DEFAULT_INTERFACE_SETTINGS = {
    "vlan_mode": "disable",
    "port_speed": "default",
    "mac_address_clone": "disable",
    "link_priority": 1,
    "nat": "enable",
    "load_balance_membership": "exclude",
    "proxy_arp": "disable",
    "hairpin_routing": "block",
    "vpn_traffic": "allow_always",
    "link_failure_detection": "ping_gateway_ip",
    "maximum_upload_bandwidth": "no_limit",
    "maximum_download_bandwidth": "no_limit",
    "billing_day_of_month": 1,
    "data_transfer_quota": "unlimited",
    "additional_ip_addresses": "disable",
}


class NetworkInterfaceUpdate(BaseModel):
    role: str = Field(pattern="^(wan|lan|unassigned)$")
    ip_mode: str = Field(pattern="^(dhcp|static)$")
    description: str | None = None
    address: str | None = None
    netmask: str | None = None
    gateway: str | None = None
    mtu: int | None = Field(default=None, ge=576, le=9216)
    settings: dict = Field(default_factory=dict)


class StaticRoutePayload(BaseModel):
    rule_name: str = Field(min_length=1, max_length=128)
    enabled: bool = True
    dest_type: str = Field(default="network", pattern="^(network|host|default)$")
    destination: str = Field(min_length=1, max_length=64)
    subnetmask: str | None = Field(default=None, max_length=64)
    metric: int = Field(default=1, ge=1, le=9999)
    route_type: str = Field(default="gateway", pattern="^(gateway|interface|blackhole)$")
    gateway: str | None = Field(default=None, max_length=64)
    interface_name: str | None = Field(default=None, max_length=64)
    floating: bool = False


class DhcpScopePayload(BaseModel):
    interface_id: int
    scope_name: str = Field(min_length=1, max_length=128)
    enabled: bool = True
    start_ip: str = Field(min_length=1, max_length=64)
    end_ip: str = Field(min_length=1, max_length=64)
    subnet_mask: str | None = Field(default=None, max_length=64)
    gateway: str | None = Field(default=None, max_length=64)
    dns_primary: str | None = Field(default=None, max_length=64)
    dns_secondary: str | None = Field(default=None, max_length=64)
    domain_name: str | None = Field(default=None, max_length=128)
    lease_minutes: int = Field(default=720, ge=5, le=10080)
    options: dict = Field(default_factory=dict)


class DnsSettingPayload(BaseModel):
    enabled: bool = True
    resolver_name: str = Field(default="default", min_length=1, max_length=128)
    primary_dns: str = Field(min_length=1, max_length=64)
    secondary_dns: str | None = Field(default=None, max_length=64)
    search_domain: str | None = Field(default=None, max_length=128)
    cache_size: int = Field(default=1000, ge=0, le=100000)
    local_ttl: int = Field(default=300, ge=0, le=86400)


class DynamicDnsPayload(BaseModel):
    profile_name: str = Field(min_length=1, max_length=128)
    enabled: bool = True
    provider: str = Field(default="custom", max_length=64)
    protocol: str = Field(default="dyndns2", max_length=64)
    server: str | None = Field(default=None, max_length=255)
    hostnames: str = Field(min_length=1, max_length=512)
    username: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=255)
    interface_name: str | None = Field(default=None, max_length=64)
    use_ssl: bool = True
    check_url: str | None = Field(default=None, max_length=255)
    update_interval_minutes: int = Field(default=5, ge=1, le=1440)
    force_update_days: int | None = Field(default=None, ge=1, le=365)
    status: str = Field(default="active", pattern="^(active|disabled|draft)$")


def _live_interfaces() -> dict[str, dict]:
    links: dict[str, dict] = {}
    try:
        link_result = subprocess.run(["ip", "-j", "link"], capture_output=True, text=True, check=False)
        addr_result = subprocess.run(["ip", "-j", "addr"], capture_output=True, text=True, check=False)
    except FileNotFoundError:
        return links

    if link_result.returncode != 0 or addr_result.returncode != 0:
        return links

    for item in json.loads(link_result.stdout or "[]"):
        name = item.get("ifname")
        if not name or name == "lo":
            continue
        links[name] = {
            "name": name,
            "kind": item.get("link_type") or "ethernet",
            "mac_address": item.get("address"),
            "mtu": item.get("mtu"),
            "is_up": "UP" in (item.get("flags") or []),
            "addresses": [],
        }

    for item in json.loads(addr_result.stdout or "[]"):
        name = item.get("ifname")
        if name not in links:
            continue
        for addr in item.get("addr_info") or []:
            if addr.get("family") != "inet":
                continue
            prefix = addr.get("prefixlen")
            local = addr.get("local")
            if not local or prefix is None:
                continue
            try:
                parsed = ip_interface(f"{local}/{prefix}")
                links[name]["addresses"].append(
                    {
                        "address": local,
                        "prefixlen": prefix,
                        "netmask": str(parsed.network.netmask),
                    }
                )
            except ValueError:
                links[name]["addresses"].append({"address": local, "prefixlen": prefix, "netmask": None})
    return links


def _interface_dict(item: NetworkInterface, live: dict | None = None) -> dict:
    live = live or {}
    settings = {**DEFAULT_INTERFACE_SETTINGS, **(item.settings or {})}
    live_addresses = live.get("addresses") or []
    primary_live_address = live_addresses[0] if live_addresses else {}
    return {
        "id": item.id,
        "name": item.name,
        "kind": item.kind,
        "role": item.role,
        "ip_mode": item.ip_mode,
        "description": item.description,
        "address": item.address or primary_live_address.get("address"),
        "netmask": item.netmask or primary_live_address.get("netmask"),
        "gateway": item.gateway,
        "mtu": item.mtu or live.get("mtu"),
        "mac_address": item.mac_address or live.get("mac_address"),
        "is_up": live.get("is_up", item.is_up),
        "live_addresses": live_addresses,
        "settings": settings,
    }


def _static_route_dict(item: StaticRoute) -> dict:
    return {
        "id": item.id,
        "rule_name": item.rule_name,
        "enabled": item.enabled,
        "dest_type": item.dest_type,
        "destination": item.destination,
        "subnetmask": item.subnetmask,
        "metric": item.metric,
        "route_type": item.route_type,
        "gateway": item.gateway,
        "interface_name": item.interface_name,
        "floating": item.floating,
    }


def _dhcp_scope_dict(item: DhcpScope) -> dict:
    return {
        "id": item.id,
        "interface_id": item.interface_id,
        "scope_name": item.scope_name,
        "enabled": item.enabled,
        "start_ip": item.start_ip,
        "end_ip": item.end_ip,
        "subnet_mask": item.subnet_mask,
        "gateway": item.gateway,
        "dns_primary": item.dns_primary,
        "dns_secondary": item.dns_secondary,
        "domain_name": item.domain_name,
        "lease_minutes": item.lease_minutes,
        "options": item.options or {},
    }


def _dns_setting_dict(item: DnsSetting) -> dict:
    return {
        "id": item.id,
        "enabled": item.enabled,
        "resolver_name": item.resolver_name,
        "primary_dns": item.primary_dns,
        "secondary_dns": item.secondary_dns,
        "search_domain": item.search_domain,
        "cache_size": item.cache_size,
        "local_ttl": item.local_ttl,
    }


def _dyndns_profile_dict(item: DynamicDnsProfile) -> dict:
    return {
        "id": item.id,
        "profile_name": item.profile_name,
        "enabled": item.enabled,
        "provider": item.provider,
        "protocol": item.protocol,
        "server": item.server,
        "hostnames": item.hostnames,
        "username": item.username,
        "password": item.password,
        "interface_name": item.interface_name,
        "use_ssl": item.use_ssl,
        "check_url": item.check_url,
        "update_interval_minutes": item.update_interval_minutes,
        "force_update_days": item.force_update_days,
        "status": item.status,
    }


def _apply_static_route_payload(item: StaticRoute, payload: StaticRoutePayload) -> None:
    data = payload.model_dump()
    data["gateway"] = data["gateway"] or ""
    for key, value in data.items():
        setattr(item, key, value)


def _ensure_interface(db: Session, interface_id: int) -> NetworkInterface:
    item = db.query(NetworkInterface).filter(NetworkInterface.id == interface_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Interface not found")
    return item


@router.get("/interfaces")
def interfaces(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    live = _live_interfaces()
    db_items = {item.name: item for item in db.query(NetworkInterface).all()}
    for name, live_item in live.items():
        if name in db_items:
            continue
        interface = NetworkInterface(
            name=name,
            kind=live_item.get("kind") or "ethernet",
            role="unassigned",
            ip_mode="dhcp",
            address=None,
            netmask=None,
            gateway=None,
            mtu=live_item.get("mtu"),
            mac_address=live_item.get("mac_address"),
            settings=DEFAULT_INTERFACE_SETTINGS.copy(),
            is_up=bool(live_item.get("is_up")),
        )
        db.add(interface)
        db_items[name] = interface
    if live:
        db.commit()
    return [_interface_dict(item, live.get(item.name)) for item in sorted(db_items.values(), key=lambda row: row.name)]


@router.patch("/interfaces/{interface_id}")
def update_interface(interface_id: int, payload: NetworkInterfaceUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    item = db.query(NetworkInterface).filter(NetworkInterface.id == interface_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Interface not found")
    for key, value in payload.model_dump(exclude={"settings"}).items():
        setattr(item, key, value)
    item.settings = {**DEFAULT_INTERFACE_SETTINGS, **(item.settings or {}), **payload.settings}
    db.commit()
    db.refresh(item)
    return _interface_dict(item, _live_interfaces().get(item.name))


@router.get("/vlans")
def vlans(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    return [{"id": item.id, "interface_id": item.interface_id, "vlan_id": item.vlan_id, "name": item.name} for item in db.query(Vlan).all()]


@router.get("/dhcp-scopes")
def dhcp_scopes(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    return [_dhcp_scope_dict(item) for item in db.query(DhcpScope).order_by(DhcpScope.id.asc()).all()]


@router.post("/dhcp-scopes")
def create_dhcp_scope(payload: DhcpScopePayload, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    _ensure_interface(db, payload.interface_id)
    item = DhcpScope(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return _dhcp_scope_dict(item)


@router.patch("/dhcp-scopes/{scope_id}")
def update_dhcp_scope(scope_id: int, payload: DhcpScopePayload, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    _ensure_interface(db, payload.interface_id)
    item = db.query(DhcpScope).filter(DhcpScope.id == scope_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="DHCP scope not found")
    for key, value in payload.model_dump().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return _dhcp_scope_dict(item)


@router.delete("/dhcp-scopes/{scope_id}")
def delete_dhcp_scope(scope_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict[str, str]:
    item = db.query(DhcpScope).filter(DhcpScope.id == scope_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="DHCP scope not found")
    db.delete(item)
    db.commit()
    return {"message": "DHCP scope deleted"}


@router.get("/dns")
def dns(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    return [_dns_setting_dict(item) for item in db.query(DnsSetting).order_by(DnsSetting.id.asc()).all()]


@router.post("/dns")
def create_dns_setting(payload: DnsSettingPayload, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    item = DnsSetting(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return _dns_setting_dict(item)


@router.patch("/dns/{dns_id}")
def update_dns_setting(dns_id: int, payload: DnsSettingPayload, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    item = db.query(DnsSetting).filter(DnsSetting.id == dns_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="DNS setting not found")
    for key, value in payload.model_dump().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return _dns_setting_dict(item)


@router.delete("/dns/{dns_id}")
def delete_dns_setting(dns_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict[str, str]:
    item = db.query(DnsSetting).filter(DnsSetting.id == dns_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="DNS setting not found")
    db.delete(item)
    db.commit()
    return {"message": "DNS setting deleted"}


@router.get("/dyndns")
def dyndns_profiles(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    return [_dyndns_profile_dict(item) for item in db.query(DynamicDnsProfile).order_by(DynamicDnsProfile.id.asc()).all()]


@router.post("/dyndns")
def create_dyndns_profile(payload: DynamicDnsPayload, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    item = DynamicDnsProfile(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return _dyndns_profile_dict(item)


@router.patch("/dyndns/{profile_id}")
def update_dyndns_profile(profile_id: int, payload: DynamicDnsPayload, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    item = db.query(DynamicDnsProfile).filter(DynamicDnsProfile.id == profile_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="DynDNS profile not found")
    for key, value in payload.model_dump().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return _dyndns_profile_dict(item)


@router.delete("/dyndns/{profile_id}")
def delete_dyndns_profile(profile_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict[str, str]:
    item = db.query(DynamicDnsProfile).filter(DynamicDnsProfile.id == profile_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="DynDNS profile not found")
    db.delete(item)
    db.commit()
    return {"message": "DynDNS profile deleted"}


@router.post("/dyndns/apply")
def apply_dyndns(payload: GatewayApplyRequest | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> GatewayApplyResult:
    payload = payload or GatewayApplyRequest()
    service = GatewayService(db)
    outcome = service.build_apply_plan("dyndns", current_user.id, dry_run=payload.dry_run, execute=payload.execute)
    return GatewayApplyResult(
        job_id=outcome.job.id,
        component=outcome.job.component,
        status=outcome.status,
        dry_run=outcome.job.dry_run,
        rendered_configs=[asdict(item) for item in outcome.rendered_configs],
        commands=[asdict(item) for item in outcome.commands],
        file_writes=[asdict(item) for item in outcome.file_writes],
        command_results=[asdict(item) for item in outcome.command_results],
        executed=outcome.executed,
        message=outcome.error_message or ("DynDNS configuration applied" if outcome.executed else "DynDNS configuration plan built"),
    )


@router.post("/apply")
def apply_network(payload: GatewayApplyRequest | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> GatewayApplyResult:
    payload = payload or GatewayApplyRequest()
    service = GatewayService(db)
    outcome = service.build_apply_plan("network", current_user.id, dry_run=payload.dry_run, execute=payload.execute)
    return GatewayApplyResult(
        job_id=outcome.job.id,
        component=outcome.job.component,
        status=outcome.status,
        dry_run=outcome.job.dry_run,
        rendered_configs=[asdict(item) for item in outcome.rendered_configs],
        commands=[asdict(item) for item in outcome.commands],
        file_writes=[asdict(item) for item in outcome.file_writes],
        command_results=[asdict(item) for item in outcome.command_results],
        executed=outcome.executed,
        message=outcome.error_message or ("Configuration applied" if outcome.executed else "Configuration plan built"),
    )


@router.get("/static-routes")
def static_routes(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    return [_static_route_dict(item) for item in db.query(StaticRoute).order_by(StaticRoute.id.asc()).all()]


@router.post("/static-routes")
def create_static_route(payload: StaticRoutePayload, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    item = StaticRoute(
        rule_name=payload.rule_name,
        enabled=payload.enabled,
        dest_type=payload.dest_type,
        destination=payload.destination,
        subnetmask=payload.subnetmask,
        metric=payload.metric,
        route_type=payload.route_type,
        gateway=payload.gateway or "",
        interface_name=payload.interface_name,
        floating=payload.floating,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _static_route_dict(item)


@router.patch("/static-routes/{route_id}")
def update_static_route(route_id: int, payload: StaticRoutePayload, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    item = db.query(StaticRoute).filter(StaticRoute.id == route_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Static route not found")
    _apply_static_route_payload(item, payload)
    db.commit()
    db.refresh(item)
    return _static_route_dict(item)


@router.delete("/static-routes/{route_id}")
def delete_static_route(route_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict[str, str]:
    item = db.query(StaticRoute).filter(StaticRoute.id == route_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Static route not found")
    db.delete(item)
    db.commit()
    return {"message": "Static route deleted"}
