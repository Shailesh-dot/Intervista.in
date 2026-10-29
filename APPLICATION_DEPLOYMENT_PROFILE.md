# APPLICATION ARCHITECTURAL & DEPLOYMENT SPECIFICATION PROFILE
**Application Name:** Intervista AI Assessment Platform (Knitnet)  
**Target Environment:** DigitalOcean (Droplet Autoscale Pool + Load Balancer + Cloudflare)  
**Document Status:** Complete Architecture & Deployment Readiness Specification  
**Generated At:** 2026-08-28  

---

## EXECUTIVE SUMMARY

This document provides a deep, machine-audited technical profile of the **Intervista AI Assessment Platform**. It is designed to give any DevOps engineer or AI deployment architect full visibility into the system's components, protocols, data flows, external integrations, in-memory state dependencies, and autoscaling constraints **before** designing the DigitalOcean infrastructure.

---

# SECTION 1 — APPLICATION IDENTITY & STATUS

* **Application Name:** Intervista AI Assessment Platform (Codebase references: `Intervista`, `Knitnet`, `Ai-interview-platform`).
* **Short Description:** An enterprise-grade, multi-module AI recruitment and technical candidate evaluation platform with automated proctoring, coding execution, and voice-driven interviews.
* **Detailed Description:**  
  The platform orchestrates end-to-end technical hiring workflows. Candidates access tests via invitations or test codes, undergo biometric verification, and complete assessment modules (Aptitude/MCQ, Live Coding with multi-language testcase evaluation via Judge0, AI-driven conversational Technical Interview using Groq LLM and Azure Speech TTS/STT, and Verbal/Communication fluency analysis). Assessment metrics and candidate attempt histories are continuously calculated, scored, and persisted into a shared Supabase PostgreSQL database for real-time review on HR and Company dashboards.
* **Main Purpose & Target Audience:**  
  - **Candidates / Students:** Take timed, proctored assessments across coding, aptitude, communication, and technical interview modules.
  - **Recruiters / Company HR / Admins:** Create test blueprints, configure question mappings, manage candidate invites, and review auto-generated evaluation reports.
* **Application Classification:**  
  - Full-stack multi-service web application
  - REST APIs & Microservices (.NET 8, FastAPI, Express, Flask)
  - ML / AI Inference Orchestration (Groq LLM, Azure Speech SDK, Audio signal processing)
  - Real-time Audio/Video Proctoring & Streaming
* **Expected User Scale & Concurrency:**  
  - **Baseline Test Concurrency:** 50 – 100 simultaneous active test takers per cluster.
  - **Peak Request Rate:** 5 – 15 Requests Per Second (RPS) burst during concurrent interview cycles.
  - **Total User Base:** `UNKNOWN` (Targeting on-demand scalability).
* **Current Operational Status:**  
  - **Current Runtime:** Runs locally in a controlled dev/test environment using Docker Compose (`docker-compose.yml` with 12 containers) and native process runners (`start.ps1` / `start.sh`).
  - **Functionality:** Core evaluation flows, test creation, and result aggregation are functional.
  - **Tested Modules:** Frontend React build, .NET API solution build, Supabase DB queries, Judge0 execution loop, Groq LLM prompt pipelines.
  - **Untested Under Scaled Production:** Horizontal multi-instance load balancing, cross-Droplet session sharing, and live Droplet Autoscale Pool scale-in/scale-out events.

### High-Level Plain English Request Flow
```
Candidate / Recruiter (Browser)
   │
   ▼ [HTTPS Port 443]
Cloudflare (DNS, SSL, DDoS Protection)
   │
   ▼ [HTTP Port 80]
DigitalOcean Load Balancer (Round Robin / Sticky Sessions)
   │
   ▼ [Port 80]
DigitalOcean Droplet (Frontend Nginx Reverse Proxy Container)
   ├── Static Files (React SPA) ──> Served Directly from Nginx
   │
   ├── /api/user, /api/company ──> [.NET 8 Web APIs (Ports 5280, 5158)] ──> Supabase DB & Storage
   ├── /api/verification, /profile ──> [Node.js Data Service (Port 5003)] ──> Supabase PostgreSQL Pool
   ├── /api/coding ──> [FastAPI Coding Service (Port 8000)] ──> Judge0 Remote Sandbox API
   ├── /api/interview ──> [FastAPI AI Interview Service (Port 8001)] ──> Groq LLM & Azure Speech SDK
   ├── /api/communication ──> [FastAPI Verbal Service (Port 8002)] ──> Audio Analysis & Supabase DB
   ├── /api/aptitude ──> [Flask Aptitude Service (Port 5002/5000)] ──> Supabase REST API
   └── /api/proctor/* ──> [Python Proctor Services (Ports 8004, 8005)] ──> Gaze & Face Tracking
```

