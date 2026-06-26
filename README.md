# TINNICORE OS

TINNICORE OS is a lightweight firewall and hotspot gateway management platform for hotels, campuses, offices, and public Wi-Fi.

This repository contains the first development version:

- FastAPI backend with JWT auth, SQLAlchemy models, and Alembic migrations
- React + TypeScript frontend with Tailwind, React Router, TanStack Query, and charts
- Docker Compose environment with MySQL and Redis

## Quick start

1. Copy `.env.example` to `.env` and adjust secrets if needed.
2. Start the stack:

```bash
docker compose up --build
```

3. Open the frontend at `http://localhost:5173`
4. Backend API is available at `http://localhost:8000`

## Default development login

- Username: `admin`
- Password: `admin123`

## Backend

The backend exposes endpoints for:

- Auth
- Dashboard
- Users
- Access plans
- Vouchers
- Sessions
- Network
- WAN
- Firewall
- License
- Firmware
- Telemetry

## Notes

- The first boot applies Alembic migrations automatically in the backend container.
- Several endpoints are production-shaped but return mock or seeded data for the initial development version.
