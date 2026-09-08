/**
 * testFlowUtils.js
 * ─────────────────
 * Shared utilities for managing the multi-module test flow.
 * Used by UploadDetails (post-KYC), TestEvaluation, AptitudeTest, coding Results, and verbal Results
 * to determine the next enabled module and navigate accordingly.
 */

const PYTHON_VERIFICATION_API = '/api/verification';

/**
 * Returns an ordered list of module route entries based on the testInfo flags.
 * Order: Interview → Aptitude → Coding → Verbal
 */
export function getOrderedModules(testInfo) {
  const modules = [];
  if (testInfo?.interviewModule || testInfo?.interview_module) {
    modules.push({ key: 'interview', route: '/interview/resume-parser', label: 'AI Interview' });
  }
  if (testInfo?.aptitudeModule || testInfo?.aptitude_module) {
    modules.push({ key: 'aptitude', route: '/aptitude/start', label: 'Aptitude Test' });
  }
  if (testInfo?.codingModule || testInfo?.coding_module) {
    modules.push({ key: 'coding', route: '/coding/instructions', label: 'Coding Assessment' });
  }
  if (testInfo?.verbalModule || testInfo?.verbal_module) {
    modules.push({ key: 'verbal', route: '/verbal/start', label: 'Verbal Communication' });
  }
  return modules;
}

export function getNextModuleRoute(testInfo, completedModules = []) {
  const ordered = getOrderedModules(testInfo);
  const next = ordered.find((m) => !completedModules.includes(m.key));
  
  if (!next && testInfo) {
    try {
      const completedRaw = localStorage.getItem('completedTestIds');
      const completedTestIds = completedRaw ? JSON.parse(completedRaw) : [];
      let updated = false;
      if (testInfo.testCode) {
        const codeLower = testInfo.testCode.toLowerCase();
        if (!completedTestIds.includes(codeLower)) {
          completedTestIds.push(codeLower);
          updated = true;
        }
      }
      if (testInfo.testId) {
        const idLower = testInfo.testId.toLowerCase();
        if (!completedTestIds.includes(idLower)) {
          completedTestIds.push(idLower);
          updated = true;
        }
      }
      if (updated) {
        localStorage.setItem('completedTestIds', JSON.stringify(completedTestIds));
      }
    } catch (e) {
      console.error('Error updating completedTestIds in localStorage:', e);
    }
  }
  
  return next ? next.route : '/user/dashboard';
}


/**
 * Load testInfo from localStorage (stored by UserDashboard on test selection).
 * Returns null if not found.
 */
export function loadTestInfo() {
  try {
    const raw = localStorage.getItem('testInfo');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Load completed modules from localStorage.
 * Returns array of module key strings.
 */
export function loadCompletedModules() {
  try {
    const raw = localStorage.getItem('completedModules');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Mark a module as completed by key and persist to localStorage.
 */
export function markModuleCompleted(key) {
  const completed = loadCompletedModules();
  if (!completed.includes(key)) {
    completed.push(key);
    localStorage.setItem('completedModules', JSON.stringify(completed));
  }
}

/**
 * Submit a module result to the Python Verification API.
 * moduleType: 'interview' | 'aptitude' | 'coding' | 'verbal'
 * moduleResult: object with module-specific fields
 */
export async function submitModuleResult(moduleType, moduleResult) {
  const studentId = parseInt(localStorage.getItem('userId') || '0');
  const testInfo = loadTestInfo();
  const testCode = testInfo?.testCode || testInfo?.testId || '';

  if (!testCode || !studentId) {
    console.warn('[submitModuleResult] Missing testCode or studentId — skipping DB save.');
    return null;
  }

  try {
    const res = await fetch(`${PYTHON_VERIFICATION_API}/verification/submit-module-result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, testCode, moduleType, moduleResult }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('[submitModuleResult] Failed:', err);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error('[submitModuleResult] Network error:', err);
    return null;
  }
}
