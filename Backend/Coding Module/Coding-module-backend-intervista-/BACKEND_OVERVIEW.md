# Coding Assessment Platform - Backend Overview

## 📌 Introduction
The Coding Assessment Platform is a robust, microservice-ready backend designed to evaluate candidate programming skills. Built with modern async Python standards, the API handles code submission, execution, rate limiting, and administrative functionalities for managing coding questions and candidate assessment sessions.

## 🚀 Tech Stack & Core Technologies
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Async, High-Performance)
- **Language:** Python 3.10+
- **Caching & Edge Delivery:** Redis (via `fastapi-cache` and `aioredis`), with an In-Memory fallback.
- **Security & Authorization:** JWT (JSON Web Tokens), Role-Based Access Control (RBAC).
- **Rate Limiting:** `slowapi` (Token bucket algorithm for protecting public execution endpoints).
- **Database/Storage:** Adaptable storage layer (`app/storage/`) currently supporting structured models, prepared for seamless Supabase/PostgreSQL integration.

## 🏗️ Architecture & Modules

The system is highly modularized, following standard Domain-Driven Design (DDD) principles:

### 1. **Authentication & Authorization (`app/auth/` & `app/middleware/`)**
- Middleware handles CORS and centralizes request logging.
- Dependency injection (`Dependencies`) is used extensively for securing endpoints based on `user` and `admin` roles. 
- Future state: Transitioning to Intervista centralized auth using Shared JWT configuration.

### 2. **Admin Module (`app/routes/admin.py`)**
- Secure management API endpoints requiring `X-Admin-Key` or Admin JWT.
- **Features:** 
  - Single and Bulk question creation/uploads.
  - Updating and deleting questions.
  - Viewing internal question schemas (including hidden test cases).

### 3. **Question & Content Delivery (`app/routes/question.py`)**
- **Public & Candidate Endpoints:**
  - `GET /question/random` & `GET /question/random-set` for dynamically generating question sets (Easy, Medium, Hard).
  - Language support mappings.
  - `GET /question/{id}/boilerplate` for frontend integration, injecting starter code into web IDEs.
- **Caching:** Aggressively cached using Redis to ensure high availability under heavy candidate load.

### 4. **Code Execution & Submission (`app/routes/submission.py` & `app/routes/code.py`)**
- Handles raw code running (`/code/run`) and formal test-case submissions.
- Formats code execution jobs securely, likely integrating with an isolated sandbox/compiler (e.g., Judge0 or similar background runner).

### 5. **Assessment Sessions (`app/routes/assessment.py`)**
- Groups candidate submissions into standardized sessions.
- Useful for tying candidates to specific company drives or roles.

## 📂 Directory Structure

```text
coding-platform-v6/
├── app/
│   ├── auth/         # JWT generation, token validation, and RBAC
│   ├── core/         # Core system settings, logger instances
│   ├── exceptions/   # Global exception handlers (e.g., rate limits)
│   ├── middleware/   # Cross-Origin (CORS), Request Logging
│   ├── models/       # Pydantic/Domain data models (Question, User, Submission)
│   ├── routes/       # FastAPI route definitions (Admin, Question, Code, Assessment)
│   ├── schemas/      # Input/Output validation schemas (FastAPI data contracts)
│   ├── services/     # Business logic layer (separation of concerns from routes)
│   ├── storage/      # Data persistence logic (Question Store, User Store, etc.)
│   ├── utils/        # Helpers (Rate limiter, response formatters, ID generators)
│   └── main.py       # FastAPI application entry point, lifecycle events
├── tests/            # Pytest test suites
├── requirements.txt  # Python dependencies
└── run.sh            # Local execution script (Uvicorn)
```

## 🛡️ Security Features
1. **API Rate Limiting:** Applied strictly on `/code/run` and public endpoints to prevent abuse / DOS attacks from infinite loops in submitted code.
2. **Hidden Test Cases:** Test case payloads are split between public and hidden. Hidden cases are never exposed to the client APIs unless queried with an Admin Token.
3. **Pydantic Validation:** All incoming payloads are strictly typed and sanitized before hitting the service layer.

## 🐳 Future Production Setup (DigitalOcean)
- **Containerization:** The backend is designed to run in a Docker container using a robust server like `gunicorn` with `uvicorn` workers.
- **Reverse Proxy:** Will be served behind NGINX or a similar API Gateway.
- **Environment Management:** Environment variables handle keys (`REDIS_URL`, `ADMIN_SECRET_KEY`, `JWT_SECRET`) injected securely in production.
