# How to Run and Test — Pre-Submission Verification

This guide walks through starting both services and hitting **every endpoint** with sample payloads so you can confirm everything works before submitting.

**Placeholders:** Replace these with values from the previous step’s response. Do **not** type the placeholder text literally or the server will return 404.

| Placeholder        | From which response                                   | Example value                          |
| ------------------ | ----------------------------------------------------- | -------------------------------------- |
| `{{BRIEFING_ID}}`  | `id` from **POST /briefings**                         | `1`                                    |
| `{{CANDIDATE_ID}}` | `id` from **POST /sample/candidates**                 | `cddee997-bb99-41b5-93ad-80e47e5aba93` |
| `{{SUMMARY_ID}}`   | `id` from **POST /candidates/.../summaries/generate** | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |

Use the same shell (Bash, PowerShell, or CMD) for the whole flow so variable syntax matches.

---

## Prerequisites

- **Docker** (for PostgreSQL)
- **Python 3.12**
- **Node.js 22+** and **npm**
- **curl** (Windows 10+ and Git Bash include it; PowerShell: use `curl.exe` as shown)

---

## 1. Start PostgreSQL

From the **repository root** (same in all shells):

```bash
docker compose up -d postgres
```

**PowerShell / CMD:** Same command. Wait until Postgres is ready. Database: `assessment_db`, user: `assessment_user`, password: `assessment_pass` on `localhost:5432`.

---

## 2. Python Service (InsightOps) — Port 8000

### 2.1 One-time setup

**Bash (macOS / Linux / Git Bash):**

```bash
cd python-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

**PowerShell:**

```powershell
cd python-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

**CMD:**

```cmd
cd python-service
python -m venv .venv
.venv\Scripts\activate.bat
pip install -r requirements.txt
copy .env.example .env
```

Ensure `.env` contains:

```
DATABASE_URL=postgresql+psycopg://assessment_user:assessment_pass@localhost:5432/assessment_db
```

### 2.2 Migrations

```bash
python -m app.db.run_migrations up
```

(Same in PowerShell and CMD.)

### 2.3 Run the service

```bash
uvicorn app.main:app --reload --port 8000
```

(Same in PowerShell and CMD. Use a second terminal for the next steps.)

### 2.4 Verify Python endpoints

**Health / root** (same in all shells):

```bash
curl -s http://localhost:8000/
curl -s http://localhost:8000/health
```

Expected: `{"service":"InsightOps","status":"ok"}` and `{"status":"ok"}`.

---

**POST /briefings** — Create a briefing

**Bash:**

```bash
curl -s -X POST http://localhost:8000/briefings \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Acme Corp","ticker":"ACME","sector":"Technology","analystName":"Jane Doe","summary":"Strong quarter with revenue beat. Management raised guidance.","recommendation":"Buy","keyPoints":["Revenue up 15% YoY","Margin expansion in cloud segment","New product launch in Q3"],"risks":["Competition in core segment"],"metrics":[{"name":"Revenue (M)","value":"1,250"},{"name":"EPS","value":"2.40"}]}'
```

**PowerShell:**

```powershell
curl.exe -s -X POST http://localhost:8000/briefings -H "Content-Type: application/json" -d "{\"companyName\":\"Acme Corp\",\"ticker\":\"ACME\",\"sector\":\"Technology\",\"analystName\":\"Jane Doe\",\"summary\":\"Strong quarter with revenue beat. Management raised guidance.\",\"recommendation\":\"Buy\",\"keyPoints\":[\"Revenue up 15% YoY\",\"Margin expansion in cloud segment\",\"New product launch in Q3\"],\"risks\":[\"Competition in core segment\"],\"metrics\":[{\"name\":\"Revenue (M)\",\"value\":\"1,250\"},{\"name\":\"EPS\",\"value\":\"2.40\"}]}"
```

**CMD:**

```cmd
curl.exe -s -X POST http://localhost:8000/briefings -H "Content-Type: application/json" -d "{\"companyName\":\"Acme Corp\",\"ticker\":\"ACME\",\"sector\":\"Technology\",\"analystName\":\"Jane Doe\",\"summary\":\"Strong quarter with revenue beat. Management raised guidance.\",\"recommendation\":\"Buy\",\"keyPoints\":[\"Revenue up 15% YoY\",\"Margin expansion in cloud segment\",\"New product launch in Q3\"],\"risks\":[\"Competition in core segment\"],\"metrics\":[{\"name\":\"Revenue (M)\",\"value\":\"1,250\"},{\"name\":\"EPS\",\"value\":\"2.40\"}]}"
```

**Expected:** `201` with JSON containing `id`. **Set `{{BRIEFING_ID}}` to that `id`** (e.g. `1`) for the next steps.

---

**GET /briefings/{{BRIEFING_ID}}** — Get briefing

Replace `{{BRIEFING_ID}}` with the id from the previous response (e.g. `1`). Same in all shells:

```bash
curl -s http://localhost:8000/briefings/{{BRIEFING_ID}}
```

**PowerShell / CMD:** Use the same URL with your id, e.g. `curl -s http://localhost:8000/briefings/1`.