---

# SECTION 2 — APPLICATION ARCHITECTURE & SERVICES

The platform is structured into **12 discrete microservices and components**:

| # | Service Name | Tech / Framework | Language | Internal Port | Protocol | Public Facing? | State Behavior |
|---|---|---|---|---|---|---|---|
| **1** | `frontend` | Nginx + React 19 / Vite | JS / HTML | `80` | HTTP | **Yes** (Public Entry) | Stateless |
| **2** | `supabase-user-api` | ASP.NET Core 8 Web API | C# (.NET 8) | `5280` / `80` | HTTP | No (Via Nginx `/api/user`) | Stateless (JWT) + Temp disk (`/tmp`) |
| **3** | `supabase-company-api` | ASP.NET Core 8 Web API | C# (.NET 8) | `5158` / `80` | HTTP | No (Via Nginx `/api/company`) | Stateless (JWT) |
| **4** | `Knitnet.TransactionApi` | ASP.NET Core 8 Web API | C# (.NET 8) | `5017` / `80` | HTTP | No (Internal / Proxy) | Stateless |
| **5** | `mail-server` | Express.js | Node.js (v22) | `5000` | HTTP | No (Via Nginx `/api/*mail`) | Stateless |
| **6** | `data-service` | Express.js + `pg` Pool | Node.js (v22) | `5003` | HTTP | No (Via Nginx `/api/verification`) | Stateless |
| **7** | `coding-service` | FastAPI + Gunicorn (4 workers) | Python 3.12 | `8000` | HTTP | No (Via Nginx `/api/coding`) | Stateless (Redis / In-memory cache) |
| **8** | `interview-service` | FastAPI + Uvicorn | Python 3.10 | `8001` | HTTP | No (Via Nginx `/api/interview`) | **STATEFUL (In-Memory Session Store)** |
| **9** | `communication-service` | FastAPI + Librosa + Scipy | Python 3.10 | `8002` | HTTP | No (Via Nginx `/api/communication`) | Stateless (Per-request audio processing) |
| **10** | `aptitude-service` | Flask + pdfplumber + OCR | Python 3.10 | `5002` / `5000` | HTTP | No (Via Nginx `/api/aptitude`) | Stateless |
| **11** | `screening-service` | Express.js | Node.js | `5001` | HTTP | No (Via Nginx `/api/screening`) | Stateless |
| **12** | `face-proctor-service` | OpenCV / Python | Python 3.10 | `8004` | HTTP / Stream | No (Via Nginx `/api/proctor/face`) | Streaming state |
| **13** | `live-proctor-service` | Python Gaze Tracking | Python 3.10 | `8005` | HTTP / Stream | No (Via Nginx `/api/proctor/live`) | Streaming state |

### Service Coupling & Communication
* **Internal Communication:** All microservices run inside a private Docker bridge network (`platform-network`) and communicate over HTTP using internal Docker DNS service names (e.g., `http://data-service:5003`, `http://coding-service:8000`).
* **Packaging Model:** All services are currently packaged to run alongside each other on a single host via `docker-compose.yml`.

---

# SECTION 3 — REQUEST FLOW & MULTI-INSTANCE BEHAVIOR

