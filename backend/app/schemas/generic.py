from __future__ import annotations

from pydantic import BaseModel


class ActionResponse(BaseModel):
    message: str
