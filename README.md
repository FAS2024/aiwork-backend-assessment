# Backend Engineering Take-Home Assessment

Two standalone backend services in one repository:

| Service | Stack | Purpose |
|---------|--------|---------|
| **python-service/** | FastAPI + SQLAlchemy | Mini Briefing Report Generator (InsightOps) |
| **ts-service/** | NestJS + TypeORM | Candidate Document Intake + Summary Workflow (TalentFlow) |

Both use a shared PostgreSQL instance (Docker). The solution is runnable locally.

---

## Table of contents

- [Quick start](#quick-start)
- [Submission checklist](#submission-checklist)
- [Prerequisites](#prerequisites)
- [1. Start PostgreSQL](#1-start-postgresql)
- [2. Run the Python Service](#2-run-the-python-service-insightops)
- [3. Run the TypeScript Service](#3-run-the-typescript-service-talentflow)
- [API overview](#api-overview)
- [Assumptions and tradeoffs](#assumptions-and-tradeoffs)
- [Design decisions](#design-decisions)

---

## Quick start

1. Start Postgres (from repo root): `docker compose up -d postgres`
2. **Python**: `cd python-service` → create venv, `pip install -r requirements.txt`, `cp .env.example .env`, `python -m app.db.run_migrations up` → `uvicorn app.main:app --reload --port 8000`
3. **TypeScript**: `cd ts-service` → `npm install`, `cp .env.example .env`, `npm run migration:run` → `npm run start:dev`

**Verify:**  
- Python: [http://localhost:8000](http://localhost:8000) → `{"service":"InsightOps","status":"ok"}` · [http://localhost:8000/health](http://localhost:8000/health) → `{"status":"ok"}`  
- TypeScript: [http://localhost:3000](http://localhost:3000) → `{"service":"TalentFlow","status":"ok"}` · [http://localhost:3000/health](http://localhost:3000/health) → `{"status":"ok"}`

---

## Submission checklist

| Requirement | Where |
|-------------|--------|
| Setup instructions | Sections 2 and 3 below |
| How to run both services | Quick start above; details in sections 2 and 3 |
| How to run migrations | Python: `python -m app.db.run_migrations up` in `python-service/`. TypeScript: `npm run migration:run` in `ts-service/` |
| How to run tests | Python: `pytest` in `python-service/`. TypeScript: `npm test` and `npm run test:e2e` in `ts-service/` |
| Assumptions and tradeoffs | Section below |
| Design decisions, schema, improvements | [NOTES.md](NOTES.md) |

---

## Prerequisites

- **Docker** (for PostgreSQL)
- **Python 3.12**
- **Node.js 22+** and **npm**

---

## 1. Start PostgreSQL

From the repository root:

```bash
docker compose up -d postgres
```

PostgreSQL runs on `localhost:5432`:

| Setting | Value |
|---------|--------|
| Database | `assessment_db` |
| User | `assessment_user` |
| Password | `assessment_pass` |

---

## 2. Run the Python Service (InsightOps)

### Setup

```bash
cd python-service
python3.12 -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

### Migrations

```bash
python -m app.db.run_migrations up
```

Roll back the latest migration:

```bash
python -m app.db.run_migrations down --steps 1
```

### Run the service

```bash
uvicorn app.main:app --reload --port 8000
```

API base: **http://localhost:8000**

### Run tests

```bash
pytest
```

Unit tests (report formatter) and integration tests (briefings API, validation). Uses in-memory SQLite for tests that need a database; no Postgres required to run tests.

---

## 3. Run the TypeScript Service (TalentFlow)

### Setup

```bash
cd ts-service
npm install
cp .env.example .env
```

For **real** LLM summarization (optional), set `GEMINI_API_KEY` in `.env`.  
Get a free key at [Google AI Studio](https://aistudio.google.com/apikey). If unset, the app uses an in-memory fake provider (no external calls).

**LLM provider (for assessment documentation):**

- **Provider:** Google Gemini API (model: `gemini-1.5-flash`).
- **Configure:** Set `GEMINI_API_KEY` in `ts-service/.env`. Do not commit this key.
- **Limitations:** Summary generation runs in-process (500ms polling). LLM output is requested as JSON and validated; malformed responses set `status: 'failed'` with an error message. Input truncated to ~28k characters.

### Migrations

```bash
npm run migration:run
```

Revert:

```bash
npm run migration:revert
```

### Run the service

```bash
npm run start:dev
```

API base: **http://localhost:3000**

### Auth headers (protected routes)

- `x-user-id`: any non-empty string (e.g. `user-1`)
- `x-workspace-id`: workspace id for scoping (e.g. `workspace-1`)

### Run tests

```bash
npm test
npm run test:e2e
```

Unit tests use mocked repositories and the fake summarization provider (no live API). E2E tests hit the real HTTP API and require Postgres running and migrations applied.

---

## API overview

### Python service — Briefings

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/briefings` | Create a briefing (JSON body per spec) |
| GET | `/briefings/{id}` | Get briefing structured data |
| POST | `/briefings/{id}/generate` | Generate and store HTML report |
| GET | `/briefings/{id}/html` | Return generated HTML report |

### TypeScript service — Candidates

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/candidates/:candidateId/documents` | Upload a document (JSON: documentType, fileName, storageKey, rawText) |
| POST | `/candidates/:candidateId/summaries/generate` | Queue summary generation (returns immediately) |
| GET | `/candidates/:candidateId/summaries` | List summaries for candidate |
| GET | `/candidates/:candidateId/summaries/:summaryId` | Get one summary |

Candidates are created via `POST /sample/candidates` (same auth headers). Documents and summaries are scoped to the recruiter’s workspace via the candidate’s `workspace_id`.

---

## Assumptions and tradeoffs

- **Python:** Metrics are optional; key points (min 2) and risks (min 1) are required. Ticker is normalized to uppercase. Metric names must be unique per briefing.
- **TypeScript:** Candidates are the existing `sample_candidates` (workspace-scoped). Document content is sent as `rawText` in the request body (no multipart file upload). Summary generation uses an in-process worker (500ms polling); production would use a proper queue (e.g. Bull/BullMQ).
- **LLM:** When `GEMINI_API_KEY` is set, Gemini 1.5 Flash is used. Output is requested as JSON and validated; malformed responses result in `status: 'failed'` with an error message stored.
- **Secrets:** No API keys or secrets are committed; use `.env` and the instructions in this README.

The solution is runnable locally: start Postgres, run migrations for each service, then start each service as above.

---

## Design decisions

See [NOTES.md](NOTES.md) for design decisions, schema rationale, and possible improvements.
