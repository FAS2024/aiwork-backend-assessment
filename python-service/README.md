# InsightOps Python Service

FastAPI service for the backend assessment: **Mini Briefing Report Generator**.

Features:

- Create and retrieve briefings (structured company/analyst data)
- Generate HTML reports via Jinja2 and a report view model
- Fetch generated HTML
- Validation: required fields, ticker uppercase, min 2 key points, min 1 risk, unique metric names per briefing

## Prerequisites

- Python 3.12
- PostgreSQL running from repository root:

```bash
docker compose up -d postgres
```

## Setup

```bash
cd python-service
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
```

## Environment

`.env.example` includes:

- `DATABASE_URL`
- `APP_ENV`
- `APP_PORT`

## Run Migrations (Manual SQL Runner)

Apply pending migrations:

```bash
cd python-service
source .venv/bin/activate
python -m app.db.run_migrations up
```

Roll back the latest migration:

```bash
cd python-service
source .venv/bin/activate
python -m app.db.run_migrations down --steps 1
```

How it works:

- SQL files live in `python-service/db/migrations/`
- A `schema_migrations` table tracks applied filenames
- Up files are applied in sorted filename order (`*.sql` or `*.up.sql`)
- Rollback uses a paired `*.down.sql` file for each applied migration
- Applied migration files are skipped on subsequent runs

## Run Service

```bash
cd python-service
source .venv/bin/activate
python -m uvicorn app.main:app --reload --port 8000
```

## Run Tests

```bash
cd python-service
source .venv/bin/activate
python -m pytest
```

## Project Layout

- `app/main.py`: FastAPI bootstrap and router wiring
- `app/config.py`: environment config
- `app/db/`: SQLAlchemy session management and migration runner
- `db/migrations/`: SQL migration files
- `app/models/`: ORM models
- `app/schemas/`: Pydantic request/response schemas
- `app/services/`: service-layer logic and template helpers
- `app/api/`: route handlers
- `app/templates/`: Jinja templates
- `tests/`: test suite
