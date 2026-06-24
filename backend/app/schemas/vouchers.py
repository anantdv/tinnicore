from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.schemas.common import Timestamped


class VoucherBatchCreate(BaseModel):
    batch_name: str
    code_prefix: str
    quantity: int
    expires_at: datetime | None = None


class VoucherBatchRead(Timestamped):
    id: int
    batch_name: str
    code_prefix: str
    quantity: int
    status: str
    expires_at: datetime | None = None


class VoucherRead(Timestamped):
    id: int
    batch_id: int
    code: str
    pin: str
    status: str
    redeemed_at: datetime | None = None
    blocked_at: datetime | None = None


class RedeemVoucherRequest(BaseModel):
    code: str
    pin: str
