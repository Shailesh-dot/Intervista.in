# Intervista Coding Module — k6 Production Load Test Suite

Enterprise-grade load test simulating **59 concurrent candidates** navigating the real end-to-end coding assessment workflow on **Intervista** (`https://intervista.in`).

---

## 1. Candidate Workflow Simulated

Every virtual user (VU) executes the authentic candidate journey mapped directly from the frontend React components and backend microservices:

```text
[VU Candidate]
   │
   ├─► 1. POST /api/user/auth/login                         (Authenticate & acquire JWT Bearer token)
   ├─► 2. GET  /api/user/profile/me                         (Fetch candidate profile using Bearer token)
   ├─► 3. POST /api/coding/assessment/start                 (Initialize 60-min assessment session)
   ├─► 4. GET  /api/coding/question/                        (Retrieve curated question list)
   ├─► 5. GET  /api/coding/question/{id}/boilerplate        (Fetch Python starter code & metadata)
   ├─► 6. POST /api/coding/submit/run                       (Interactive test execution with sample stdin)
   ├─► 7. POST /api/coding/submit/                          (Submit solution for full test-case grading)
   ├─► 8. GET  /api/coding/submit/{id}/status               (Poll every 1.5s until completed/failed)
   ├─► 9. POST /api/coding/assessment/{id}/complete         (Finalize assessment session)
   └─► 10. GET /api/coding/submit/candidate/{id}            (Retrieve candidate submission history)
```

---

## 2. Prerequisites & k6 Installation

### Windows (PowerShell)
Install k6 using Windows Package Manager (winget) or Chocolatey:

```powershell
# Option A: Via winget (recommended)
winget install grafana.k6

# Option B: Via Chocolatey
choco install k6

# Option C: Direct MSI download
# Download from https://dl.k6.io/msi/k6-latest-amd64.msi and run the installer
```

After installation, verify k6 in a new PowerShell window:
```powershell
k6 version
```

---

## 3. Account Preparation & Configuration

The test assigns **exactly one unique account per VU** (`users[__VU - 1]`). No account is shared between virtual users.

### 1. Configure Candidate Accounts
Edit `users.csv` in this directory (`c:\Intervista Project\load-tests\k6-coding\users.csv`):

```csv
email,password
candidate01@example.com,CandidatePass123!
candidate02@example.com,CandidatePass123!
...
candidate59@example.com,CandidatePass123!
```

> **Note:** A starter `users.csv` is already created with `loadtest_user@example.invalid` in slot 1 for instant smoke-testing. `users.csv` is included in `.gitignore` to prevent committing real candidate passwords.

---

## 4. Execution Commands (PowerShell)

### A. 1-User Smoke Test (Verification)
Run a single user through the full 10-stage journey to verify network connectivity, authentication, and execution:

```powershell
cd "c:\Intervista Project\load-tests\k6-coding"
k6 run --env VUS=1 --env K6_THINK_TIME=1 coding_workflow.js
```

### B. Primary 59-User Concurrent Test
Executes exactly 59 virtual users concurrently, each executing 1 complete candidate session:

```powershell
cd "c:\Intervista Project\load-tests\k6-coding"
k6 run --env VUS=59 --env BASE_URL="https://intervista.in" coding_workflow.js
```

### C. Output Results to JSON / CSV
To save metrics to disk for analysis:

```powershell
k6 run --env VUS=59 --summary-export="summary-59.json" coding_workflow.js
```

---

## 5. Advanced & Ramping Configurations

### Running 100 Users
Ensure `users.csv` has at least 100 entries, then run:
```powershell
k6 run --env VUS=100 coding_workflow.js
```

### Staggered Ramping Test (Mitigate Instant Rate-Limit Bursts)
To test smooth candidate arrival over 2 minutes instead of an instant spike:

```powershell
k6 run --stage 30s:20 --stage 1m:59 --stage 30s:0 coding_workflow.js
```

