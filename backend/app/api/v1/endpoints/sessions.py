from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_admin
from app.models.auth import User
from app.models.sessions import HotspotSession

router = APIRouter()


@router.get("/active")
def active_sessions(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    return [
        {
            "id": item.id,
            "user_id": item.user_id,
            "plan_id": item.plan_id,
            "session_token": item.session_token,
            "status": item.status,
            "bytes_up": item.bytes_up,
            "bytes_down": item.bytes_down,
            "started_at": item.started_at,
            "last_seen_at": item.last_seen_at,
        }
        for item in db.query(HotspotSession).filter(HotspotSession.status == "active").all()
    ]


@router.get("/history")
def session_history(db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[dict]:
    return [
        {
            "id": item.id,
            "user_id": item.user_id,
            "plan_id": item.plan_id,
            "status": item.status,
            "started_at": item.started_at,
            "ended_at": item.ended_at,
        }
        for item in db.query(HotspotSession).order_by(HotspotSession.id.desc()).all()
    ]


@router.post("/{session_id}/disconnect")
def disconnect_session(session_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> dict[str, str]:
    session_row = db.query(HotspotSession).filter(HotspotSession.id == session_id).first()
    if not session_row:
        raise HTTPException(status_code=404, detail="Session not found")
    session_row.status = "disconnected"
    db.commit()
    return {"message": "Session disconnected"}


@router.post("/{session_id}/change-plan")
def change_plan(session_id: int, plan_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> dict[str, int | str]:
    session_row = db.query(HotspotSession).filter(HotspotSession.id == session_id).first()
    if not session_row:
        raise HTTPException(status_code=404, detail="Session not found")
    session_row.plan_id = plan_id
    db.commit()
    return {"message": "Session plan changed", "session_id": session_id, "plan_id": plan_id}
