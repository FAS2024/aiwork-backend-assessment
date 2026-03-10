# Backend Engineering Take-Home Assessment

This repository contains two standalone backend services:

- **python-service/** (InsightOps): FastAPI + SQLAlchemy — Mini Briefing Report Generator
- **ts-service/** (TalentFlow): NestJS + TypeORM — Candidate Document Intake + Summary Workflow

Both services use a shared PostgreSQL instance (via Docker). The solution is runnable locally following the steps below.

## Submission checklist

- **Setup instructions**: See sections 2 and 3 below.
- **How to run both services**: Start Postgres (section 1), then run each service (sections 2 and 3).
- **How to run migrations**: Python: `python -m app.db.run_migrations up` in `python-service/`. TypeScript: `npm run migration:run` in `ts-service/`.
- **How to run tests**: Python: `pytest` in `python-service/`. TypeScript: `npm test` and `npm run test:e2e` in `ts-service/`.
- **Assumptions and tradeoffs**: See "Assumptions and tradeoffs" at the end of this file.
- **Design decisions, schema decisions, improvements**: See [NOTES.md](NOTES.md).

## Prerequisites

- Docker
- Python 3.12
- Node.js 22+
- npm

## 1. Start PostgreSQL

From the repository root:

```bash
docker compose up -d postgres
```

PostgreSQL runs on `localhost:5432`:

- database: `assessment_db`
- user: `assessment_user`
- password: `assessment_pass`

## 2. Run the Python Service (InsightOps)

### Setup

```bash
cd python-service
python3.12 -m venv .venv
# On Windows: .venv\Scripts\activate
# On macOS/Linux: source .venv/bin/activate
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

API base: `http://localhost:8000`

### Run tests

```bash
pytest
```

## 3. Run the TypeScript Service (TalentFlow)

### Setup

```bash
cd ts-service
npm install
cp .env.example .env
```

For **real** LLM summarization (optional), add a Gemini API key to `.env`:

```
GEMINI_API_KEY=your_key_here
```

Get a free key at [Google AI Studio](https://aistudio.google.com/apikey). If unset, the app uses an in-memory fake provider (no external calls).

**LLM provider (for assessment documentation):**

- **Provider used**: Google Gemini API (model: `gemini-1.5-flash`).
- **Configure locally**: Set `GEMINI_API_KEY` in `ts-service/.env`. Do not commit this key; it is not in the repo.
- **Assumptions/limitations**: Summary generation runs in-process on a 500ms polling loop; for production you would use a proper job queue (e.g. Bull/BullMQ). LLM output is requested as JSON and parsed/validated; malformed responses are caught and the summary is saved with `status: 'failed'` and an error message. Input text is truncated to ~28k characters to stay within model limits.

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

API base: `http://localhost:3000`

### Fake auth headers

Use these headers on protected routes:

- `x-user-id`: any non-empty string (e.g. `user-1`)
- `x-workspace-id`: workspace id for access scoping (e.g. `workspace-1`)

### Run tests

```bash
npm test
npm run test:e2e
```

Unit tests use mocked repositories and the fake summarization provider (no live API calls).

## API Overview

### Python service — Briefings

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/briefings` | Create a briefing (JSON body per spec) |
| GET    | `/briefings/{id}` | Get briefing structured data |
| POST   | `/briefings/{id}/generate` | Generate and store HTML report |
| GET    | `/briefings/{id}/html` | Return generated HTML report |

### TypeScript service — Candidates

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/candidates/:candidateId/documents` | Upload a candidate document (JSON: documentType, fileName, storageKey, rawText) |
| POST   | `/candidates/:candidateId/summaries/generate` | Queue summary generation (returns immediately) |
| GET    | `/candidates/:candidateId/summaries` | List summaries for candidate |
| GET    | `/candidates/:candidateId/summaries/:summaryId` | Get one summary |

Candidates are created via the existing sample endpoint `POST /sample/candidates` (same auth headers). Documents and summaries are scoped to the recruiter’s workspace via the candidate’s `workspace_id`.

## Assumptions and tradeoffs

- **Python**: Briefing metrics are optional; key points (min 2) and risks (min 1) are required. Ticker is normalized to uppercase. Metric names must be unique per briefing.
- **TypeScript**: Candidates are the existing `sample_candidates` (workspace-scoped). File content is passed as `rawText` in the request (no multipart file upload). Summary generation runs in a background worker (in-process polling every 500ms); for production you would use a proper job queue (e.g. Bull/BullMQ).
- **LLM**: Gemini 1.5 Flash is used when `GEMINI_API_KEY` is set. Structured output is requested via JSON in the prompt; responses are parsed and validated. Invalid/malformed output is caught and the summary is marked as `failed` with an error message.
- **Secrets**: No API keys or secrets are committed; use `.env` and document in README.

Your solution should be runnable locally: start Postgres with `docker compose up -d postgres`, then run migrations and each service as above.

## Design decisions and schema notes

See [NOTES.md](NOTES.md) for design decisions, schema rationale, and possible improvements.