---

**POST /briefings/{{BRIEFING_ID}}/generate** — Generate HTML report

```bash
curl -s -X POST http://localhost:8000/briefings/{{BRIEFING_ID}}/generate
```

(Same in PowerShell/CMD; replace `{{BRIEFING_ID}}` with your id.) Expected: `{"status":"generated","id":...}`.

---

**GET /briefings/{{BRIEFING_ID}}/html** — Get generated HTML

```bash
curl -s http://localhost:8000/briefings/{{BRIEFING_ID}}/html
```

(Same in PowerShell/CMD.) Expected: Full HTML page.

---

## 3. TypeScript Service (TalentFlow) — Port 3000

Use a **second terminal**; keep Python running in the first.

### 3.1 One-time setup

**Bash:**

```bash
cd ts-service
npm install
cp .env.example .env
```

**PowerShell:**

```powershell
cd ts-service
npm install
Copy-Item .env.example .env
```

**CMD:**

```cmd
cd ts-service
npm install
copy .env.example .env
```

Optional: set `GEMINI_API_KEY` in `.env` for real LLM summarization. If unset, the fake in-memory provider is used.

### 3.2 Migrations

```bash
npm run migration:run
```

(Same in PowerShell and CMD.)

### 3.3 Run the service

```bash
npm run start:dev
```

(Same in PowerShell and CMD.)

### 3.4 Auth headers (required for all candidate/sample endpoints)

- `x-user-id`: e.g. `user-1`
- `x-workspace-id`: e.g. `workspace-1`

Use these in every request below. **Never** put the literal text `{{CANDIDATE_ID}}` or `{{SUMMARY_ID}}` in the URL — replace them with actual ids from the API responses.

### 3.5 Verify TypeScript endpoints

**Health / root** (same in all shells):

```bash
curl -s http://localhost:3000/
curl -s http://localhost:3000/health
```

Expected: `{"service":"TalentFlow","status":"ok"}` and `{"status":"ok"}`.

---

**POST /sample/candidates** — Create a candidate

**Bash:**

```bash
curl -s -X POST http://localhost:3000/sample/candidates \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-1" \
  -H "x-workspace-id: workspace-1" \
  -d '{"fullName":"Alice Smith","email":"alice@example.com"}'
```

**PowerShell:**

```powershell
curl.exe -s -X POST http://localhost:3000/sample/candidates -H "Content-Type: application/json" -H "x-user-id: user-1" -H "x-workspace-id: workspace-1" -d "{\"fullName\":\"Alice Smith\",\"email\":\"alice@example.com\"}"
```

**CMD:**

```cmd
curl.exe -s -X POST http://localhost:3000/sample/candidates -H "Content-Type: application/json" -H "x-user-id: user-1" -H "x-workspace-id: workspace-1" -d "{\"fullName\":\"Alice Smith\",\"email\":\"alice@example.com\"}"
```

**Expected:** `201` with JSON containing `id` (a UUID). **Set `{{CANDIDATE_ID}}` to that value** and use it in all following candidate URLs.

---

**POST /candidates/{{CANDIDATE_ID}}/documents** — Upload a document

Replace `{{CANDIDATE_ID}}` in the URL with the id from **POST /sample/candidates**.

**Bash:**

```bash
curl -s -X POST "http://localhost:3000/candidates/{{CANDIDATE_ID}}/documents" \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-1" \
  -H "x-workspace-id: workspace-1" \
  -d '{"documentType":"resume","fileName":"alice-resume.txt","storageKey":"workspace-1/alice/resume-1","rawText":"Alice Smith. Senior Engineer. 5 years experience. Skills: TypeScript, Node.js, Python."}'
```

**PowerShell:**

```powershell
curl.exe -s -X POST "http://localhost:3000/candidates/{{CANDIDATE_ID}}/documents" -H "Content-Type: application/json" -H "x-user-id: user-1" -H "x-workspace-id: workspace-1" -d "{\"documentType\":\"resume\",\"fileName\":\"alice-resume.txt\",\"storageKey\":\"workspace-1/alice/resume-1\",\"rawText\":\"Alice Smith. Senior Engineer. 5 years experience. Skills: TypeScript, Node.js, Python.\"}"
```

**CMD:**

```cmd
curl.exe -s -X POST "http://localhost:3000/candidates/{{CANDIDATE_ID}}/documents" -H "Content-Type: application/json" -H "x-user-id: user-1" -H "x-workspace-id: workspace-1" -d "{\"documentType\":\"resume\",\"fileName\":\"alice-resume.txt\",\"storageKey\":\"workspace-1/alice/resume-1\",\"rawText\":\"Alice Smith. Senior Engineer. 5 years experience. Skills: TypeScript, Node.js, Python.\"}"
```

In PowerShell/CMD, replace `{{CANDIDATE_ID}}` in the URL with your actual candidate UUID before running.

**Expected:** `201` with document `id`, `candidateId`, `documentType`, `fileName`, `storageKey`, `uploadedAt`.

---