### Step-by-Step Flow During an Active Assessment:
1. **Authentication & Profile:** Candidate logs in. `supabase-user-api` validates credentials and issues a signed JWT. Profile data is fetched from `data-service` via Supabase PostgreSQL.
2. **Test Lookup:** Candidate inputs `testCode`. `data-service` queries `test_infos`, `test_mappings`, and module configurations to assemble the active test blueprint.
3. **Biometric Face Gating:** Candidate completes biometric check. `interview-service` (or verification endpoint) receives verification and generates a `verify_token`.
4. **AI Interview Module Execution:**
   - Candidate uploads resume / audio intro.
   - Frontend calls `POST /api/interview/questions/generate`.
   - `interview-service` calls **Groq API** (`llama-3.3-70b-versatile`) to generate 15 personalized questions + hidden ideal answers.
   - Ideal answers and questions are stored in memory (`SESSION_STORE[session_id]`).
   - Candidate answers questions using audio (transcribed via Groq Whisper) or text. Audio prompts are synthesized via Azure TTS (`POST /api/interview/stt/synthesize`).
   - Candidate submits final answers (`POST /api/interview/evaluation/evaluate_answers`). `interview-service` reads `SESSION_STORE[session_id]`, calls Groq for lenient evaluation, returns scores, and flags `submitted = True`.
5. **Coding Module Execution:**
   - Frontend sends code to `POST /api/coding/code/run` or `/submit/run`.
   - `coding-service` encodes code in Base64 and dispatches execution payloads to the remote **Judge0 Sandbox API**.
   - Result is polled, decoded, and scored.
6. **Result Persistence:**
   - Completed module results are submitted via `POST /api/verification/submit-module-result` to `data-service`.
   - `data-service` initiates a PostgreSQL transaction (`BEGIN ... COMMIT`), writing module breakdown rows to `aptitude_results`, `coding_results`, `ai_interview_results`, or `verbal_results` and updating aggregate scores in `results`.

### ⚠️ Critical Multi-Instance Scaling Risk
> [!WARNING]
> **In-Memory State Dependency in `interview-service` (`module2_server.py`):**
> `SESSION_STORE` and `VERIFIED_SESSIONS` are Python in-memory dictionaries.
> If traffic is balanced across multiple Droplets without **Sticky Sessions (Session Affinity)**, a candidate who generated questions on Droplet A will receive `HTTP 404: Session not found` when submitting answers to Droplet B.
> **Requirement:** The DigitalOcean Load Balancer MUST use cookie-based sticky sessions, OR session state must be externalized to Redis before stateless round-robin can be used.

---

# SECTION 4 — FRONTEND

* **Framework:** React 19.2.0 + Vite 7.3.1
* **Styling:** Tailwind CSS v4.2.1 + Framer Motion + GSAP
* **Code Editor:** Monaco Editor (`@monaco-editor/react`) for coding assessments.
* **Development Command:** `npm run dev` (Runs Vite on port `5173`)
* **Production Build Command:** `npm run build` (Compiles static bundle into `dist/`)
* **Production Server:** Nginx (`nginx:alpine` via `Dockerfile` copying `dist/` to `/usr/share/nginx/html`).
* **Routing / Navigation:** React Router DOM v7 (`react-router-dom`).
* **API Route Strategy:** All API calls use relative paths (`/api/user`, `/api/company`, `/api/coding`, `/api/interview`, `/api/verification`, etc.). In production, Nginx reverse-proxies these to internal Docker service ports.
* **Client State / Storage:**
  - JWT Tokens stored in browser `localStorage`.
  - Sensitive API keys (Groq, Supabase Service Role, Database Passwords) are strictly backend-only and never exposed to the client bundle.
* **Frontend Dockerfile:**
  ```dockerfile
  FROM node:22-alpine AS build
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci
  COPY . .
  RUN npm run build

  FROM nginx:alpine
  COPY --from=build /app/dist /usr/share/nginx/html
  COPY nginx.conf /etc/nginx/conf.d/default.conf
  EXPOSE 80
  CMD ["nginx", "-g", "daemon off;"]
  ```

---

# SECTION 5 — BACKEND APIS & RUNTIME ENGINES

### 1. .NET 8 Web APIs (`Knitnet.UserApi`, `Knitnet.CompanyApi`, `Knitnet.TransactionApi`)
* **Language / Framework:** C# / .NET 8.0 SDK (ASP.NET Core Web API).
* **Database ORM:** Entity Framework Core (`Npgsql.EntityFrameworkCore.PostgreSQL`).
* **Auth & Security:** JWT Bearer authentication, ASP.NET Core Rate Limiter (Fixed window: 5 req/min for auth, 60 req/min for standard endpoints).
* **Background Jobs:** `SnapshotCleanupService` (`IHostedService`) for purging local temp verification snapshots.
* **Container Runtime:** `mcr.microsoft.com/dotnet/aspnet:8.0`.

