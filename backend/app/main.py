from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import settings
from app.db.session import SessionLocal, engine
from app.models import Base
from app.services.bootstrap import ensure_bootstrap_data

app = FastAPI(title=settings.app_name, version="0.1.0")
frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

if frontend_dist.exists():
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
      app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    def frontend_index() -> FileResponse:
        return FileResponse(frontend_dist / "index.html")

    @app.get("/{full_path:path}")
    def frontend_spa(full_path: str) -> FileResponse:
        if full_path.startswith("api/"):
            return FileResponse(frontend_dist / "index.html")
        candidate = frontend_dist / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(frontend_dist / "index.html")


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        ensure_bootstrap_data(db)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
