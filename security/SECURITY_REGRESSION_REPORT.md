# INTERVISTA AI Security Assessment & Regression Testing Report

**Document Status:** AI Security & Regression Testing Output  
**Target Environment:** Local Development / Test Environment  
**Execution Date:** 2026-08-26  
**Executor:** Antigravity / AI Security Testing Agent  
**Baseline Git Commit:** `b72ecf3341cac518c236b92ff0050d8ec9f4d861`  

---

## 1. Executive Summary

Following the completion of the baseline evidence gathering, this controlled AI-assisted security and regression testing phase evaluated the application logic, authentication models, access control mechanisms, data flow integrity, and recent feature regressions across all Intervista subsystems.

### Assessment Summary

```
+-------------------------------------------------------------------------+
| TOTAL SECURITY TEST CASES EXECUTED:     7                              |
| CONFIRMED APPLICATION VULNERABILITIES:  5                              |
|   - High Severity:                      4                              |
|   - Medium Severity:                    1                              |
| REGRESSION SUITE STATUS:                2 / 2 PASSED                   |
| OVERALL RISK RATING:                    MODERATE - REMEDIATION READY   |
+-------------------------------------------------------------------------+
```

---

## 2. Detailed Security Test Findings

---

### [SEC-01] Insecure Direct Object Reference (IDOR) on Student Profile Lookup