### 2. Coding Module (`coding-service`)
* **Language / Framework:** Python 3.12 / FastAPI.
* **Production Server:** Gunicorn with 4 Uvicorn workers (`gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000`).
* **Rate Limiting:** `slowapi` (`Limiter`).
* **Caching:** `fastapi-cache2` (supports Redis backend via `REDIS_URL` or in-memory fallback).

### 3. AI Interview Module (`interview-service`)
* **Language / Framework:** Python 3.10 / FastAPI.
* **Production Server:** Uvicorn (`uvicorn module2_server:app --host 0.0.0.0 --port 8001`).
* **Request Execution Duration:**
  - Question Generation: ~2–5 seconds (Groq LLM).
  - STT Transcription: ~1–3 seconds (Groq Whisper).
  - TTS Audio Synthesis: ~1–4 seconds (Azure Speech streaming).
  - Lenient Evaluation: ~3–8 seconds (Groq LLM).

### 4. Data Service (`data-service`)
* **Language / Framework:** Node.js v22 / Express.js.
* **Database Client:** `pg` (`Pool` with max 10 connections, TCP keepalives enabled).
* **Payload Limits:** `express.json({ limit: '10mb' })`.

### 5. Aptitude Module (`aptitude-service`)
* **Language / Framework:** Python 3.10 / Flask.
* **Features:** OCR processing via `tesseract-ocr` & `pdfplumber`, Supabase REST requests.

---

# SECTION 6 — AI / MACHINE LEARNING & SPEECH SERVICES

* **Inference Model Hosting:**
  - **Local GPU Required?** **NO**. Local Droplets do not require GPU hardware.
  - All large-model LLM inferences and heavy speech transcriptions are offloaded to high-throughput cloud APIs.
* **External AI Models:**
  - **LLM Engine:** Groq API (`llama-3.3-70b-versatile`) for 15-question customized generation and batch lenient answer evaluation.
  - **STT (Speech-to-Text):** Groq Whisper (`whisper-large-v3`) via audio multipart upload.
  - **TTS (Text-to-Speech):** Azure Cognitive Services Speech SDK (`centralindia` region, voice `en-IN-ArjunNeural` / custom voices).
* **Local Signal & CV Processing (CPU-bound):**
  - OpenCV (`opencv-python-headless`) for video feed analysis and face bounding boxes.
  - `librosa`, `scipy`, `pydub`, `phonemizer`, and `espeak-ng` for audio pitch, pause, WPM fluency, and tone calculations.

---

# SECTION 7 — DATABASE ARCHITECTURE

* **Database Engine:** PostgreSQL 15.8.
* **Host Location:** Hosted externally on **Supabase Cloud** (`aws-1-ap-south-1.pooler.supabase.com:5432`).
* **Connection Routing:**
  - **Pooler URL:** Connected via Supabase PgBouncer pooler (Port `5432` / `6543`, transaction pooling mode).
  - **SSL Mode:** `Require` (`Trust Server Certificate = true` / `rejectUnauthorized: false`).
* **Cataloged Tables:** 82 tables audited, including:
  - Core User & Org: `candidates`, `company_hr`, `companies`, `user_profiles`, `user_accounts`.
  - Test & Mapping Config: `test_infos`, `test_mappings`, `aptitude_mappings`, `coding_mappings`, `verbal_mappings`, `ai_interview_mappings`.
  - Assessment Results: `results`, `aptitude_results`, `coding_results`, `ai_interview_results`, `verbal_results`.
  - Question Banks: `coding_questions`, `aptitude_questions`, `verbal_questions`.
* **Database Scaling Advantage:**
  Because the database is already fully externalized to Supabase, multiple autoscaled DigitalOcean Droplets can safely connect concurrently without risking database duplication or disk split-brain.

---

# SECTION 8 — CACHING, SESSIONS & QUEUES

