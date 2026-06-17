# Smart Parking System

Full-stack intelligent parking management with FastAPI, React, PostgreSQL, Redis, Celery, and real-time WebSocket updates.

---

## دليل التشغيل الكامل · Complete Run Guide

> **ترتيب التشغيل الموصى به:** Docker (Backend) → Frontend → Presentation Site  
> **Recommended order:** Docker (Backend) → Frontend → Presentation Site

### المتطلبات · Prerequisites

| الأداة | الإصدار | مطلوب لـ |
|--------|---------|----------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | أحدث إصدار | Backend + DB + Redis + Celery |
| [Node.js](https://nodejs.org/) | 20+ | Frontend + موقع العرض |
| Git | اختياري | استنساخ / رفع GitHub |

---

### 1️⃣ أول مرة — إعداد المشروع · First-time setup

```powershell
# 1. انتقل لمجلد المشروع
cd "d:\Smart Parking System"

# 2. انسخ ملف البيئة (مرة واحدة فقط)
copy .env.example .env

# 3. (اختياري) راجع .env — القيم الافتراضية مناسبة للتطوير المحلي
```

**ماذا يفعل `.env`؟** يحدّد اتصال PostgreSQL، Redis، مفتاح JWT، ومفتاح webhook للمستشعرات.

---

### 2️⃣ تشغيل Backend (Docker) · Start Backend

**أول build (قد يستغرق 5–15 دقيقة):**

```powershell
cd "d:\Smart Parking System"
docker compose up --build -d
```

**التشغيل اليومي (بدون build — أسرع):**

```powershell
docker compose up -d
```

**متابعة السجلات:**

```powershell
docker compose logs -f api
```

**التحقق من الصحة:**

```powershell
curl http://localhost:8000/health
```

عند النجاح، الـ API يُطبّق migrations تلقائياً (`bootstrap_db.py`) ويُ seed حسابات Demo إذا `SEED_ON_STARTUP=true`.

| الخدمة | الرابط / المنفذ |
|--------|-----------------|
| API | http://localhost:8000 |
| Swagger (توثيق API) | http://localhost:8000/docs |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |

**إذا فشل الحجز أو ظهر خطأ migrations:**

```powershell
docker compose exec api alembic upgrade head
```

---

### 3️⃣ تشغيل واجهة التطبيق · Start Frontend (React)

> **مهم:** Backend (Docker) يجب أن يكون شغّالاً قبل هذه الخطوة.

```powershell
cd "d:\Smart Parking System\frontend"

# أول مرة فقط:
copy .env.example .env
npm install

# التشغيل:
npm run dev
```

| | |
|--|--|
| **الرابط** | http://localhost:5173 |
| **API** | http://localhost:8000/api/v1 |
| **WebSocket** | ws://localhost:8000/ws/v1/spots/updates |

**بناء للإنتاج:**

```powershell
npm run build
npm run preview
```

---

### 4️⃣ تشغيل موقع العرض التقديمي · Presentation Site

> موقع منفصل للمناقشة الجامعية (المخططات، المعمارية، قاعدة البيانات) — **لا يحتاج Docker**.

```powershell
cd "d:\Smart Parking System\presentation-site"

# أول مرة فقط:
npm install

# التشغيل:
npm run dev
```

| | |
|--|--|
| **الرابط** | http://localhost:5173 *(أو المنفذ التالي إذا Frontend شغّال)* |
| **المحتوى** | 11 مخططاً بالترتيب: BFD → DFD → Use Cases → Scenarios → Activity → Class |

**بناء للإنتاج:**

```powershell
npm run build
npm run preview
```

---

### 5️⃣ تسجيل الدخول · Demo Accounts

| الدور | البريد | كلمة المرور |
|-------|--------|-------------|
| **إدارة** | `admin@example.com` | `Admin123!` |
| **سائق** | `driver@example.com` | `Driver123!` |

**Mock Payment (بطاقة ناجحة):** `4242 4242 4242 4242`

**سيناريو تجربة سريع:**
1. سجّل دخول كسائق → اختر موقفاً → احجز (اسم + لوحة + وقت) → ادفع
2. ألغِ الحجز من القائمة (قبل/بعد ساعة لاختبار الاسترداد)
3. سجّل دخول كإدارة → تقارير + مستخدمين + تنبيهات أعطال
4. من لوحة السائق/الإدارة → **IoT Simulator** → أرسل `FAULT` لرؤية التنبيه

---

### 6️⃣ تشغيل الاختبارات · Run Tests

```powershell
# 1. تأكد أن Docker شغّال
docker compose up -d

# 2. أنشئ قاعدة اختبار (مرة واحدة)
docker compose exec db psql -U parking -d smart_parking -c "CREATE DATABASE smart_parking_test;"

# 3. ثبّت dependencies الاختبار
pip install -r requirements-test.txt

# 4. شغّل الاختبارات
cd "d:\Smart Parking System"
pytest -v
```

---

### 7️⃣ إيقاف / إعادة تشغيل / إصلاح · Stop & Troubleshooting

| الحالة | الأمر |
|-------------|-------|
| **إيقاف كل شيء** | `docker compose down` |
| **إيقاف + حذف البيانات** | `docker compose down -v` |
| **إعادة بناء كاملة** | `.\scripts\reset-dev.ps1` |
| **Migrations يدوي** | `docker compose exec api alembic upgrade head` |
| **إعادة seed** | `docker compose exec api python scripts/seed_data.py` |
| **حالة الحاويات** | `docker compose ps` |

---

### 8️⃣ رفع التحديثات إلى GitHub · Push Updates

```powershell
cd "d:\Smart Parking System"
git add .
git commit -m "وصف التغيير"
git push
```

**المستودع:** https://github.com/mustafadayoub/smart-parking-system

**أول رفع (إن لم يكن remote مضبوطاً):**

```powershell
git remote add origin https://github.com/mustafadayoub/smart-parking-system.git
git push -u origin main
```

---

### ملخص الأوامر (نسخ سريع) · Cheat Sheet

```powershell
# ── Backend ──
cd "d:\Smart Parking System"
docker compose up -d

# ── Frontend ──
cd frontend && npm run dev

# ── Presentation ──
cd presentation-site && npm run dev

# ── Tests ──
pytest -v

# ── Git ──
git add . && git commit -m "update" && git push
```

---

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
├── frontend/                   # React + Vite + TypeScript SPA (التطبيق)
├── presentation-site/          # موقع العرض التقديمي للمناقشة
├── scripts/seed_data.py        # Dev seed (spots + demo users)
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── .env.example
```

## Quick Start (Docker) — ملخص

> للتفاصيل الكاملة راجع **دليل التشغيل الكامل** أعلاه.

```powershell
copy .env.example .env
docker compose up --build -d
cd frontend && npm install && npm run dev
```

Services:

| Service        | URL / Port        |
|----------------|-------------------|
| API            | http://localhost:8000 |
| Swagger UI     | http://localhost:8000/docs |
| Frontend (dev) | http://localhost:5173 |
| Presentation   | http://localhost:5173 *(presentation-site)* |
| PostgreSQL     | localhost:5432    |
| Redis          | localhost:6379    |

The API container bootstraps the database automatically (`bootstrap_db.py`: migrations + optional seed).

### One-command reset (recommended when things break)

```powershell
.\scripts\reset-dev.ps1
```

This stops containers, wipes the DB volume, rebuilds, seeds demo data, and waits for `/health`.

### Manual migrations

```powershell
docker compose exec api alembic upgrade head
```

### Frontend (local dev)

```powershell
cd frontend
copy .env.example .env
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

- **users** — `id`, `role`, `email`, `password_hash`, `full_name`, `created_at`
- **parking_spots** — `id`, `spot_number`, `level_zone`, `status`, `last_updated`
- **reservations** — `id`, `reservation_number`, `user_id`, `spot_id`, `vehicle_plate`, `start_time`, `end_time`, `status`, `payment_status`, `total_price`, `created_at`
- **sensor_logs** — `id`, `spot_id`, `sensor_state`, `timestamp`
- **malfunction_alerts** — تنبيهات أعطال IoT (`FAULT`)
- **payment_transactions** — سجل الدفع والاسترداد

Tables are managed with Alembic migrations (no runtime `create_all`).

```bash
# Generate a new revision after model changes
alembic revision --autogenerate -m "describe change"

# Apply migrations (Docker)
docker compose exec api alembic upgrade head

# Apply migrations (local)
alembic upgrade head

# Roll back one revision
alembic downgrade -1
```

Migrations: `001_initial_schema` → `002_add_payment_fields` → `003_diagram_alignment`

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
