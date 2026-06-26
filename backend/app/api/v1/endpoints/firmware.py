from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.auth import User
from app.models.firmware import FirmwareUpdateJob, FirmwareVersion

router = APIRouter()


@router.get("/current")
def current_version(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    version = db.query(FirmwareVersion).filter(FirmwareVersion.is_current.is_(True)).first()
    return {"version": version.version if version else "1.0.0", "release_notes": version.release_notes if version else "Development build"}


@router.get("/available")
def available_versions(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    return [{"id": item.id, "version": item.version, "release_notes": item.release_notes, "is_available": item.is_available} for item in db.query(FirmwareVersion).order_by(FirmwareVersion.id.desc()).all()]


@router.post("/update")
def start_update(version_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    version = db.query(FirmwareVersion).filter(FirmwareVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    job = FirmwareUpdateJob(firmware_version_id=version.id, status="queued", progress=0)
    db.add(job)
    db.commit()
    return {"message": "Firmware update job queued", "job_id": job.id}


@router.post("/rollback")
def rollback(_: User = Depends(get_current_user)) -> dict[str, str]:
    return {"message": "Rollback queued"}