* **Redis Usage:**
  - Supported in `coding-service` via `REDIS_URL`. If no `REDIS_URL` is configured, it falls back to `InMemoryBackend`.
  - **Deployment Opportunity:** Deploying a managed Redis or standalone Redis container allows edge caching and can serve as the shared session store for `interview-service`.
* **Message Queues:**
  - No active RabbitMQ / Kafka / Celery queues. All operations currently execute over asynchronous HTTP requests.

---

# SECTION 9 — FILES, OBJECT STORAGE & DISK PERSISTENCE

* **Cloud Object Storage (Supabase Storage):**
  - Bucket `profile-images`: Candidate profile avatars.
  - Bucket `company-logos`: Company branding logos.
  - Bucket `verification-docs`: Identity verification artifacts.
* **Local Ephemeral Disk Paths:**
  - `Knitnet.UserApi`: Writes temporary snapshot files to `/tmp/verification` before purging via `SnapshotCleanupService`.
  - `interview-service`: In-memory byte buffers (`io.BytesIO`) for audio streaming.
* **Multi-Droplet Storage Safety:**
  No permanent user data or reports rely on local droplet disk storage. All persistent assets are saved to Supabase Cloud Storage or PostgreSQL.

---

# SECTION 10 — EXTERNAL SERVICES & APIS

| Service | Provider | Purpose | Authentication | Inbound IP Allowlist Needed? |
|---|---|---|---|---|
| **Supabase PostgreSQL** | Supabase (AWS ap-south-1) | Primary relational database | Connection string / DB Password | No (Public pooler with SSL) |
| **Supabase Storage** | Supabase | Object storage for images/docs | `SUPABASE_SERVICE_ROLE_KEY` | No |
| **Groq Cloud API** | Groq Inc. | LLM question generation & Whisper STT | `GROQ_API_KEY` (Bearer token) | No |
| **Azure Speech Services** | Microsoft Azure | TTS audio synthesis | `AZURE_SPEECH_KEY`, Region | No |
| **Judge0 Sandbox** | RapidAPI / Self-hosted | Remote code execution compiler | `X-Auth-Token` / API Key | No |
| **Brevo (Sendinblue)** | Brevo | Transactional emails / verification | `BREVO_API_KEY` | No |
| **Gmail SMTP** | Google | Legacy fallback contact form | App Password (`EMAIL_PASS`) | No |

---

# SECTION 11 — VECTOR DATABASE & RAG

* **Vector Database:** `N/A` (None currently in use).
* **Context Retrieval:** Dynamic question generation is driven by structured JSON profile summaries passed directly into Groq LLM system/user prompts.

---

# SECTION 12 — AUTHENTICATION & STATE MANAGEMENT

* **Authentication Protocol:** JWT (JSON Web Tokens) with HMAC-SHA256 signatures.
* **Token Expiry:** 3 hours.
* **Issuer / Audience:** `Issuer: KnitnetBackend`, `Audience: KnitnetFrontend`.
* **Role Separation:**
  - Candidate Bearer JWT (Access to assessment test routes).
  - HR / Company Bearer JWT (Access to candidate results & test creation).
  - Admin Header (`X-Admin-Key` for coding question management).
* **Sticky Sessions Requirement:** **YES**. Required at Load Balancer layer until `interview-service` session dictionary is externalized.

---

# SECTION 13 — REAL-TIME & STREAMING FEATURES

* **HTTP Streaming:**
  - `POST /stt/synthesize`: Streams WAV audio bytes back to browser via FastAPI `StreamingResponse`.
  - Proctoring Video Feeds: MJPEG streaming on ports `8004`/`8005`.
* **WebSockets:** Not active in current production reverse proxy.
* **Load Balancer Read Timeout:** Nginx is configured with `proxy_read_timeout 300s` to prevent premature disconnections during long AI evaluation or speech generation cycles.

---

# SECTION 14 — DOCKER & CONTAINER SPECIFICATION

* **Container Compose Inventory:** 12 services connected via `platform-network` (bridge).
* **Architecture:** `linux/amd64` (Standard x86_64 Droplets).
* **Base Images:**
  - Frontend: `node:22-alpine` -> `nginx:alpine`
  - .NET APIs: `mcr.microsoft.com/dotnet/aspnet:8.0`
  - Python APIs: `python:3.12-slim` and `python:3.10-slim`
  - Node Services: `node:22-alpine`
