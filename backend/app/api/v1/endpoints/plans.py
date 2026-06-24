from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_admin
from app.models.auth import User
from app.models.vouchers import AccessPlan
from app.schemas.plans import AccessPlanCreate, AccessPlanRead, AccessPlanUpdate

router = APIRouter()


def serialize(plan: AccessPlan) -> AccessPlanRead:
    return AccessPlanRead.model_validate(plan)


@router.get("", response_model=list[AccessPlanRead])
def list_plans(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[AccessPlanRead]:
    return [serialize(plan) for plan in db.query(AccessPlan).order_by(AccessPlan.id.asc()).all()]


@router.post("", response_model=AccessPlanRead)
def create_plan(payload: AccessPlanCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> AccessPlanRead:
    plan = AccessPlan(**payload.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return serialize(plan)


@router.patch("/{plan_id}", response_model=AccessPlanRead)
def update_plan(plan_id: int, payload: AccessPlanUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> AccessPlanRead:
    plan = db.query(AccessPlan).filter(AccessPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(plan, key, value)
    db.commit()
    db.refresh(plan)
    return serialize(plan)


@router.delete("/{plan_id}")
def delete_plan(plan_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> dict[str, str]:
    plan = db.query(AccessPlan).filter(AccessPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    db.delete(plan)
    db.commit()
    return {"message": "Plan deleted"}
