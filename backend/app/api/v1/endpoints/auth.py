from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.core.security import create_token, hash_password, verify_password
from app.models.auth import Role, User
from app.schemas.auth import CurrentUserResponse, LoginRequest, TokenPair, UserRead

router = APIRouter()


def _serialize_user(user: User) -> UserRead:
    return UserRead(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_admin=user.is_admin,
        roles=[role.name for role in user.roles],
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.post("/login", response_model=TokenPair)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> TokenPair:
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user.last_login_at = datetime.now(timezone.utc)
    db.add(user)
    db.commit()

    access_token = create_token(user.username, timedelta(minutes=settings.access_token_expire_minutes), "access")
    refresh_token = create_token(user.username, timedelta(days=settings.refresh_token_expire_days), "refresh")
    return TokenPair(access_token=access_token, refresh_token=refresh_token)


@router.post("/login-json", response_model=TokenPair, include_in_schema=False)
def login_json(body: LoginRequest, db: Session = Depends(get_db)) -> TokenPair:
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access_token = create_token(user.username, timedelta(minutes=settings.access_token_expire_minutes), "access")
    refresh_token = create_token(user.username, timedelta(days=settings.refresh_token_expire_days), "refresh")
    return TokenPair(access_token=access_token, refresh_token=refresh_token)


@router.post("/logout")
def logout() -> dict[str, str]:
    return {"message": "Logged out"}


@router.post("/refresh", response_model=TokenPair)
def refresh(current_user: User = Depends(get_current_user)) -> TokenPair:
    access_token = create_token(current_user.username, timedelta(minutes=settings.access_token_expire_minutes), "access")
    refresh_token = create_token(current_user.username, timedelta(days=settings.refresh_token_expire_days), "refresh")
    return TokenPair(access_token=access_token, refresh_token=refresh_token)


@router.get("/me", response_model=CurrentUserResponse)
def me(current_user: User = Depends(get_current_user)) -> CurrentUserResponse:
    return _serialize_user(current_user)


@router.get("/roles")
def roles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[dict[str, str | int | None]]:
    return [{"id": role.id, "name": role.name, "description": role.description} for role in db.query(Role).all()]