* **Local Run Command:**
  ```bash
  docker compose up -d --build
  ```

---

# SECTION 15 — ENVIRONMENT VARIABLES

> [!NOTE]
> All secret values are parameterized. Real secrets must be injected securely at runtime.

| Variable Name | Component | Purpose | Required? | Secret? | Same Across All Droplets? |
|---|---|---|---|---|---|
| `DATABASE_URL` | Data Service / .NET | PostgreSQL Supabase connection string | **Yes** | **Yes** | Yes |
| `SUPABASE_URL` | All Services | Supabase project API URL | **Yes** | No | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend APIs | Supabase Admin API key | **Yes** | **Yes** | Yes |
| `SUPABASE_ANON_KEY` | Aptitude / Frontend | Supabase public client key | **Yes** | No | Yes |
| `GROQ_API_KEY` | AI Interview / Coding | Groq LLM API authentication | **Yes** | **Yes** | Yes |
| `AZURE_SPEECH_KEY` | AI Interview | Azure Speech TTS authentication | **Yes** | **Yes** | Yes |
| `AZURE_SPEECH_REGION` | AI Interview | Azure data center region (`centralindia`) | **Yes** | No | Yes |
| `DEFAULT_VOICE` | AI Interview | TTS voice model (`en-IN-ArjunNeural`) | Optional | No | Yes |
| `JUDGE0_URL` | Coding Module | Endpoint for remote code execution | **Yes** | No | Yes |
| `JUDGE0_API_KEY` | Coding Module | Judge0 Auth token | Optional | **Yes** | Yes |
| `REDIS_URL` | Coding Module | Redis cache connection string | Optional | **Yes** | Yes |
| `BREVO_API_KEY` | Mail Server | Brevo transactional email API key | **Yes** | **Yes** | Yes |
| `BREVO_SENDER_EMAIL` | Mail Server | Verified sender address | **Yes** | No | Yes |
| `FRONTEND_URL` | All Backends | Public domain URL for CORS validation | **Yes** | No | Yes |
| `JWT_SECRET_KEY` | .NET APIs | Cryptographic signing key for JWTs | **Yes** | **Yes** | Yes |
| `NODE_ENV` | Node Services | Environment flag (`production`) | **Yes** | No | Yes |

---

# SECTION 16 — NETWORKING & PORT ALLOCATIONS

### Port Map:
* **Public Port:** Port `80` (HTTP) / Port `443` (HTTPS on Load Balancer / Cloudflare).
* **Internal Ports (Bound inside Docker network):**
  - `80`: Frontend static assets & Nginx Reverse Proxy
  - `5000`: Node.js User Mail Server / Flask fallback
  - `5001`: Node.js Company Mail Server / Screening Service
  - `5002`: Python Flask Aptitude Service
  - `5003`: Node.js Data Service
  - `5017`: .NET Knitnet.TransactionApi
  - `5158`: .NET Knitnet.CompanyApi
  - `5280`: .NET Knitnet.UserApi
  - `8000`: Python FastAPI Coding Assessment Service
  - `8001`: Python FastAPI AI Interview Module
  - `8002`: Python FastAPI Communication Module
  - `8004`: Python Face Proctor Service
  - `8005`: Python Live Gaze Proctor Service

---

# SECTION 17 — CURRENT DEPLOYMENT PROFILE

* **Current Host:** Local developer workstation (Windows 11 / PowerShell).
* **Current Start Command:** `.\start.ps1` (Native multi-window launcher) or `docker compose up -d`.
* **Current Reverse Proxy:** Nginx (`Ai-interview-platform/nginx.conf`) routing `/api/*` requests to respective backend ports.

---

# SECTION 18 — PERFORMANCE & RESOURCE SIZING

### Per-Droplet Resource Consumption (All 12 Containers Running):
* **Memory (RAM):**
  - Python AI & Speech Services: ~1.5 GB – 2.5 GB (with PyTorch / audio libraries loaded in memory).
  - .NET 8 Web APIs (3 APIs): ~600 MB total.
  - Node.js Services (Data + Mail): ~300 MB total.
  - Frontend Nginx: ~50 MB.
  - **Minimum Recommended Droplet RAM:** **8 GB** (e.g., DigitalOcean `s-4vcpu-8gb` or `c-4` compute optimized).
