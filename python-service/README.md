# InsightOps Python Service

FastAPI service: **Mini Briefing Report Generator**.

- Create and retrieve briefings (company, analyst, key points, risks, optional metrics)
- Generate HTML reports via Jinja2 (view model → template; no raw request data in templates)
- Fetch generated HTML; validation (ticker uppercase, min 2 key points, min 1 risk, unique metric names per briefing)

## Prerequisites

- Python 3.12
- PostgreSQL (start from repo root: `docker compose up -d postgres`)

## Setup

```bash
cd python-service
python3.12 -m venv .venv
# Windows:
#   .venv\Scripts\activate
# macOS/Linux:
#   source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

## Environment

Copy `.env.example` to `.env`. Relevant variables:

- `DATABASE_URL` — PostgreSQL connection string (default in `.env.example` points to local Docker Postgres)
- `APP_ENV`, `APP_PORT` (optional)

## Migrations

Migrations are manual SQL; a runner tracks applied files in `schema_migrations`.

**Apply pending migrations:**

```bash
# From python-service, with venv activated
python -m app.db.run_migrations up
```

**Roll back the latest:**

```bash
python -m app.db.run_migrations down --steps 1
```

- SQL files: `db/migrations/*.sql` (up) and `*.down.sql` (rollback)
- Applied migrations are skipped on subsequent runs

## Run the service

```bash
# From python-service, with venv activated
uvicorn app.main:app --reload --port 8000
```

API base: **http://localhost:8000**

## Tests

```bash
# From python-service, with venv activated
pytest
```

- **Unit**: Report formatter (view model from briefing data)
- **Integration**: Briefings API (create, get, generate, HTML, validation, 404s)
- Uses in-memory SQLite for tests that need a DB; no Postgres required to run tests

## API — Briefings

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/briefings` | Create briefing (JSON: companyName, ticker, sector, analystName, summary, recommendation, keyPoints, risks, metrics?) |
| GET | `/briefings/{id}` | Get briefing (structured data) |
| POST | `/briefings/{id}/generate` | Generate and store HTML report |
| GET | `/briefings/{id}/html` | Get generated HTML (Content-Type: text/html) |

## Project layout

- `app/main.py` — FastAPI app, router wiring
- `app/config.py` — Settings from env
- `app/db/` — Session, migration runner
- `db/migrations/` — SQL migrations
- `app/models/` — ORM (briefings, points, metrics)
- `app/schemas/` — Pydantic (BriefingCreate, BriefingRead, report view model)
- `app/services/` — Briefing service, report formatter, Jinja report formatter
- `app/api/` — Route handlers (health, sample-items, briefings)
- `app/templates/` — Jinja templates (base, briefing_report)
- `tests/` — Pytest suite
