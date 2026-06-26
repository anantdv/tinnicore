from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_admin
from app.core.security import hash_password
from app.models.auth import User
from app.models.vouchers import AccessPlan
from app.schemas.users import UserCreate, UserRead, UserUpdate

router = APIRouter()


def serialize(user: User) -> UserRead:
    return UserRead(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        current_plan_id=user.current_plan_id,
        current_plan_name=user.current_plan.plan_name if user.current_plan else None,
        is_active=user.is_active,
        is_admin=user.is_admin,
        roles=[role.name for role in user.roles],
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.get("", response_model=list[UserRead])
def list_users(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[UserRead]:
    return [serialize(user) for user in db.query(User).order_by(User.id.asc()).all()]


@router.post("", response_model=UserRead)
def create_user(payload: UserCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> UserRead:
    if db.query(User).filter((User.username == payload.username) | (User.email == payload.email)).first():
        raise HTTPException(status_code=400, detail="User already exists")
    if payload.current_plan_id is not None and not db.query(AccessPlan).filter(AccessPlan.id == payload.current_plan_id).first():
        raise HTTPException(status_code=400, detail="Access plan not found")
    user = User(
        username=payload.username,
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        current_plan_id=payload.current_plan_id,
        is_admin=payload.is_admin,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return serialize(user)


@router.patch("/{user_id}", response_model=UserRead)
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> UserRead:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    values = payload.model_dump(exclude_unset=True)
    if "current_plan_id" in values and values["current_plan_id"] is not None:
        if not db.query(AccessPlan).filter(AccessPlan.id == values["current_plan_id"]).first():
            raise HTTPException(status_code=400, detail="Access plan not found")
    for field, value in values.items():
        if field == "password" and value:
            user.password_hash = hash_password(value)
        elif field == "current_plan_id":
            user.current_plan_id = value
        elif value is not None:
            setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return serialize(user)


@router.post("/{user_id}/disable", response_model=UserRead)
def disable_user(user_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> UserRead:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    db.refresh(user)
    return serialize(user)


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> dict[str, str]:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}


@router.post("/{user_id}/assign-plan")
def assign_plan(user_id: int, plan_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> dict[str, int | str]:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not db.query(AccessPlan).filter(AccessPlan.id == plan_id).first():
        raise HTTPException(status_code=404, detail="Access plan not found")
    user.current_plan_id = plan_id
    db.commit()
    return {"message": "Plan assigned", "user_id": user_id, "plan_id": plan_id}