* **CPU:**
  - Steady state: <10% utilization.
  - Peak evaluation / concurrent audio processing: 40%–70% across 4 vCPUs.

---

# SECTION 19 — SCALING BEHAVIOR & AUTOSCALE POOL

* **Autoscale Trigger Metrics:**
  - **CPU Utilization:** Scale out when average CPU exceeds **70%** for >2 minutes; scale in when below **30%**.
  - **Memory Utilization:** Scale out when RAM exceeds **75%**.
* **Instance Homogeneity:** Every Droplet in the Autoscale Pool runs the exact same Docker Compose stack behind the DigitalOcean Load Balancer.
* **Zero Shared Disk Requirement:** Instances can be spawned and destroyed dynamically without data loss because persistent data resides in Supabase.

---

# SECTION 20 — FAILURE & RECOVERY BEHAVIOR

* **Container Crash:** Docker process manager (`restart: always`) restarts failed containers within seconds.
* **Droplet Termination / Scale-In:**
  - DigitalOcean Load Balancer stops routing new traffic to terminating Droplet.
  - Database transactions are atomic (`BEGIN ... COMMIT`), preventing corrupted partial results.
  - If a Droplet dies during an active AI interview, the candidate's in-memory session is lost unless Sticky Sessions routed them or session state is stored in Redis.

---

# SECTION 21 — HEALTH CHECKS & READINESS PROBES

* **Load Balancer Health Check Target:**
  - **Protocol:** HTTP
  - **Port:** `80`
  - **Path:** `/` (Frontend index) or `/api/verification/health` (Data Service)
  - **Response:** `200 OK`
* **Microservice Health Endpoints:**
  - `GET /api/coding/health` -> `{"status": "ok"}`
  - `GET /api/interview/health` -> `{"status": "ok", "active_sessions": N}`
  - `GET /api/verification/health` -> `{"status": "ok", "service": "data-service"}`

---

# SECTION 22 — DOMAIN, DNS & CLOUDFLARE

* **DNS Provider:** Cloudflare.
* **SSL / TLS Termination:**
  - Cloudflare Edge SSL (`Full (Strict)` mode).
  - DigitalOcean Load Balancer terminates SSL or proxies Port 80 directly from Cloudflare origin.
* **Domain Names:** Configured via Cloudflare DNS A/CNAME records pointing to DigitalOcean Load Balancer IP.

---

# SECTION 23 — SECURITY & COMPLIANCE FINDINGS

1. **CORS Whitelisting:**
   - Currently, `.NET` and `FastAPI` backends contain hardcoded CORS origins `http://localhost:5173`.
   - **Remediation:** Must inject `FRONTEND_URL` (production domain) into container environment variables.
2. **Database Credentials:**
   - Fallback connection string in `Backend/Data Service/server.js` contains hardcoded credentials.
   - **Remediation:** Require `DATABASE_URL` strictly from environment variables; remove hardcoded fallbacks.
3. **Flask Debug Mode:**
   - `Backend/Aptitude Module/Aptitude session/AptitudeIQ/server.py` had `debug=True`.
   - **Remediation:** Ensure `debug=False` when running in production container.

---

# SECTION 24 — TESTING OBJECTIVES (DIGITALOCEAN TEST ENVIRONMENT)

The controlled DigitalOcean deployment test aims to validate:
1. **Docker Container Stack Stability:** All 12 containers build, launch, and stay healthy on a DigitalOcean Droplet.
2. **Load Balancer Traffic Distribution:** DigitalOcean Load Balancer correctly balances HTTP traffic across multiple identical Droplets.
3. **Sticky Session Persistence:** Multi-step AI interview sessions and audio uploads complete without `404 Session not found` errors.
4. **Autoscale Pool Lifecycle:** Autoscale Pool adds new Droplets under simulated load and drains them smoothly when idle.
5. **Database Concurrency:** Supabase connection pooler handles simultaneous connections from multiple Droplet instances without connection starvation.

---

# SECTION 25 — KNOWN CONTRADICTIONS & ISSUES CATALOG

