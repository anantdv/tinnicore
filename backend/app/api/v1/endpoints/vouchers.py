from __future__ import annotations

import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_admin
from app.models.auth import User
from app.models.vouchers import Voucher, VoucherBatch
from app.schemas.vouchers import RedeemVoucherRequest, VoucherBatchCreate, VoucherBatchRead, VoucherRead

router = APIRouter()


def batch_to_read(batch: VoucherBatch) -> VoucherBatchRead:
    return VoucherBatchRead.model_validate(batch)


def voucher_to_read(voucher: Voucher) -> VoucherRead:
    return VoucherRead.model_validate(voucher)


@router.get("/batches", response_model=list[VoucherBatchRead])
def list_batches(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[VoucherBatchRead]:
    return [batch_to_read(batch) for batch in db.query(VoucherBatch).order_by(VoucherBatch.id.desc()).all()]


@router.post("/batches", response_model=VoucherBatchRead)
def create_batch(payload: VoucherBatchCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> VoucherBatchRead:
    batch = VoucherBatch(**payload.model_dump())
    db.add(batch)
    db.flush()
    for index in range(payload.quantity):
        voucher = Voucher(
            batch_id=batch.id,
            code=f"{payload.code_prefix}-{index + 1:04d}-{secrets.token_hex(2).upper()}",
            pin=f"{secrets.randbelow(10000):04d}",
            status="available",
        )
        db.add(voucher)
    db.commit()
    db.refresh(batch)
    return batch_to_read(batch)


@router.get("", response_model=list[VoucherRead])
def list_vouchers(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[VoucherRead]:
    return [voucher_to_read(voucher) for voucher in db.query(Voucher).order_by(Voucher.id.desc()).all()]


@router.post("/redeem")
def redeem_voucher(payload: RedeemVoucherRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    voucher = db.query(Voucher).filter(Voucher.code == payload.code, Voucher.pin == payload.pin).first()
    if not voucher or voucher.status != "available":
        raise HTTPException(status_code=400, detail="Invalid or unavailable voucher")
    voucher.status = "redeemed"
    voucher.redeemed_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Voucher redeemed"}


@router.post("/{voucher_id}/block")
def block_voucher(voucher_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> dict[str, str]:
    voucher = db.query(Voucher).filter(Voucher.id == voucher_id).first()
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher not found")
    voucher.status = "blocked"
    voucher.blocked_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Voucher blocked"}


@router.post("/{voucher_id}/unblock")
def unblock_voucher(voucher_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> dict[str, str]:
    voucher = db.query(Voucher).filter(Voucher.id == voucher_id).first()
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher not found")
    voucher.status = "available"
    voucher.blocked_at = None
    db.commit()
    return {"message": "Voucher unblocked"}
