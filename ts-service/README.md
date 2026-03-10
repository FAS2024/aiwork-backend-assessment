# TalentFlow TypeScript Service

NestJS service for the backend assessment: **Candidate Document Intake + Summary Workflow**.

Features:

- Upload candidate documents (resume, cover letter, etc.) with `rawText`
- Request summary generation (async via in-process queue/worker)
- List and retrieve summaries per candidate
- Workspace-scoped access: recruiters only see candidates in their workspace (`x-workspace-id` header)
- **LLM**: When `GEMINI_API_KEY` is set, uses Google Gemini for summarization; otherwise uses the in-memory fake provider (no external calls). Get a free key at [Google AI Studio](https://aistudio.google.com/apikey).

## Prerequisites

- Node.js 22+
- npm
- PostgreSQL running from repository root:

```bash
docker compose up -d postgres
```

## Setup

```bash
cd ts-service
npm install
cp .env.example .env
```

## Environment

- `PORT`
- `DATABASE_URL`
- `NODE_ENV`
- `GEMINI_API_KEY` (leave blank unless implementing a real provider)

Do not commit API keys or secrets.

Candidates may create a free Gemini API key through Google AI Studio for the full assessment implementation.

## Run Migrations

```bash
cd ts-service
npm run migration:run
```

## Run Service

```bash
cd ts-service
npm run start:dev
```

## Run Tests

```bash
cd ts-service
npm test
npm run test:e2e
```

## Fake Auth Headers

Sample endpoints in this starter are protected by a fake local auth guard.
Include these headers in requests:

- `x-user-id`: any non-empty string (example: `user-1`)
- `x-workspace-id`: workspace identifier used for scoping (example: `workspace-1`)

## Layout Highlights

- `src/auth/`: fake auth guard, user decorator, auth types
- `src/entities/`: starter entities
- `src/sample/`: tiny example module (controller/service/dto)
- `src/queue/`: in-memory queue abstraction
- `src/llm/`: provider interface + fake provider
- `src/migrations/`: TypeORM migration files