| # | Contradiction / Issue | Location | Impact on Deployment | Solution / Recommendation |
|---|---|---|---|---|
| **1** | **In-Memory Session Store** | `Backend/AI Interview Module/chumma/module2_server.py` | Multi-instance autoscale pool will cause session 404s if candidate hits different droplets. | Enable Load Balancer **Sticky Sessions** (Cookie-based), or move `SESSION_STORE` to Redis. |
| **2** | **Hardcoded Localhost CORS** | `.NET Program.cs` & `FastAPI main.py` | Production browser requests will be blocked by CORS policy. | Parameterize CORS origins to accept `FRONTEND_URL` environment variable. |
| **3** | **Port Divergence** | `nginx.conf` vs `start.ps1` | `Aptitude` runs on 5000 in Docker Nginx, 5002 in local PowerShell. | Standardize internal Docker port mappings to match `nginx.conf`. |
| **4** | **Missing Proctor Subdirectories** | `docker-compose.yml` lines 137, 148 | `docker compose build` may fail if `Continuous monitoring` folders are missing. | Verify proctoring module folder paths before container image building. |

---

# SECTION 26 — CODEBASE FILES & CONFIGURATION REPOSITORY

* **Docker Configurations:**
  - `docker-compose.yml` (Root multi-container orchestration)
  - `Ai-interview-platform/Dockerfile` (React Nginx multi-stage build)
  - `Supabase Backend/Ai-interview-platform/Knitnet.Backend/Dockerfile` (.NET 8 SDK multi-project build)
  - `Backend/Coding Module/Coding-module-backend-intervista-/Dockerfile` (Python 3.12 + Gunicorn)
  - `Backend/Communication Module/communication_module/Dockerfile` (Python 3.10 + Audio libraries)
  - `Backend/Aptitude Module/Aptitude session/AptitudeIQ/Dockerfile` (Python 3.10 + OCR)
  - `Backend/Data Service/Dockerfile` (Node.js Express)
* **Reverse Proxy Configuration:**
  - `Ai-interview-platform/nginx.conf` (Complete route mapping for all 12 microservices)
* **Startup Scripts:**
  - `start.ps1` (PowerShell multi-service launcher)
  - `start.sh` (Bash multi-service runner)
* **Security & Audit Records:**
  - `security/SECURITY_BASELINE.md` (Comprehensive security audit baseline)
  - `security/reports/api-inventory.json` (93 cataloged API routes)

---

# FINAL SECTION — APPLICATION DEPLOYMENT PROFILE

```
================================================================================
APPLICATION DEPLOYMENT PROFILE SUMMARY
================================================================================
Application:             Intervista AI Assessment Platform (Knitnet)
Primary Tech Stacks:     React 19 / Vite, ASP.NET Core 8, FastAPI, Express, Flask
Containerization:        Docker & Docker Compose (12 services)
Public Port:             80 (HTTP) -> Forwarded from Load Balancer (443 HTTPS)
Database:                PostgreSQL 15.8 on Supabase Cloud (External / Shared)
Object Storage:          Supabase Storage (profile-images, company-logos)
External AI APIs:        Groq LLM, Groq Whisper STT, Azure Cognitive Speech TTS
Code Execution Sandbox:  Judge0 Remote API
State Dependency:        In-Memory (interview-service) -> REQUIRES STICKY SESSIONS
Recommended Droplet:     DigitalOcean Basic/General Purpose: 4 vCPU / 8 GB RAM min
Autoscale Strategy:      DigitalOcean Droplet Autoscale Pool (70% CPU threshold)
Load Balancer:           DigitalOcean Load Balancer with Cookie-based Sticky Sessions
DNS / Edge Proxy:        Cloudflare (Full Strict SSL, DDoS Protection, CNAME)
================================================================================
```

### Unknown Information & Open Decisions
* **Exact Production Domain Name:** `UNKNOWN` (To be determined at Cloudflare setup).
* **Judge0 Hosted vs Cloud API:** `UNKNOWN` (RapidAPI Judge0 vs dedicated self-hosted Judge0 instance).
* **Redis Deployment Mode:** `UNKNOWN` (Standalone container on droplet vs Managed Redis cluster).
