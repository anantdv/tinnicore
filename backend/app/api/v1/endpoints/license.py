from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.auth import User
from app.models.license import License, LicenseModule

router = APIRouter()


@router.get("/status")
def status(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> dict:
    license_row = db.query(License).first()
    modules = db.query(LicenseModule).all()
    return {
        "license": {
            "key": license_row.license_key if license_row else None,
            "status": license_row.status if license_row else "inactive",
            "activated_at": license_row.activated_at if license_row else None,
            "expires_at": license_row.expires_at if license_row else None,
        },
        "entitlements": [{"module_name": item.module_name, "enabled": item.enabled, "entitlements": item.entitlements} for item in modules],
    }


@router.post("/activate")
def activate_license(_: User = Depends(get_current_user)) -> dict[str, str]:
    return {"message": "License activation queued"}