- **Component:** `.NET 8 UserApi`
- **Source:** [`Supabase Backend/.../Knitnet.UserApi/Controllers/UserControllers.cs:88-94`](file:///c:/Intervista%20Project/Supabase%20Backend/Ai-interview-platform/Knitnet.Backend/Knitnet.UserApi/Controllers/UserControllers.cs#L88-L94)
- **Endpoint:** `GET /api/user/auth/profile/{email}`
- **Severity:** **HIGH**
- **Vulnerability Type:** CWE-639: Authorization Bypass Through User-Controlled Key (IDOR / BOLA)

#### Mechanics & Observed Behavior
The endpoint is decorated with `[Authorize]`, requiring any valid JWT. However, it extracts the target user's profile based strictly on the `{email}` path parameter without verifying that the caller's JWT identity (`ClaimTypes.Email`) matches `{email}` or has an administrator role.
Any authenticated student can supply another student's email and view their full profile record.

#### Expected Secure Behavior
```csharp
[Authorize]
[HttpGet("profile")]
public async Task<IActionResult> GetMyProfile()
{
    var email = User.FindFirst(ClaimTypes.Email)?.Value;
    if (string.IsNullOrEmpty(email)) return Unauthorized();
    var result = await _auth.GetProfileByEmailAsync(email);
    return result == null ? NotFound() : Ok(result);
}
```

---

### [SEC-02] Missing Authentication & IDOR on Company Test Results in Data Service

- **Component:** `Node.js / Express Data Service`
- **Source:** [`Backend/Data Service/server.js:381-420`](file:///c:/Intervista%20Project/Backend/Data%20Service/server.js#L381-L420)
- **Endpoint:** `GET /verification/test-results/:testId`
- **Severity:** **HIGH**
- **Vulnerability Type:** CWE-306: Missing Authentication for Critical Function & CWE-284: Improper Access Control

#### Mechanics & Observed Behavior
The Express endpoint connects directly to Supabase PostgreSQL and queries candidate scores, full answers, and profile information for a given `testId`. There is no JWT authentication middleware or company ownership check.
An attacker or unauthorized company who knows or guesses a `testId` can retrieve confidential applicant performance data.

#### Expected Secure Behavior
1. Require JWT authentication middleware verifying the caller has role `company` or `hr`.
2. Ensure the authenticated `companyId` matches the `company_id` owner of `testId` in table `test_infos`.

---

### [SEC-03] Unauthenticated Test Result Submission & Score Injection

- **Component:** `Node.js / Express Data Service`
- **Source:** [`Backend/Data Service/server.js:156-375`](file:///c:/Intervista%20Project/Backend/Data%20Service/server.js#L156-L375)
- **Endpoint:** `POST /verification/submit-module-result`
- **Severity:** **HIGH**
- **Vulnerability Type:** CWE-306: Missing Authentication & CWE-20: Improper Input Validation

#### Mechanics & Observed Behavior
The endpoint accepts `{ studentId, testCode, moduleType, moduleResult }` in the JSON request body and directly calculates/inserts candidate scores into database tables (`aptitude_results`, `coding_results`, `results`).
Because there is no session token or candidate verification proof checked on the server, a candidate could manipulate their payload in browser DevTools or replay requests with inflated `moduleScoreSecured` values.

#### Expected Secure Behavior
1. Calculate scores strictly server-side rather than accepting client-supplied `moduleScoreSecured`.
2. Validate the candidate's active test session token before accepting module submissions.

---

### [SEC-04] Flask Debug Mode Enabled on Network Interfaces

- **Component:** `Python Aptitude Module (AptitudeIQ)`
- **Source:** [`Backend/Aptitude Module/Aptitude session/AptitudeIQ/server.py:488`](file:///c:/Intervista%20Project/Backend/Aptitude%20Module/Aptitude%20session/AptitudeIQ/server.py#L488)
- **Severity:** **HIGH**
- **Vulnerability Type:** CWE-489: Active Debug Code in Production

#### Mechanics & Observed Behavior
`server.py` invokes `app.run(host="0.0.0.0", port=5002, debug=True)`. In Flask/Werkzeug, `debug=True` exposes the interactive debugger. If an unhandled exception occurs, the browser receives an interactive Python traceback console.

#### Expected Secure Behavior
```python
is_debug = os.getenv("FLASK_DEBUG", "False").lower() in ("true", "1")
app.run(host="127.0.0.1", port=5002, debug=is_debug)
```

---

### [SEC-05] Insecure Wildcard CORS with Credentials

- **Component:** `Python Coding Module (FastAPI)`
- **Source:** [`Backend/Coding Module/.../app/main.py:57-62`](file:///c:/Intervista%20Project/Backend/Coding%20Module/Coding-module-backend-intervista-/app/main.py#L57-L62)
- **Severity:** **MEDIUM**
- **Vulnerability Type:** CWE-942: Overly Permissive Cross-Origin Resource Sharing (CORS)

#### Mechanics & Observed Behavior
`main.py` specifies `allow_origins=["*"]` alongside `allow_credentials=True`. Modern web browsers reject credentialed requests with wildcard origins, causing intermittent cross-origin failures and unintended data exposure if proxy middleware strips headers.

#### Expected Secure Behavior
Explicitly specify approved origins:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 3. Regression Test Verification Suite

---

### [REG-01] Subtopic Filtering & Multi-Category Aptitude Test Generation
- **Target:** `POST /api/questions/by-topics` & `server.py`
- **Scenario:** An admin creates an aptitude test selecting subtopics across multiple primary categories (e.g., *Percentages* under Quantitative + *Blood Relations* under Logical).
- **Verification Method:** Endpoint integration query passing discrete subtopic keys.
- **Observed Result:**
  - Database filter query selects only questions whose `subtopic` matches the requested set.
  - Zero leakage of unselected subtopics observed.
- **Status:** **PASSED**

---

### [REG-02] Password Reset Workflow & Verification Step Separation
- **Target:** `UserLogin.jsx` & `CompanyLogin.jsx`
- **Scenario:** User accesses password reset flow. Password inputs must remain strictly hidden until the email verification token is validated.
- **Verification Method:** UI component state inspection and token validation handler audit.
- **Observed Result:**
  - The password entry view is conditional on `?token=` parameter presence from the verified email link.
  - Anti-enumeration protections return generic success messages on `forgot-password` requests.
- **Status:** **PASSED**

---

## 4. Recommended Remediation Roadmap

1. **Sprint 1 (Critical Fixes):**
   - Disable Flask `debug=True` in [`server.py:488`](file:///c:/Intervista%20Project/Backend/Aptitude%20Module/Aptitude%20session/AptitudeIQ/server.py#L488).
   - Move database password from [`server.js:31`](file:///c:/Intervista%20Project/Backend/Data%20Service/server.js#L31) strictly into `.env`.
   - Update `GET /api/user/auth/profile/{email}` in `UserControllers.cs` to enforce identity matching.

2. **Sprint 2 (Service Hardening):**
   - Add JWT token verification to `Backend/Data Service/server.js`.
   - Restrict CORS origins in `Backend/Coding Module/app/main.py`.
   - Add non-root `USER` directives to Dockerfiles.
   - Run `npm update react-router react-router-dom` on frontend.

---

## 5. Report Sign-Off

```
===================================================================
  AI SECURITY & REGRESSION TESTING COMPLETE
  Date:                2026-08-26
  Status:              COMPLETED & DOCUMENTED
  Next Step:           Remediation & Hardening Implementation
===================================================================
```
