from __future__ import annotations

from pydantic import BaseModel, EmailStr
from pydantic import Field

from app.schemas.common import Timestamped


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    full_name: str | None = None
    password: str
    is_admin: bool = False
    current_plan_id: int | None = None


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = None
    password: str | None = None
    is_active: bool | None = None
    is_admin: bool | None = None
    current_plan_id: int | None = None


class UserRead(Timestamped):
    id: int
    username: str
    email: EmailStr
    full_name: str | None = None
    current_plan_id: int | None = None
    current_plan_name: str | None = None
    is_active: bool
    is_admin: bool
    roles: list[str] = Field(default_factory=list)
