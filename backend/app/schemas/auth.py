from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import ORMBase, Timestamped


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


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


class CurrentUserResponse(UserRead):
    pass


class RoleRead(ORMBase):
    id: int
    name: str
    description: str | None = None
