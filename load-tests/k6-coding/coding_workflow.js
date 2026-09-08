import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import { SharedArray } from 'k6/data';

// ─── Metrics Definition ───────────────────────────────────────────────────────
const loginDuration = new Trend('login_duration', true);
const profileDuration = new Trend('profile_duration', true);
const assessmentStartDuration = new Trend('assessment_start_duration', true);
const questionFetchDuration = new Trend('coding_question_duration', true);
const boilerplateDuration = new Trend('boilerplate_duration', true);
const codeRunDuration = new Trend('code_run_duration', true);
const codeSubmitDuration = new Trend('code_submit_duration', true);
const codeExecutionDuration = new Trend('code_execution_duration', true);
const totalCandidateDuration = new Trend('total_candidate_duration', true);

const http429Count = new Counter('http_429_count');
const http500Count = new Counter('http_500_count');
const stageFailures = new Counter('stage_failures');

const loginSuccessRate = new Rate('login_success_rate');
const assessmentStartSuccessRate = new Rate('assessment_start_success_rate');
const runSuccessRate = new Rate('run_success_rate');
const submitSuccessRate = new Rate('submit_success_rate');
const executionSuccessRate = new Rate('execution_success_rate');

// ─── Test User Data Ingestion ─────────────────────────────────────────────────
// Reads users from CSV (format: email,password). Strict 1:1 mapping per VU.
const users = new SharedArray('candidate_accounts', function () {
  let fileContent;
  try {
    fileContent = open('./users.csv');
  } catch (e) {
    fileContent = open('./users.template.csv');
  }

  const lines = fileContent.trim().split('\n');
  const records = [];
  // Skip header if present
  const startIdx = lines[0].toLowerCase().includes('email') ? 1 : 0;
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    if (parts.length >= 2) {
      records.push({
        email: parts[0].trim(),
        password: parts[1].trim(),
      });
    }
  }
  return records;
});

// ─── Environment & Runtime Configuration ──────────────────────────────────────
const BASE_URL = (__ENV.BASE_URL || 'https://intervista.in').replace(/\/+$/, '');
const VUS = parseInt(__ENV.VUS || '59', 10);
const THINK_TIME = parseFloat(__ENV.K6_THINK_TIME || '2');
const POLL_INTERVAL = parseFloat(__ENV.POLL_INTERVAL || '1.5');
const POLL_TIMEOUT_SEC = parseInt(__ENV.POLL_TIMEOUT_SEC || '45', 10);

export const options = {
  scenarios: {
    // Primary scenario: 59 concurrent candidates executing 1 full session
    concurrent_candidates: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1,
      maxDuration: '10m',
    },
  },
  thresholds: {
    // Note on 429s: The Coding Service slowapi enforces 5/min per client IP.
    // In production behind Nginx without ProxyHeadersMiddleware, all requests
    // share the Nginx container IP (172.18.0.x). We permit expected 429s while ensuring
    // the application services stay healthy and responsive.
    'http_req_failed': ['rate<0.60'],
    'http_req_duration': ['p(95)<15000'],
    'login_duration': ['p(95)<15000'],
    'login_success_rate': ['rate>0.95'],
  },
};

// ─── Helper Functions ─────────────────────────────────────────────────────────
function safeJson(res) {
  try {
    return res.json();
  } catch (e) {
    return null;
  }
}

function logStageError(stage, vu, status, detail) {
  stageFailures.add(1);
  if (status === 429) http429Count.add(1);
  if (status >= 500) http500Count.add(1);

  // Safe logging: never prints passwords, tokens, or personal identifiers
  const cleanDetail = typeof detail === 'string' ? detail.replace(/bearer\s+[a-zA-Z0-9._-]+/gi, '[REDACTED_TOKEN]') : '';
  console.warn(`[${stage}] VU=${vu} Status=${status} ${cleanDetail ? 'Detail: ' + cleanDetail.substring(0, 150) : ''}`);
}

// Canonical Python solution for q_sum_of_digits (Sum of Digits)
const SOLUTION_SUM_OF_DIGITS = `def sum_of_digits(n):
    return sum(int(d) for d in str(n))

if __name__ == '__main__':
    n = int(input())
    print(sum_of_digits(n))
`;

