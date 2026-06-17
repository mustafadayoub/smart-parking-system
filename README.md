# Smart Parking System

Full-stack intelligent parking management with FastAPI, React, PostgreSQL, Redis, Celery, and real-time WebSocket updates.

## Development Team

<div align="center">

### ✦ Engineering Team · فريق التطوير ✦

| | |
|:---:|:---:|
| **Mustafa Al Dayoub** | **Mousa Al Awad** |
| *Software Engineer* | *Software Engineer* |
| `Full-Stack · Backend · IoT` | `Full-Stack · Frontend · UX` |

*Architects of the Smart Parking System*

</div>

## Architecture

```
┌─────────────┐     HTTP/WS      ┌──────────────┐
│   Clients   │ ───────────────► │   FastAPI    │
│ Driver/Mgmt │                  │     API      │
└─────────────┘                  └──────┬───────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
             ┌────────────┐      ┌────────────┐      ┌────────────┐
             │ PostgreSQL │      │   Redis    │      │   Celery   │
             │  (data)    │      │ pub/sub +  │      │ worker/beat│
             └────────────┘      │   broker   │      └────────────┘
                                 └────────────┘
                                        ▲
                                        │ sensor ingest webhook
                                 ┌──────┴───────┐
                                 │ IoT Sensors  │
                                 └──────────────┘
```

Aligned with the provided DFD, use-case, and activity diagrams:

- **Drivers**: register/login, view spots, reserve, cancel (with refund eligibility flag)
- **Management**: occupancy reports (role-gated)
- **IoT Sensors**: webhook ingest → Celery `process_sensor_reading` → DB + Redis Pub/Sub → WebSocket broadcast
- **Background jobs**: no-show expiration (15-min grace), nightly occupancy aggregation

## Project Structure

```
Smart Parking System/
├── app/
│   ├── main.py                 # FastAPI app + lifespan (DB init, Redis listener)
│   ├── config.py               # Pydantic settings
│   ├── database.py             # Async SQLAlchemy engine/session
│   ├── core/                   # Enums, JWT/password security
│   ├── models/                 # SQLAlchemy ORM models
│   ├── schemas/                # Pydantic request/response schemas
│   ├── services/               # Business logic layer
│   ├── api/
│   │   ├── deps.py             # Auth & sensor API-key dependencies
│   │   └── v1/                 # REST endpoints
│   ├── websockets/             # Connection manager + WS route
│   └── celery_app/             # Celery app, tasks, beat schedule
├── alembic/                    # Database migrations
├── frontend/                   # React + Vite + TypeScript SPA
├── scripts/seed_data.py        # Dev seed (spots + demo users)
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── .env.example
```

## Quick Start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

Services:

| Service        | URL / Port        |
|----------------|-------------------|
| API            | http://localhost:8000 |
| Swagger UI     | http://localhost:8000/docs |
| Frontend (dev) | http://localhost:5173 |
| PostgreSQL     | localhost:5432    |
| Redis          | localhost:6379    |

The API container bootstraps the database automatically (`bootstrap_db.py`: migrations + optional seed).

### One-command reset (recommended when things break)

```powershell
.\scripts\reset-dev.ps1
```

This stops containers, wipes the DB volume, rebuilds, seeds demo data, and waits for `/health`.

### Manual start

```bash
cp .env.example .env
docker compose up --build
```

### Frontend (local dev)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173 and sign in with a demo account.

Demo accounts (auto-seeded when `SEED_ON_STARTUP=true`):

- **Management**: `admin@example.com` / `Admin123!`
- **Driver**: `driver@example.com` / `Driver123!`

## API Endpoints

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register driver or management user |
| POST | `/api/v1/auth/login` | OAuth2 form login (`username` = email) → JWT |
| GET | `/api/v1/auth/me` | Current authenticated user profile |