---

## 6. Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `BASE_URL` | `https://intervista.in` | Application root URL (points to Cloudflare/Load Balancer) |
| `VUS` | `59` | Number of concurrent candidate virtual users |
| `K6_THINK_TIME` | `2` | Pause in seconds between candidate actions (think time) |
| `POLL_INTERVAL` | `1.5` | Interval in seconds between Judge0 status polling requests |
| `POLL_TIMEOUT_SEC`| `45` | Maximum seconds to wait for Judge0 execution before timing out |

---

## 7. Custom Metrics Reference

| Metric | Type | Meaning | Target Healthy Range |
|---|---|---|---|
| `login_duration` | Trend | Time taken to authenticate with .NET UserApi | < 5,000 ms |
| `assessment_start_duration` | Trend | Time to start session in Coding Service | < 1,000 ms |
| `coding_question_duration` | Trend | Time to fetch questions from Coding Service | < 500 ms |
| `boilerplate_duration` | Trend | Time to retrieve language starter code | < 500 ms |
| `code_run_duration` | Trend | Interactive test execution round-trip | < 3,000 ms |
| `code_submit_duration` | Trend | Time to enqueue graded submission | < 1,500 ms |
| `code_execution_duration` | Trend | End-to-end time until Judge0 finishes evaluation | < 15,000 ms |
| `total_candidate_duration`| Trend | Total time for candidate from login to completion | < 45,000 ms |
| `http_429_count` | Counter | Number of rate-limited requests encountered | Investigated below |
| `http_500_count` | Counter | Server errors encountered (e.g. pool exhaustion) | 0 |

---

## 8. Critical Pre-Flight Bottlenecks & Rate-Limit Risks

### 1. Coding Module `slowapi` Rate Limit (5 requests / min)
- **Location:** `app/routes/submission.py` (`@limiter.limit("5/minute")` on `/submit/run` and `/submit/`).
- **Mechanism:** Keyed by `get_remote_address` (`request.client.host`). Behind Nginx without `ProxyHeadersMiddleware`, all incoming traffic shares the Nginx internal container IP (`172.18.0.x`).
- **Expected Behavior under 59 users:** The first 5 requests will succeed; subsequent requests arriving within the same 1-minute window will encounter **HTTP 429 Too Many Requests**. The test tracks this via `http_429_count`.

### 2. Supabase Session Pooler Ceiling
- Supabase Session Pooler (port 5432) has a configured ceiling (e.g. pool size 48).
- Simultaneous login bursts from 59 users dispatch 59 parallel database queries through the .NET UserApi, while the Coding Module also dispatches queries via SQLAlchemy.
- If the pool reaches capacity, requests may return HTTP 500 with `EMAXCONNSESSION`.

### 3. Judge0 Batch Queue Concurrency
- 59 candidates submitting code generate ~590 individual test case executions (10 test cases per question).
- Judge0 processes jobs according to its worker concurrency. Result polling accommodates this with configurable `POLL_TIMEOUT_SEC` (default: 45s).

---

## 9. Server Monitoring Checklist During Test

Monitor these components while running the test:

1. **DigitalOcean Droplets:**
   - Run `htop` or `docker stats` on the VM.
   - Watch CPU usage across .NET UserApi (BCrypt hashing) and Coding Service (Python/Gunicorn).
2. **DigitalOcean Load Balancer:**
   - Check connection counts and HTTP 5xx / 4xx pass-through rates.
3. **Supabase Dashboard:**
   - Navigate to *Database -> Connection Pooler*.
   - Watch Active Client Connections vs. Pool Size.
4. **Judge0 Cluster:**
   - Run `docker stats judge0-server judge0-workers` to monitor worker utilization.

---

## 10. How to Safely Stop the Test

To abort an active test immediately:
- Press `Ctrl + C` in the PowerShell terminal running k6.
- k6 will halt new requests and flush all collected metrics to the console summary.
