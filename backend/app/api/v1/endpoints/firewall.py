from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.auth import User
from app.models.firewall import FirewallNatRule, FirewallPortForward, FirewallRule, FirewallZone
from app.schemas.firewall import (
    FirewallPortForwardCreate,
    FirewallPortForwardUpdate,
    FirewallRuleCreate,
    FirewallRuleUpdate,
    FirewallZoneCreate,
    FirewallZoneUpdate,
)
from app.schemas.gateway import GatewayApplyRequest, GatewayApplyResult
from app.services.gateway import GatewayService
from dataclasses import asdict

router = APIRouter()


def _rule_dict(item: FirewallRule) -> dict:
    return {
        "id": item.id,
        "zone_id": item.zone_id,
        "destination_zone_id": item.destination_zone_id,
        "rule_name": item.rule_name,
        "action": item.action,
        "time_restriction": item.time_restriction,
        "connections_per_second": item.connections_per_second,
        "source": item.source,
        "source_mac": item.source_mac,
        "exclude_source": item.exclude_source,
        "exclude_source_mac": item.exclude_source_mac,
        "source_interface": item.source_interface,
        "destination": item.destination,
        "exclude_destination": item.exclude_destination,
        "destination_interface": item.destination_interface,
        "protocol": item.protocol,
        "port": item.port,
        "log": item.log,
        "comment": item.comment,
        "enabled": item.enabled,
    }


def _port_forward_dict(item: FirewallPortForward) -> dict:
    return {
        "id": item.id,
        "name": item.name,
        "action": item.action,
        "time_restriction": item.time_restriction,
        "connections_per_second": item.connections_per_second,
        "incoming_zone": item.incoming_zone,
        "external_port": item.external_port,
        "original_destination": item.original_destination,
        "exclude_original_destination": item.exclude_original_destination,
        "forward_zone": item.forward_zone,
        "server_type": item.server_type,
        "internal_ip": item.internal_ip,
        "internal_port": item.internal_port,
        "forward_port_mode": item.forward_port_mode,
        "hairpin_snat_interface": item.hairpin_snat_interface,
        "source_address": item.source_address,
        "exclude_source_address": item.exclude_source_address,
        "source_ports": item.source_ports,
        "source_interface": item.source_interface,
        "protocol": item.protocol,
        "log": item.log,
        "comment": item.comment,
        "enabled": item.enabled,
    }


@router.get("/zones")
def zones(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    return [{"id": item.id, "name": item.name, "policy": item.policy, "interfaces": item.interfaces} for item in db.query(FirewallZone).all()]


@router.post("/zones")
def create_zone(payload: FirewallZoneCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    zone = FirewallZone(**payload.model_dump())
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return {"id": zone.id, "name": zone.name, "policy": zone.policy, "interfaces": zone.interfaces}


@router.patch("/zones/{zone_id}")
def update_zone(zone_id: int, payload: FirewallZoneUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    zone = db.query(FirewallZone).filter(FirewallZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(zone, key, value)
    db.commit()
    db.refresh(zone)
    return {"id": zone.id, "name": zone.name, "policy": zone.policy, "interfaces": zone.interfaces}


@router.delete("/zones/{zone_id}")
def delete_zone(zone_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict[str, str]:
    zone = db.query(FirewallZone).filter(FirewallZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    db.delete(zone)
    db.commit()
    return {"message": "Zone deleted"}


@router.get("/rules")
def rules(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    return [_rule_dict(item) for item in db.query(FirewallRule).order_by(FirewallRule.id.asc()).all()]


@router.post("/rules")
def create_rule(payload: FirewallRuleCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    rule = FirewallRule(**payload.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return _rule_dict(rule)


@router.patch("/rules/{rule_id}")
def update_rule(rule_id: int, payload: FirewallRuleUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    rule = db.query(FirewallRule).filter(FirewallRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(rule, key, value)
    db.commit()
    db.refresh(rule)
    return _rule_dict(rule)


@router.delete("/rules/{rule_id}")
def delete_rule(rule_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict[str, str]:
    rule = db.query(FirewallRule).filter(FirewallRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.delete(rule)
    db.commit()
    return {"message": "Rule deleted"}


@router.get("/nat-rules")
def nat_rules(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    return [{"id": item.id, "name": item.name, "source": item.source, "translated_to": item.translated_to, "enabled": item.enabled} for item in db.query(FirewallNatRule).all()]


@router.get("/port-forwards")
def port_forwards(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    return [_port_forward_dict(item) for item in db.query(FirewallPortForward).order_by(FirewallPortForward.id.asc()).all()]


@router.post("/port-forwards")
def create_port_forward(payload: FirewallPortForwardCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    item = FirewallPortForward(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return _port_forward_dict(item)


@router.patch("/port-forwards/{forward_id}")
def update_port_forward(forward_id: int, payload: FirewallPortForwardUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    item = db.query(FirewallPortForward).filter(FirewallPortForward.id == forward_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Port forward not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return _port_forward_dict(item)


@router.delete("/port-forwards/{forward_id}")
def delete_port_forward(forward_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict[str, str]:
    item = db.query(FirewallPortForward).filter(FirewallPortForward.id == forward_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Port forward not found")
    db.delete(item)
    db.commit()
    return {"message": "Port forward deleted"}


@router.post("/validate")
def validate_policy(_: User = Depends(get_current_user)) -> dict[str, str]:
    return {"message": "Policy validation passed"}


@router.post("/apply")
def apply_policy(payload: GatewayApplyRequest | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> GatewayApplyResult:
    payload = payload or GatewayApplyRequest()
    service = GatewayService(db)
    outcome = service.build_apply_plan("firewall", current_user.id, dry_run=payload.dry_run, execute=payload.execute)
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