### Parking Spots

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/spots` | List spots (`?status=AVAILABLE&level_zone=Level-A`) |
| GET | `/api/v1/spots/{id}` | Spot details |
| POST | `/api/v1/spots` | Create spot (MANAGEMENT) |
| PATCH | `/api/v1/spots/{id}` | Update spot status (MANAGEMENT) |

### Reservations (JWT required)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/reservations` | Book a spot for a time window |
| GET | `/api/v1/reservations/me` | List current user's reservations |
| DELETE | `/api/v1/reservations/{id}` | Cancel active reservation |

### Reports (MANAGEMENT role)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/reports/occupancy` | Aggregated occupancy (`?report_date=2026-06-09`) |
| GET | `/api/v1/reports/occupancy/cached` | Cached nightly report from Redis |

### Sensors (API key)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/sensors/ingest` | IoT webhook (header: `X-API-Key`) |

### WebSocket

| Path | Description |
|------|-------------|
| `WS /ws/v1/spots/updates` | Real-time JSON spot status updates |

Example WebSocket payload:

```json
{
  "spot_id": "uuid",
  "spot_number": "A-001",
  "level_zone": "Level-A",
  "status": "OCCUPIED",
  "last_updated": "2026-06-10T12:00:00Z",
  "source": "sensor"
}
```

## Celery Tasks

| Task | Trigger | Description |
|------|---------|-------------|
| `process_sensor_reading` | Sensor ingest webhook | Updates spot, writes `SensorLogs`, publishes to Redis |
| `expire_stale_reservations` | Beat every 5 min | NO_SHOW after 15-min grace period |
| `generate_daily_occupancy_report` | Beat nightly (UTC) | Aggregates logs, caches report in Redis |

## Local Development (without Docker)

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env        # adjust DATABASE_URL for local Postgres/Redis
uvicorn app.main:app --reload
celery -A app.celery_app.celery worker --loglevel=info
celery -A app.celery_app.celery beat --loglevel=info
python scripts/seed_data.py
```

## Environment Variables

See [`.env.example`](.env.example) for all settings. Key values:

- `DATABASE_URL` / `DATABASE_URL_SYNC` — async (FastAPI) and sync (Celery) connections
- `REDIS_URL` — Pub/Sub for WebSocket fan-out
- `SECRET_KEY` — JWT signing (change in production)
- `SENSOR_WEBHOOK_API_KEY` — protects `/sensors/ingest`
- `RESERVATION_GRACE_PERIOD_MINUTES` — default `15`

## Database Schema

- **users** — `id`, `role` (DRIVER/MANAGEMENT), `email`, `password_hash`, `created_at`
- **parking_spots** — `id`, `spot_number`, `level_zone`, `status`, `last_updated`
- **reservations** — `id`, `user_id`, `spot_id`, `start_time`, `end_time`, `status`, `created_at`
- **sensor_logs** — `id`, `spot_id`, `sensor_state`, `timestamp`

Tables are managed with Alembic migrations (no runtime `create_all`).

```bash
# Generate a new revision after model changes
alembic revision --autogenerate -m "describe change"

# Apply migrations
alembic upgrade head

# Roll back one revision
alembic downgrade -1
```

Initial schema lives in `alembic/versions/001_initial_schema.py`.

## Automated Testing (Phase 3)

### Prerequisites

Docker services must be running (`docker compose up -d`). Create an isolated test database once:

```bash
docker compose exec db psql -U parking -d smart_parking -c "CREATE DATABASE smart_parking_test;"
```

### Install test dependencies

```bash
pip install -r requirements-test.txt
```

### Run tests locally

```bash
pytest -v
pytest -v --cov=app --cov-report=term-missing
flake8 app tests
black --check app tests
```

Tests use PostgreSQL database `smart_parking_test` (not your dev data). Environment overrides are applied automatically in `tests/conftest.py`.

### CI/CD

GitHub Actions workflow (`.github/workflows/ci-cd.yml`) runs on push/PR to `main`:

1. **Lint** — flake8 + black
2. **Test** — pytest with PostgreSQL + Redis service containers
3. **Docker Build** — validates `docker-compose.yml` and builds API + Frontend images