**POST /candidates/{{CANDIDATE_ID}}/summaries/generate** — Queue summary generation (202 Accepted)

**Bash:**

```bash
curl -s -X POST "http://localhost:3000/candidates/{{CANDIDATE_ID}}/summaries/generate" \
  -H "x-user-id: user-1" \
  -H "x-workspace-id: workspace-1"
```

**PowerShell / CMD:**

```powershell
curl.exe -s -X POST "http://localhost:3000/candidates/{{CANDIDATE_ID}}/summaries/generate" -H "x-user-id: user-1" -H "x-workspace-id: workspace-1"
```

Replace `{{CANDIDATE_ID}}` with your candidate UUID. **Expected:** `202` with body containing `id` and `status":"pending"`. **Set `{{SUMMARY_ID}}` to that summary `id`** for the next request.

---

**GET /candidates/{{CANDIDATE_ID}}/summaries** — List summaries

**Bash:**

```bash
curl -s "http://localhost:3000/candidates/{{CANDIDATE_ID}}/summaries" \
  -H "x-user-id: user-1" \
  -H "x-workspace-id: workspace-1"
```

**PowerShell / CMD:**

```powershell
curl.exe -s "http://localhost:3000/candidates/{{CANDIDATE_ID}}/summaries" -H "x-user-id: user-1" -H "x-workspace-id: workspace-1"
```

Replace `{{CANDIDATE_ID}}` with your candidate UUID. Expected: JSON array of summaries. Poll again after a few seconds to see `status` change to `completed` or `failed`.

---

**GET /candidates/{{CANDIDATE_ID}}/summaries/{{SUMMARY_ID}}** — Get one summary

**Bash:**

```bash
curl -s "http://localhost:3000/candidates/{{CANDIDATE_ID}}/summaries/{{SUMMARY_ID}}" \
  -H "x-user-id: user-1" \
  -H "x-workspace-id: workspace-1"
```

**PowerShell / CMD:**

```powershell
curl.exe -s "http://localhost:3000/candidates/{{CANDIDATE_ID}}/summaries/{{SUMMARY_ID}}" -H "x-user-id: user-1" -H "x-workspace-id: workspace-1"
```

Replace both `{{CANDIDATE_ID}}` and `{{SUMMARY_ID}}` with the ids from **POST /sample/candidates** and **POST .../summaries/generate**. Expected: Single summary object with `status`, `score`, `strengths`, `concerns`, `summary`, `recommendedDecision`, etc.

---

## 4. Quick checklist before submission

| Check                  | Command / action                                                                  |
| ---------------------- | --------------------------------------------------------------------------------- |
| Postgres running       | `docker compose ps` → postgres up                                                 |
| Python root            | `curl -s http://localhost:8000/` → `"service":"InsightOps"`                       |
| Python health          | `curl -s http://localhost:8000/health` → `"status":"ok"`                          |
| Python create briefing | POST /briefings → 201, note `{{BRIEFING_ID}}`                                     |
| Python get briefing    | GET /briefings/{{BRIEFING_ID}} → 200                                              |
| Python generate        | POST /briefings/{{BRIEFING_ID}}/generate → `{"status":"generated"}`               |
| Python HTML            | GET /briefings/{{BRIEFING_ID}}/html → 200, HTML                                   |
| TS root                | `curl -s http://localhost:3000/` → `"service":"TalentFlow"`                       |
| TS health              | `curl -s http://localhost:3000/health` → `"status":"ok"`                          |
| TS create candidate    | POST /sample/candidates → 201, note `{{CANDIDATE_ID}}`                            |
| TS upload document     | POST /candidates/{{CANDIDATE_ID}}/documents → 201                                 |
| TS generate summary    | POST /candidates/{{CANDIDATE_ID}}/summaries/generate → 202, note `{{SUMMARY_ID}}` |
| TS list summaries      | GET /candidates/{{CANDIDATE_ID}}/summaries → 200, array                           |
| TS get summary         | GET /candidates/{{CANDIDATE_ID}}/summaries/{{SUMMARY_ID}} → 200                   |

---

## 5. Run tests (optional but recommended)

**Python** (from `python-service/`): `pytest` — same in all shells. Uses in-memory SQLite.

**TypeScript** (from `ts-service/`): `npm test` then `npm run test:e2e` — same in all shells. E2E requires Postgres and migrations.

---

## 6. Troubleshooting

- **Python: "Briefing not found"** — Use the actual `id` from POST /briefings as `{{BRIEFING_ID}}`.
- **Python: 422 validation** — keyPoints (≥2), risks (≥1), non-empty; metric names unique.
- **TS: 401 / no response** — Send both `x-user-id` and `x-workspace-id`.
- **TS: 404 "Candidate not found"** — You used the literal `{{CANDIDATE_ID}}` or a wrong id. Use the UUID from POST /sample/candidates.
- **TS: 404 on summary** — Use the summary `id` from POST .../summaries/generate as `{{SUMMARY_ID}}`.
- **TS: Summary stays "pending"** — Worker polls every 500ms; wait a few seconds and GET summaries again.

Once all checklist items pass and tests are green, you’re ready to submit.
