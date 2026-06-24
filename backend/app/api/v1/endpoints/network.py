from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.auth import User
from app.models.network import DhcpScope, DnsSetting, NetworkInterface, StaticRoute, Vlan

router = APIRouter()


@router.get("/interfaces")
def interfaces(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    return [{"id": item.id, "name": item.name, "kind": item.kind, "address": item.address, "is_up": item.is_up} for item in db.query(NetworkInterface).all()]


@router.get("/vlans")
def vlans(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    return [{"id": item.id, "interface_id": item.interface_id, "vlan_id": item.vlan_id, "name": item.name} for item in db.query(Vlan).all()]


@router.get("/dhcp-scopes")
def dhcp_scopes(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    return [{"id": item.id, "interface_id": item.interface_id, "scope_name": item.scope_name, "start_ip": item.start_ip, "end_ip": item.end_ip} for item in db.query(DhcpScope).all()]


@router.get("/dns")
def dns(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    return [{"id": item.id, "primary_dns": item.primary_dns, "secondary_dns": item.secondary_dns, "search_domain": item.search_domain} for item in db.query(DnsSetting).all()]


@router.get("/static-routes")
def static_routes(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    return [{"id": item.id, "destination": item.destination, "gateway": item.gateway, "interface_name": item.interface_name, "metric": item.metric} for item in db.query(StaticRoute).all()]
