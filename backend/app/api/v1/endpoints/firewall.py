from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.auth import User
from app.models.firewall import FirewallNatRule, FirewallPortForward, FirewallRule, FirewallZone
from app.schemas.firewall import FirewallRuleCreate, FirewallRuleUpdate, FirewallZoneCreate, FirewallZoneUpdate

router = APIRouter()


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
    return [{"id": item.id, "zone_id": item.zone_id, "rule_name": item.rule_name, "action": item.action, "enabled": item.enabled} for item in db.query(FirewallRule).all()]


@router.post("/rules")
def create_rule(payload: FirewallRuleCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    rule = FirewallRule(**payload.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return {"id": rule.id, "zone_id": rule.zone_id, "rule_name": rule.rule_name, "action": rule.action, "enabled": rule.enabled}


@router.patch("/rules/{rule_id}")
def update_rule(rule_id: int, payload: FirewallRuleUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    rule = db.query(FirewallRule).filter(FirewallRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(rule, key, value)
    db.commit()
    db.refresh(rule)
    return {"id": rule.id, "zone_id": rule.zone_id, "rule_name": rule.rule_name, "action": rule.action, "enabled": rule.enabled}


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
    return [{"id": item.id, "name": item.name, "external_port": item.external_port, "internal_ip": item.internal_ip, "internal_port": item.internal_port, "protocol": item.protocol, "enabled": item.enabled} for item in db.query(FirewallPortForward).all()]


@router.post("/validate")
def validate_policy(_: User = Depends(get_current_user)) -> dict[str, str]:
    return {"message": "Policy validation passed"}


@router.post("/apply")
def apply_policy(_: User = Depends(get_current_user)) -> dict[str, str]:
    return {"message": "Policy application queued"}
