// ── Backend API Service for Interview Module ──
// All endpoints served from a single FastAPI backend (module2_server.py)
// Resume Parser + Interview Engine (questions, evaluation, STT, TTS)

const BACKEND_URL = '/api/interview';

// ── Helper ──
function cleanUrl(base) {
  return base.replace(/\/+$/, '');
}

// ── Resume Parser ──

/**
 * Upload a resume file (PDF/DOCX) to the backend.
 * Returns parsed profile: { candidate_name, skills, projects, experience, ... }
 */
export async function uploadResume(file) {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${cleanUrl(BACKEND_URL)}/upload_resume`, {
    method: 'POST',
    body: form,
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Resume upload failed (HTTP ${res.status}): ${text}`);
  return JSON.parse(text);
}

// ── Interview Engine ──

/**
 * Generate interview questions from a parsed profile.
 * Returns { session_id, questions: [{ id, question, difficulty }, ...] }
 */
export async function generateQuestions(profileData) {
  const res = await fetch(`${cleanUrl(BACKEND_URL)}/questions/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profileData),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Question generation failed (HTTP ${res.status}): ${text}`);
  return JSON.parse(text);
}

/**
 * Evaluate all candidate answers for a session.
 * Payload: { session_id, answers: [{ question_id, candidate_answer }, ...] }
 * Returns: { grade, total_score, max_score, percentage, summary, results: [...] }
 */
export async function evaluateAnswers(sessionId, answers) {
  const payload = { session_id: sessionId, answers };

  const res = await fetch(`${cleanUrl(BACKEND_URL)}/evaluation/evaluate_answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Evaluation failed (HTTP ${res.status}): ${text}`);
  return JSON.parse(text);
}

/**
 * Transcribe an audio blob (webm) to text via STT.
 * Returns { status, text }
 */
export async function transcribeAudio(audioBlob) {
  const form = new FormData();
  form.append('file', audioBlob, 'audio.webm');

  const res = await fetch(`${cleanUrl(BACKEND_URL)}/stt/transcribe`, {
    method: 'POST',
    body: form,
  });

  const data = await res.json();
  if (!res.ok || data.status !== 'success') {
    throw new Error(data.detail || `STT failed (HTTP ${res.status})`);
  }
  return data; // { status: 'success', text: '...' }
}

/**
 * Synthesize speech from text (TTS).
 * Returns an audio Blob that can be played via Audio().
 */
export async function synthesizeSpeech(text) {
  const res = await fetch(`${cleanUrl(BACKEND_URL)}/stt/synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`TTS failed (HTTP ${res.status}): ${errText}`);
  }

  return await res.blob();
}
