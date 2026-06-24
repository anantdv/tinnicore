#!/usr/bin/env sh
set -e

python - <<'PY'
import os
import time

from sqlalchemy import create_engine, text

database_url = os.environ["DATABASE_URL"]
engine = create_engine(database_url, pool_pre_ping=True)

for attempt in range(60):
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        break
    except Exception:
        time.sleep(2)
else:
    raise SystemExit("Database did not become ready in time")
PY

alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
