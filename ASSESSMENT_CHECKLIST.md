# Assessment Requirements Verification

This checklist confirms each requirement from the Backend Engineering Take-Home Assessment is implemented.

---

## Submission Requirements

| Requirement | Status | Where |
|-------------|--------|--------|
| 1. Link to public GitHub repository | ✓ You provide | Submit when handing in |
| 2. README.md with setup instructions | ✓ | Root `README.md` — sections 1–3 |
| 2. How to run both services | ✓ | README: Start Postgres, then uvicorn (Python) and npm run start:dev (TS) |
| 2. How to run migrations | ✓ | README: `python -m app.db.run_migrations up` and `npm run migration:run` |
| 2. How to run tests (if any) | ✓ | README: `pytest` (Python), `npm test` + `npm run test:e2e` (TS) |
| 2. Assumptions or tradeoffs | ✓ | README: "Assumptions and tradeoffs" section |
| 3. NOTES.md (or README section): design decisions | ✓ | `NOTES.md` — design decisions for Part A and B |
| 3. Schema decisions | ✓ | `NOTES.md` — schema decisions |
| 3. What you would improve with more time | ✓ | `NOTES.md` — "What I'd improve with more time" |
| Solution runnable locally | ✓ | README: Docker Postgres + run commands for both services |

---

## Repository Structure

| Requirement | Status | Where |
|-------------|--------|--------|
| Work within existing structure | ✓ | `python-service/` and `ts-service/` unchanged layout |
| Do not replace architecture | ✓ | Same stacks (FastAPI, NestJS), same patterns (routers, modules, migrations) |

---

## Part A — FastAPI / Python: Mini Briefing Report Generator

### Functional Requirements

| Requirement | Status | Where |
|-------------|--------|--------|
| Store a briefing | ✓ | `POST /briefings` → `briefing_service.create_briefing` → `briefings` + `briefing_points` + `briefing_metrics` |
| Validate content | ✓ | `BriefingCreate` in `app/schemas/briefing.py`: all required fields, ticker uppercase, ≥2 key points, ≥1 risk, unique metric names |
| Generate report payload from stored data | ✓ | `briefing_to_report_view_model()` builds view model from ORM |
| Render professional HTML via server-side template | ✓ | Jinja2 `briefing_report.html`, `ReportFormatter.render_briefing_report()` |

### Required API Endpoints

| Endpoint | Status | Implementation |
|----------|--------|----------------|
| POST /briefings | ✓ | `app/api/briefings.py` — creates briefing, returns BriefingRead |
| GET /briefings/{id} | ✓ | Returns stored structured data (BriefingRead) |
| POST /briefings/{id}/generate | ✓ | Reads data → view model → render HTML → store → mark generated_at |
| GET /briefings/{id}/html | ✓ | Returns HTML (HTMLResponse), not JSON |

### Data Modeling

| Requirement | Status | Where |
|-------------|--------|--------|
| Main briefing record | ✓ | Table `briefings` (migration 002), model `Briefing` |
| Multiple key points | ✓ | Table `briefing_points` with kind='key_point' |
| Multiple risks | ✓ | Same table with kind='risk' |
| Multiple metrics | ✓ | Table `briefing_metrics` |
| Sensible, normalized, migrations | ✓ | FKs, UNIQUE(briefing_id, name), indexes in `002_create_briefings.sql` |

### Validation

| Rule | Status | Where |
|------|--------|--------|
| companyName required | ✓ | Field(min_length=1) |
| ticker required, normalized to uppercase | ✓ | Field + normalize_ticker validator |
| summary required | ✓ | Field(min_length=1) |
| recommendation required | ✓ | Field(min_length=1) |
| At least 2 key points | ✓ | Field(min_length=2) + model_validator (non-empty after strip) |
| At least 1 risk | ✓ | Field(min_length=1) + model_validator |
| Metric names unique within briefing | ✓ | field_validator unique_metric_names + DB UNIQUE |
| Clean and consistent | ✓ | All in Pydantic schema layer |

### HTML Rendering

