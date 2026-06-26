from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_admin
from app.models.auth import User
from app.models.gateway import GatewayApplyJob
from app.models.hotspot import HotspotPortal, RadiusAuthAttempt, RadiusNasDevice, RadiusProfile
from app.models.vouchers import AccessPlan
from app.schemas.gateway import (
    GatewayApplyJobRead,
    GatewayApplyRequest,
    GatewayApplyResult,
    CommandExecutionRead,
    HotspotLoginRequest,
    HotspotLoginResponse,
    HotspotPortalCreate,
    HotspotPortalRead,
    HotspotPortalUpdate,
    RadiusAuthAttemptRead,
    RadiusNasDeviceCreate,
    RadiusNasDeviceRead,
    RadiusNasDeviceUpdate,
    RadiusProfileCreate,
    RadiusProfileRead,
    RadiusProfileUpdate,
    FileWriteRead,
)
from app.services.gateway import GatewayService
from dataclasses import asdict

router = APIRouter()


def _gateway(db: Session) -> GatewayService:
    return GatewayService(db)


@router.get("/preview")
def preview(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    service = _gateway(db)
    return {
        "freeradius": asdict(service.render_freeradius_config()),
        "hotspot": asdict(service.render_chilli_config()),
        "firewall": asdict(service.render_firewall_config()),
    }


@router.post("/apply/{component}", response_model=GatewayApplyResult)
def apply_component(component: str, payload: GatewayApplyRequest | None = None, db: Session = Depends(get_db), current_user: User = Depends(require_admin)) -> GatewayApplyResult:
    payload = payload or GatewayApplyRequest()
    service = _gateway(db)
    outcome = service.build_apply_plan(component, current_user.id, dry_run=payload.dry_run, execute=payload.execute)
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


@router.post("/hotspot/login", response_model=HotspotLoginResponse)
def hotspot_login(payload: HotspotLoginRequest, db: Session = Depends(get_db)) -> HotspotLoginResponse:
    service = _gateway(db)
    result = service.authenticate_hotspot(payload.model_dump())
    return HotspotLoginResponse.model_validate(result)


@router.get("/hotspot/attempts", response_model=list[RadiusAuthAttemptRead])
def hotspot_attempts(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[RadiusAuthAttemptRead]:
    return [RadiusAuthAttemptRead.model_validate(item) for item in db.query(RadiusAuthAttempt).order_by(RadiusAuthAttempt.id.desc()).all()]


@router.get("/portal/public")
def public_portal(db: Session = Depends(get_db)) -> dict:
    portal = db.query(HotspotPortal).filter(HotspotPortal.is_active.is_(True)).order_by(HotspotPortal.id.asc()).first()
    if not portal:
        return {
            "portal_name": "TINNICORE Guest Wi-Fi",
            "welcome_message": "Welcome to TINNICORE Wi-Fi",
            "success_path": "/status",
            "builder_config": None,
        }
    return {
        "id": portal.id,
        "portal_name": portal.portal_name,
        "welcome_message": portal.welcome_message,
        "success_path": portal.success_path,
        "builder_config": portal.builder_config,
    }


@router.get("/portals", response_model=list[HotspotPortalRead])
def list_portals(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[HotspotPortalRead]:
    return [HotspotPortalRead.model_validate(item) for item in db.query(HotspotPortal).order_by(HotspotPortal.id.asc()).all()]


@router.post("/portals", response_model=HotspotPortalRead)
def create_portal(payload: HotspotPortalCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> HotspotPortalRead:
    portal = HotspotPortal(**payload.model_dump())
    db.add(portal)
    db.commit()
    db.refresh(portal)
    return HotspotPortalRead.model_validate(portal)


@router.patch("/portals/{portal_id}", response_model=HotspotPortalRead)
def update_portal(portal_id: int, payload: HotspotPortalUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> HotspotPortalRead:
    portal = db.query(HotspotPortal).filter(HotspotPortal.id == portal_id).first()
    if not portal:
        raise HTTPException(status_code=404, detail="Portal not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(portal, key, value)
    db.commit()
    db.refresh(portal)
    return HotspotPortalRead.model_validate(portal)


@router.delete("/portals/{portal_id}")
def delete_portal(portal_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> dict[str, str]:
    portal = db.query(HotspotPortal).filter(HotspotPortal.id == portal_id).first()
    if not portal:
        raise HTTPException(status_code=404, detail="Portal not found")
    db.delete(portal)
    db.commit()
    return {"message": "Portal deleted"}


@router.get("/radius-profiles", response_model=list[RadiusProfileRead])
def list_radius_profiles(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[RadiusProfileRead]:
    return [RadiusProfileRead.model_validate(item) for item in db.query(RadiusProfile).order_by(RadiusProfile.id.asc()).all()]


@router.post("/radius-profiles", response_model=RadiusProfileRead)
def create_radius_profile(payload: RadiusProfileCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> RadiusProfileRead:
    plan = db.query(AccessPlan).filter(AccessPlan.id == payload.access_plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Access plan not found")
    profile = RadiusProfile(**payload.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return RadiusProfileRead.model_validate(profile)


@router.patch("/radius-profiles/{profile_id}", response_model=RadiusProfileRead)
def update_radius_profile(profile_id: int, payload: RadiusProfileUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> RadiusProfileRead:
    profile = db.query(RadiusProfile).filter(RadiusProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Radius profile not found")
    if payload.access_plan_id is not None:
        plan = db.query(AccessPlan).filter(AccessPlan.id == payload.access_plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Access plan not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return RadiusProfileRead.model_validate(profile)


@router.delete("/radius-profiles/{profile_id}")
def delete_radius_profile(profile_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> dict[str, str]:
    profile = db.query(RadiusProfile).filter(RadiusProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Radius profile not found")
    db.delete(profile)
    db.commit()
    return {"message": "Radius profile deleted"}


@router.get("/nas-devices", response_model=list[RadiusNasDeviceRead])
def list_nas_devices(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[RadiusNasDeviceRead]:
    return [RadiusNasDeviceRead.model_validate(item) for item in db.query(RadiusNasDevice).order_by(RadiusNasDevice.id.asc()).all()]


@router.post("/nas-devices", response_model=RadiusNasDeviceRead)
def create_nas_device(payload: RadiusNasDeviceCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> RadiusNasDeviceRead:
    nas = RadiusNasDevice(**payload.model_dump())
    db.add(nas)
    db.commit()
    db.refresh(nas)
    return RadiusNasDeviceRead.model_validate(nas)


@router.patch("/nas-devices/{nas_id}", response_model=RadiusNasDeviceRead)
def update_nas_device(nas_id: int, payload: RadiusNasDeviceUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> RadiusNasDeviceRead:
    nas = db.query(RadiusNasDevice).filter(RadiusNasDevice.id == nas_id).first()
    if not nas:
        raise HTTPException(status_code=404, detail="NAS device not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(nas, key, value)
    db.commit()
    db.refresh(nas)
    return RadiusNasDeviceRead.model_validate(nas)


@router.delete("/nas-devices/{nas_id}")
def delete_nas_device(nas_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> dict[str, str]:
    nas = db.query(RadiusNasDevice).filter(RadiusNasDevice.id == nas_id).first()
    if not nas:
        raise HTTPException(status_code=404, detail="NAS device not found")
    db.delete(nas)
    db.commit()
    return {"message": "NAS device deleted"}


@router.get("/jobs", response_model=list[GatewayApplyJobRead])
def list_jobs(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[GatewayApplyJobRead]:
    return [GatewayApplyJobRead.model_validate(item) for item in db.query(GatewayApplyJob).order_by(GatewayApplyJob.id.desc()).all()]
