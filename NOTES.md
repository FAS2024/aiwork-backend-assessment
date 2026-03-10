# Design Notes and Decisions

## Part A — FastAPI / Python (Briefing Report Generator)

### Design decisions

- **Tables**: `briefings` (main), `briefing_points` (key_point / risk with `kind`), `briefing_metrics` (optional, unique name per briefing). One migration creates all three with FKs and indexes.
- **Validation**: Pydantic in `BriefingCreate`: required fields, min 2 key points, min 1 risk, unique metric names, ticker normalized to uppercase. Validation is centralized in the schema layer.
- **Report flow**: A dedicated service layer (`briefing_report_formatter`) builds a **report view model** from the ORM (sorting, grouping, display metadata). The template receives only this view model, not raw request or DB objects. HTML is rendered with Jinja2 in a separate template (`briefing_report.html`) with plain CSS; user content is escaped by Jinja’s autoescape.
- **Generated HTML**: Stored on the briefing row (`generated_html`, `generated_at`). `POST /briefings/{id}/generate` generates and stores; `GET /briefings/{id}/html` returns the stored HTML with `Content-Type: text/html`.

### Schema decisions

- Points and risks in one table (`briefing_points`) with a `kind` column to avoid duplication and keep migrations simple. `display_order` preserves input order.
- Metrics in a separate table with `UNIQUE (briefing_id, name)` to enforce “metric names unique within the same briefing” at the DB level.

### What I’d improve with more time

- Pagination or limit on `GET /briefings` if we add a list endpoint.
- Optional idempotency for report generation (e.g. only regenerate if data changed).
- Rate limiting and request validation hardening for production.

---

## Part B — NestJS / TypeScript (Candidate Documents + Summaries)

### Design decisions

- **Candidates**: Reuse existing `sample_candidates` (workspace-scoped). Access control: every document/summary path resolves the candidate first and checks `candidate.workspaceId === user.workspaceId` via `getCandidateForWorkspace`. No cross-workspace access.
- **Documents**: Table `candidate_documents` with `candidate_id`, `document_type`, `file_name`, `storage_key`, `raw_text`, `uploaded_at`. Content is submitted as `rawText` in the JSON body for simplicity and testability.
- **Summaries**: Table `candidate_summaries` with status (`pending` → `completed` or `failed`), score, strengths, concerns, summary, recommendedDecision, provider, promptVersion, errorMessage, timestamps. Matches the suggested shape from the spec.
- **Queue/worker**: The starter’s `QueueService` was extended with `registerHandler`, `dequeue`, and `processNext`. A `SummaryWorkerService` registers a handler for `generate-candidate-summary` jobs and runs `processNext()` on a 500ms interval. Generation is never done in the request cycle; the controller enqueues and returns immediately.
- **Summarization provider**: Abstract `SummarizationProvider` (injectable via `SUMMARIZATION_PROVIDER`). Two implementations: `FakeSummarizationProvider` (used when `GEMINI_API_KEY` is missing) and `GeminiSummarizationProvider` (fetch to Gemini REST API, JSON prompt, parse and validate response). Malformed or invalid LLM output is caught and the summary is saved with `status: 'failed'` and `errorMessage` set. Tests use the fake provider only.

### Schema decisions

- `candidate_documents` and `candidate_summaries` reference `sample_candidates(id)` with `ON DELETE CASCADE`. Indexes on `candidate_id` (and `status` for summaries) for common queries.
- Summary arrays (`strengths`, `concerns`) stored as PostgreSQL `text[]` with default `'{}'`.

### What I’d improve with more time

- Replace in-process polling with a real queue (e.g. Bull/BullMQ with Redis) and a separate worker process.
- Retries and dead-letter handling for failed summary jobs.
- File upload (multipart) with storage (e.g. S3/local path) and optional text extraction instead of raw text in body.
- Stricter validation of Gemini response (e.g. schema with Zod) and optional retries on parse failure.