| Requirement | Status | Where |
|-------------|--------|--------|
| Server-side template engine (e.g. Jinja2) | ✓ | Jinja2 in `report_formatter.py`, template `briefing_report.html` |
| Not one large string in Python | ✓ | Dedicated template file; variables passed to template |
| Report title/header | ✓ | `<header>` with `report_title`, ticker, sector, analyst_name |
| Company information block | ✓ | Section "Company" |
| Executive summary | ✓ | Section "Executive Summary" |
| Key points section | ✓ | Section "Key Points" with `<ul>` |
| Risks section | ✓ | Section "Risks" with `<ul>` |
| Recommendation section | ✓ | Section "Recommendation" |
| Metrics section | ✓ | Section "Metrics" with table |
| Generated timestamp/footer | ✓ | `<footer>` with generated_at_display and generated_at_iso |
| Semantic, structured HTML | ✓ | header, sections, lists, table, footer |
| Basic styling with plain CSS | ✓ | Inline `<style>` in template |
| Professional internal report look | ✓ | Typography, spacing, sections |
| Handle missing optional metrics | ✓ | `{% if metrics %}` wraps metrics section |
| Escape user input safely | ✓ | Jinja2 autoescape enabled (default_for_string=True) |
| No frontend framework | ✓ | Backend-rendered HTML only |

### Formatting / Transformation

| Requirement | Status | Where |
|-------------|--------|--------|
| Do not pass request data directly to template | ✓ | Template receives view model from `briefing_to_report_view_model()` |
| Service/formatter layer | ✓ | `briefing_report_formatter.py` (view model), `report_formatter.py` (render) |
| Transform DB records → report view model | ✓ | `ReportViewModel` with report_title, key_points, risks, generated_at_*, etc. |
| Sorting/display order | ✓ | ORM relationship order_by display_order, id |
| Group key points separate from risks | ✓ | View model has key_points and risks lists; template separate sections |
| Report title, display-ready metadata | ✓ | report_title, generated_at_iso, generated_at_display in view model |

---

## Part B — NestJS / TypeScript: Candidate Document Intake + Summary Workflow

### Functional Requirements

| Requirement | Status | Where |
|-------------|--------|--------|
| Upload candidate documents | ✓ | POST /candidates/:candidateId/documents, DTO + CandidateDocument entity |
| Document: candidate association, type, file name, storage key, raw text | ✓ | candidateId, documentType, fileName, storageKey, rawText in entity and DTO |
| Request summary generation | ✓ | POST /candidates/:candidateId/summaries/generate |
| Queue summary generation | ✓ | Creates pending summary, enqueues job, returns 202 Accepted |
| Process in worker | ✓ | SummaryWorkerService: reads documents → provider → persist → status completed/failed |
| List summaries for candidate | ✓ | GET /candidates/:candidateId/summaries |
| Retrieve single summary | ✓ | GET /candidates/:candidateId/summaries/:summaryId |

### Required API Endpoints

| Endpoint | Status | Implementation |
|----------|--------|----------------|
| POST /candidates/:candidateId/documents | ✓ | `CandidatesController.createDocument` |
| POST /candidates/:candidateId/summaries/generate | ✓ | Creates pending summary, enqueues, returns 202 |
| GET /candidates/:candidateId/summaries | ✓ | listSummaries |
| GET /candidates/:candidateId/summaries/:summaryId | ✓ | getSummary |

### Data Modeling

| Requirement | Status | Where |
|-------------|--------|--------|
| Candidate document: id, candidateId, documentType, fileName, storageKey, rawText, uploadedAt | ✓ | `CandidateDocument` entity + migration |
| Candidate summary: id, candidateId, status, score, strengths, concerns, summary, recommendedDecision, provider, promptVersion, errorMessage, createdAt, updatedAt | ✓ | `CandidateSummary` entity + migration |
| Proper migrations, relational design | ✓ | `1720000000000-CandidateDocumentsAndSummaries.ts`, FKs to sample_candidates, indexes |

### Access Control

