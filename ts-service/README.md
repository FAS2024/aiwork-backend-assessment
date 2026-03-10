# TalentFlow TypeScript Service

NestJS service: **Candidate Document Intake + Summary Workflow**.

- Upload candidate documents (resume, cover letter, other) with `documentType`, `fileName`, `storageKey`, `rawText`
- Request summary generation (async; returns 202 Accepted, worker processes in background)
- List and get summaries per candidate; workspace-scoped access (`x-workspace-id` header)
- **LLM**: With `GEMINI_API_KEY` set, uses Google Gemini; otherwise an in-memory fake provider (no external calls). Free key: [Google AI Studio](https://aistudio.google.com/apikey).

## Prerequisites

- Node.js 22+
- npm
- PostgreSQL (start from repo root: `docker compose up -d postgres`)

## Setup

```bash
cd ts-service
npm install
cp .env.example .env
```

Optional: set `GEMINI_API_KEY` in `.env` for real summarization. Do not commit secrets.

## Environment

- `PORT` — Server port (default 3000)
- `DATABASE_URL` — PostgreSQL URL (default in `.env.example` matches Docker)
- `NODE_ENV` — e.g. development
- `GEMINI_API_KEY` — Optional; leave blank to use the fake provider

## Migrations

```bash
# From ts-service
npm run migration:run
```

Revert last migration:

```bash
npm run migration:revert
```

## Run the service

```bash
# From ts-service
npm run start:dev
```

API base: **http://localhost:3000**

## Auth headers (protected routes)

All candidate and sample endpoints require:

- `x-user-id` — Any non-empty string (e.g. `user-1`)
- `x-workspace-id` — Workspace id for scoping (e.g. `workspace-1`)

## Tests

```bash
# From ts-service
npm test
npm run test:e2e
```

- **Unit**: Candidates service, summary worker (mocked repos and fake provider; no live API)
- **E2E**: Full HTTP flow (create candidate → document → request summary → list/get). Requires Postgres running and migrations applied (`docker compose up -d postgres` from repo root, then `npm run migration:run`).

## API — Candidates

Candidates are created via `POST /sample/candidates` (same auth headers). Then:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/candidates/:candidateId/documents` | Upload document (JSON: documentType, fileName, storageKey, rawText) |
| POST | `/candidates/:candidateId/summaries/generate` | Queue summary (202 Accepted) |
| GET | `/candidates/:candidateId/summaries` | List summaries |
| GET | `/candidates/:candidateId/summaries/:summaryId` | Get one summary |

## Project layout

- `src/main.ts` — Bootstrap, global ValidationPipe
- `src/app.module.ts` — Root module
- `src/auth/` — Fake auth guard, `CurrentUser` decorator, auth types
- `src/config/` — TypeORM config and options
- `src/entities/` — TypeORM entities (sample_candidates, candidate_documents, candidate_summaries)
- `src/candidates/` — Candidates module (controller, service, worker, DTOs)
- `src/sample/` — Sample module (create/list candidates)
- `src/queue/` — In-memory queue (enqueue, processNext, handlers)
- `src/llm/` — Summarization provider interface, fake and Gemini implementations
- `src/migrations/` — TypeORM migrations
- `test/` — E2E specs (health, candidates)