// ─── Main Scenario Function (Per Candidate VU) ────────────────────────────────
export default function () {
  const vuId = __VU;
  const candidateStartTime = Date.now();

  // 1. Account Assignment (Strict 1:1 per VU with wrap-around protection)
  const userAccount = users.length > 0
    ? users[(vuId - 1) % users.length]
    : { email: `candidate_${vuId}@example.invalid`, password: 'DefaultPassword123!' };

  const candidateEmail = userAccount.email;
  const candidatePassword = userAccount.password;

  let authToken = null;
  let userId = null;
  let sessionId = null;
  let activeQuestionId = 'q_sum_of_digits';
  let activeLanguage = 'python';
  let sourceCode = SOLUTION_SUM_OF_DIGITS;

  // ════════════════════════════════════════════════════════════════════════════
  // STAGE 1: Authentication / Login (.NET UserApi)
  // ════════════════════════════════════════════════════════════════════════════
  {
    const loginPayload = JSON.stringify({
      email: candidateEmail,
      password: candidatePassword,
    });

    const loginHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const res = http.post(`${BASE_URL}/api/user/auth/login`, loginPayload, {
      headers: loginHeaders,
      tags: { name: 'POST /api/user/auth/login' },
    });

    loginDuration.add(res.timings.duration);
    const body = safeJson(res);
    const success = Boolean(res.status === 200 && body && (body.token || body.Token));

    loginSuccessRate.add(success);
    check(res, {
      'login: status is 200': (r) => r.status === 200,
      'login: received valid token': () => success,
    });

    if (!success) {
      logStageError('LOGIN', vuId, res.status, body?.error || body?.message || 'Login failed');
      return; // Cannot continue without auth
    }

    authToken = body.token || body.Token;
    userId = body.userId || body.UserId;
  }

  if (THINK_TIME > 0) sleep(THINK_TIME);

  // ════════════════════════════════════════════════════════════════════════════
  // STAGE 2: Candidate Profile Fetch (.NET UserApi)
  // ════════════════════════════════════════════════════════════════════════════
  {
    const authHeaders = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    };

    const res = http.get(`${BASE_URL}/api/user/profile/me`, {
      headers: authHeaders,
      tags: { name: 'GET /api/user/profile/me' },
    });

    profileDuration.add(res.timings.duration);
    check(res, {
      'profile: status is 200 or 404 (not yet created)': (r) => r.status === 200 || r.status === 404,
    });

    if (res.status !== 200 && res.status !== 404) {
      logStageError('PROFILE', vuId, res.status, 'Profile fetch returned error status');
    }
  }

  if (THINK_TIME > 0) sleep(THINK_TIME);

  // ════════════════════════════════════════════════════════════════════════════
  // STAGE 3: Start Coding Assessment Session (Coding Service)
  // ════════════════════════════════════════════════════════════════════════════
  {
    const startPayload = JSON.stringify({
      candidate_id: candidateEmail,
      duration_minutes: 60,
    });

    const res = http.post(`${BASE_URL}/api/coding/assessment/start`, startPayload, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      tags: { name: 'POST /api/coding/assessment/start' },
    });

    assessmentStartDuration.add(res.timings.duration);
    const body = safeJson(res);
    const success = Boolean(res.status === 200 && body && body.data && (body.data.session_id || body.data.id));

    assessmentStartSuccessRate.add(success);
    check(res, {
      'assessment_start: status is 200': (r) => r.status === 200,
      'assessment_start: session_id returned': () => success,
    });

    if (success) {
      sessionId = body.data.session_id || body.data.id;
    } else {
      logStageError('ASSESSMENT_START', vuId, res.status, body?.detail || body?.message || 'Session start failed');
    }
  }

  if (THINK_TIME > 0) sleep(THINK_TIME);

  // ════════════════════════════════════════════════════════════════════════════
  // STAGE 4: Fetch Coding Questions (Coding Service)
  // ════════════════════════════════════════════════════════════════════════════
  {
    const res = http.get(`${BASE_URL}/api/coding/question/`, {
      headers: { 'Accept': 'application/json' },
      tags: { name: 'GET /api/coding/question/' },
    });

    questionFetchDuration.add(res.timings.duration);
    const body = safeJson(res);
    const questions = body?.data || [];
    const success = res.status === 200 && Array.isArray(questions) && questions.length > 0;

    check(res, {
      'questions: status is 200': (r) => r.status === 200,
      'questions: returned valid question list': () => success,
    });

    if (success) {
      activeQuestionId = questions[0].id || 'q_sum_of_digits';
    } else {
      logStageError('CODING_QUESTION', vuId, res.status, body?.detail || 'No questions returned');
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STAGE 5: Fetch Question Boilerplate (Coding Service)
  // ════════════════════════════════════════════════════════════════════════════
  {
    const res = http.get(`${BASE_URL}/api/coding/question/${activeQuestionId}/boilerplate?language=${activeLanguage}`, {
      headers: { 'Accept': 'application/json' },
      tags: { name: 'GET /api/coding/question/:id/boilerplate' },
    });

    boilerplateDuration.add(res.timings.duration);
    const body = safeJson(res);
    check(res, {
      'boilerplate: status is 200': (r) => r.status === 200,
      'boilerplate: starter code returned': () => !!(body && body.data && body.data.code),
    });

    if (res.status !== 200) {
      logStageError('BOILERPLATE', vuId, res.status, body?.detail || 'Boilerplate fetch failed');
    }
  }

  if (THINK_TIME > 0) sleep(THINK_TIME);

  // ════════════════════════════════════════════════════════════════════════════
  // STAGE 6: Test Run Code via Judge0 (Coding Service)
  // ════════════════════════════════════════════════════════════════════════════
  {
    const runPayload = JSON.stringify({
      question_id: activeQuestionId,
      language: activeLanguage,
      source_code: sourceCode,
      stdin: '5832',
      candidate_id: candidateEmail,
    });

    const res = http.post(`${BASE_URL}/api/coding/submit/run`, runPayload, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      tags: { name: 'POST /api/coding/submit/run' },
    });

    codeRunDuration.add(res.timings.duration);
    const body = safeJson(res);
    const success = res.status === 200 && body && body.data && body.data.results && body.data.results.length > 0;

    runSuccessRate.add(success);
    check(res, {
      'code_run: status is 200': (r) => r.status === 200,
      'code_run: output received from execution': () => success,
    });

    if (!success) {
      logStageError('CODE_RUN', vuId, res.status, body?.detail || body?.message || 'Run execution failed');
    }
  }

  if (THINK_TIME > 0) sleep(THINK_TIME);

  // ════════════════════════════════════════════════════════════════════════════
  // STAGE 7: Submit Code for Graded Assessment (Coding Service + Judge0 Batch)
  // ════════════════════════════════════════════════════════════════════════════
  let submissionId = null;
  const submitStartTime = Date.now();
  {
    const submitPayload = JSON.stringify({
      question_id: activeQuestionId,
      language: activeLanguage,
      source_code: sourceCode,
      candidate_id: candidateEmail,
      session_id: sessionId || undefined,
    });

    const res = http.post(`${BASE_URL}/api/coding/submit/`, submitPayload, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      tags: { name: 'POST /api/coding/submit/' },
    });

    codeSubmitDuration.add(res.timings.duration);
    const body = safeJson(res);
    const success = Boolean(res.status === 200 && body && body.data && (body.data.submission_id || body.data.id));

    submitSuccessRate.add(success);
    check(res, {
      'code_submit: status is 200': (r) => r.status === 200,
      'code_submit: submission enqueued': () => success,
    });

    if (success) {
      submissionId = body.data.submission_id || body.data.id;
    } else {
      logStageError('CODE_SUBMIT', vuId, res.status, body?.detail || body?.message || 'Code submission rejected');
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STAGE 8: Asynchronous Result Polling (Judge0 Completion)
  // ════════════════════════════════════════════════════════════════════════════
  if (submissionId) {
    let completed = false;
    const maxPollAttempts = Math.ceil(POLL_TIMEOUT_SEC / POLL_INTERVAL);

    for (let attempt = 1; attempt <= maxPollAttempts; attempt++) {
      sleep(POLL_INTERVAL);

      const res = http.get(`${BASE_URL}/api/coding/submit/${submissionId}/status`, {
        headers: { 'Accept': 'application/json' },
        tags: { name: 'GET /api/coding/submit/:id/status' },
      });

      const body = safeJson(res);
      const data = body?.data;

      if (res.status === 200 && data) {
        if (data.job_status === 'completed' || data.job_status === 'failed') {
          completed = true;
          const totalExecTime = Date.now() - submitStartTime;
          codeExecutionDuration.add(totalExecTime);
          executionSuccessRate.add(data.job_status === 'completed');

          check(res, {
            'poll_result: job finished': () => true,
            'poll_result: execution completed successfully': () => data.job_status === 'completed',
          });
          break;
        }
      } else {
        logStageError('POLL_RESULT', vuId, res.status, body?.detail || 'Status poll failed');
        break;
      }
    }

    if (!completed) {
      logStageError('POLL_RESULT', vuId, 408, `Execution timed out after ${POLL_TIMEOUT_SEC}s`);
      executionSuccessRate.add(false);
    }
  }

  if (THINK_TIME > 0) sleep(THINK_TIME);

  // ════════════════════════════════════════════════════════════════════════════
  // STAGE 9: Complete Assessment Session (Coding Service)
  // ════════════════════════════════════════════════════════════════════════════
  if (sessionId) {
    const res = http.post(`${BASE_URL}/api/coding/assessment/${sessionId}/complete`, null, {
      headers: { 'Accept': 'application/json' },
      tags: { name: 'POST /api/coding/assessment/:id/complete' },
    });

    check(res, {
      'assessment_complete: status is 200': (r) => r.status === 200,
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STAGE 10: View Candidate Submission History (Results Page)
  // ════════════════════════════════════════════════════════════════════════════
  {
    const res = http.get(`${BASE_URL}/api/coding/submit/candidate/${encodeURIComponent(candidateEmail)}`, {
      headers: { 'Accept': 'application/json' },
      tags: { name: 'GET /api/coding/submit/candidate/:id' },
    });

    check(res, {
      'history: status is 200': (r) => r.status === 200,
    });
  }

  // Record total end-to-end candidate journey duration
  totalCandidateDuration.add(Date.now() - candidateStartTime);
}
