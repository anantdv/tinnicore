#!/bin/sh
set -eu

cd "$(dirname "$0")/../backend"
nohup env PYTHONPATH=. ../.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 >> ../backend.log 2>&1 &