| Requirement | Status | Where |
|-------------|--------|--------|
| Recruiters belong to workspace | ✓ | Uses starter's x-workspace-id header |
| Only access candidates in own workspace | ✓ | getCandidateForWorkspace(candidateId, user) filters by workspaceId on every operation |
| Clean, reasonable enforcement | ✓ | Single helper; all document/summary endpoints call it first |
| Starter auth/access patterns | ✓ | FakeAuthGuard, CurrentUser, AuthUser.workspaceId |

### Queue / Worker

| Requirement | Status | Where |
|-------------|--------|--------|
| Summary generation asynchronous | ✓ | Controller enqueues; worker processes in background |
| Use queue/worker pattern from starter | ✓ | QueueService extended with registerHandler, dequeue, processNext |
| Not in controller request cycle | ✓ | generateSummary only creates record + enqueue; worker does LLM call |
| Correct status transitions | ✓ | pending → completed or failed in worker |
| Clean queue usage | ✓ | Named job, typed payload, single handler |
| Separation API vs background | ✓ | Controller + CandidatesService vs SummaryWorkerService |
| Failure handling | ✓ | try/catch in worker; failed status + errorMessage |

### Summarization Provider

| Requirement | Status | Where |
|-------------|--------|--------|
| No hardcoded LLM in controllers/workers/core services | ✓ | Inject SUMMARIZATION_PROVIDER; worker calls interface |
| Provider abstraction (e.g. SummarizationProvider, generateCandidateSummary(input)) | ✓ | `summarization-provider.interface.ts` |
| Real LLM API through abstraction | ✓ | GeminiSummarizationProvider calls Gemini REST API when GEMINI_API_KEY set |
| Structured output: score, strengths, concerns, summary, recommendedDecision | ✓ | CandidateSummaryResult interface; provider returns it |
| Request structured format, validate before save | ✓ | JSON prompt; parseAndValidate in Gemini provider |
| Handle invalid/malformed output gracefully | ✓ | try/catch; save status failed + errorMessage |
| Document: which LLM, how to configure, assumptions/limitations | ✓ | README: "LLM provider (for assessment documentation)" |
| No API keys in repo; env vars; setup in README | ✓ | GEMINI_API_KEY in .env; README instructions |
| Tests not dependent on live API | ✓ | FakeSummarizationProvider when key unset; unit tests mock repos |

---

## General Expectations

| Criterion | Status |
|-----------|--------|
| Correctness | ✓ End-to-end flows implemented and testable |
| Code quality | ✓ Readable, modular (services, DTOs, entities, routers) |
| Maintainability | ✓ Clear separation: API → service → repository / worker → provider |
| Schema and migration quality | ✓ Normalized tables, FKs, constraints, indexes |
| Validation discipline | ✓ Pydantic (Python), class-validator (TS DTOs) |
| Async/background workflow | ✓ Queue + worker; 202 Accepted for generate |
| Access control awareness | ✓ Workspace-scoped on every candidate operation |
| Documentation | ✓ README runnable without guessing; NOTES explains decisions |
| Work within existing structure | ✓ No new stacks or project layout changes |
| Clear, maintainable changes | ✓ Follows starter patterns |
| Model data well | ✓ Relational design, sensible fields |
| Separate concerns | ✓ View model vs template; provider vs worker vs controller |
| Useful tests | ✓ Python: briefings create/get/generate/html + validation; TS: candidates service with mocks |
| Explain decisions | ✓ NOTES.md design and schema sections |
| Focused, not overly ambitious | ✓ No extra features beyond spec |

---

## Summary

- **Submission**: README and NOTES satisfy all requested items; solution is runnable locally.
- **Part A**: All four endpoints, relational model, validation, Jinja2 report with view model, and HTML requirements are met.
- **Part B**: All four endpoints, document/summary models, workspace access control, queue/worker with status handling, and provider abstraction with real LLM and docs are met.
- **General**: Code quality, validation, async design, access control, and documentation align with the evaluation criteria.

If you need to double-check a specific requirement, use the "Where" column to open the referenced file or section.
