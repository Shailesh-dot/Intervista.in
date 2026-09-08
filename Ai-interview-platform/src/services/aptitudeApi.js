// ── Backend API Service for Aptitude Test Module ──
// Connects to the AptitudeIQ backend

const APTITUDE_API_URL = '/api/aptitude';

function cleanUrl(base) {
  return base.replace(/\/+$/, '');
}

/**
 * Fetch 15 randomized aptitude questions.
 * Returns: [{ id, category, question, options: { A, B, C, D }, source }, ...]
 */
export async function fetchQuestions(topics = [], numQuestions = 15) {
  let topicArray = topics;
  if (typeof topics === 'string' && topics.trim()) {
    topicArray = [topics.trim()];
  }

  if (Array.isArray(topicArray) && topicArray.length > 0) {
    const res = await fetch(`${cleanUrl(APTITUDE_API_URL)}/api/questions/by-topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topics: topicArray, num_questions: numQuestions }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Failed to fetch questions by topics (HTTP ${res.status}): ${text}`);
    return JSON.parse(text);
  }

  const res = await fetch(`${cleanUrl(APTITUDE_API_URL)}/api/questions`, {
    method: 'GET',
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Failed to fetch questions (HTTP ${res.status}): ${text}`);
  return JSON.parse(text);
}

/**
 * Submit user answers to the backend.
 * Payload: { answers: [{ question_id, answer }, ...], email: 'user@example.com' }
 * Returns: { score, correct, wrong, skipped, percentage }
 */
export async function submitAnswers(answers, email = null) {
  const payload = { answers };
  if (email) payload.email = email;

  const res = await fetch(`${cleanUrl(APTITUDE_API_URL)}/api/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Failed to submit answers (HTTP ${res.status}): ${text}`);
  return JSON.parse(text);
}

/**
 * Fetch all past test results.
 * Returns: [{ id, score, correct, wrong, skipped, percentage, submitted_at }, ...]
 */
export async function fetchResults() {
  const res = await fetch(`${cleanUrl(APTITUDE_API_URL)}/api/results`, {
    method: 'GET',
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Failed to fetch results (HTTP ${res.status}): ${text}`);
  return JSON.parse(text);
}

/**
 * Fetch detailed answer evaluations for a specific test result.
 * Returns: [{ question_id, question, user_answer, correct_answer, is_correct }, ...]
 */
export async function fetchResultAnswers(resultId) {
  const res = await fetch(`${cleanUrl(APTITUDE_API_URL)}/api/results/${resultId}/answers`, {
    method: 'GET',
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Failed to fetch result answers (HTTP ${res.status}): ${text}`);
  return JSON.parse(text);
}
