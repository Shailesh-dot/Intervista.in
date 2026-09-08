import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FiPlay, FiSend, FiClock, FiChevronDown, FiCheckCircle,
  FiXCircle, FiAlertCircle, FiLoader, FiCode, FiZap,
  FiUser, FiFlag, FiMaximize2, FiMinimize2, FiRefreshCw,
  FiTerminal, FiList, FiAward, FiMoon, FiSun,
} from 'react-icons/fi';
import Editor from '@monaco-editor/react';
import ProctorOverlay from '../../routes/ProctorOverlay';
import { loadTestInfo, loadCompletedModules, getNextModuleRoute, markModuleCompleted } from '../../utils/testFlowUtils';
import ScreenProctor from '../../routes/ScreenProctor';


// ── API Base ──────────────────────────────────────────────────────────────────
const API = '/api/coding';

const LOCAL_HEADERS = {
  'Content-Type': 'application/json',
};

// ── Supported languages (from backend languages.py) ───────────────────────────
const LANGUAGES = [
  { key: 'python', display: 'Python 3', monaco: 'python' },
  { key: 'javascript', display: 'JavaScript (Node.js)', monaco: 'javascript' },
  { key: 'java', display: 'Java', monaco: 'java' },
  { key: 'cpp', display: 'C++', monaco: 'cpp' },
  { key: 'c', display: 'C', monaco: 'c' },
  { key: 'typescript', display: 'TypeScript', monaco: 'typescript' },
  { key: 'go', display: 'Go', monaco: 'go' },
  { key: 'rust', display: 'Rust', monaco: 'rust' },
];

// ── Default stubs ─────────────────────────────────────────────────────────────
const DEFAULT_CODE = {
  python: '# Write your solution here\ndef solution():\n    pass\n',
  javascript: '// Write your solution here\nfunction solution() {\n    \n}\n',
  java: '// Write your solution here\nclass Solution {\n    public void solve() {\n        \n    }\n}\n',
  cpp: '// Write your solution here\n#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n',
  c: '// Write your solution here\n#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}\n',
  typescript: '// Write your solution here\nfunction solution(): void {\n    \n}\n',
  go: '// Write your solution here\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello")\n}\n',
  rust: '// Write your solution here\nfn main() {\n    println!("Hello, world!");\n}\n',
};

// ── Difficulty badge colours ──────────────────────────────────────────────────
const DIFF_STYLE = {
  Easy: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  Medium: 'bg-amber-500/10   text-amber-500   border-amber-500/20',
  Hard: 'bg-red-500/10     text-red-500     border-red-500/20',
};

// ── Helper: api call ──────────────────────────────────────────────────────────
// NOTE: The coding microservice is headless — no JWT auth required.
// All requests go through the web envelope directly.
async function apiCall(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...LOCAL_HEADERS,
      ...(options.headers || {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.detail || `HTTP ${res.status}`);
  return json;
}

function ErrorDisplay({ status, output, isDarkMode }) {
  const t = (light, dark) => isDarkMode ? dark : light;
  if (!output) return null;
  const lines = output.trim().split('\n');
  const summary = lines[lines.length - 1]; // e.g. "SyntaxError: invalid syntax"
  const lineMatch = output.match(/line (\d+)/i);
  const lineInfo = lineMatch ? `Line ${lineMatch[1]}` : '';

  return (
    <div className="space-y-4 animate-fade-in">
      <div className={`flex items-center gap-2 ${t('text-red-600', 'text-red-400')}`}>
        <FiAlertCircle className="shrink-0 text-lg" />
        <span className="text-[11px] font-black uppercase tracking-[0.2em]">{status || 'Error'}</span>
      </div>
      <div className={`${t('bg-[#F8F8F8] border border-red-500/20', 'bg-[#0d1117] border border-red-500/20')} rounded-2xl overflow-hidden shadow-2xl`}>
        <div className="bg-red-500/10 px-5 py-4 border-b border-red-500/10">
          <h3 className="text-red-400 font-black text-sm mb-1">{summary}</h3>
          {lineInfo && (
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 bg-red-500/10 rounded text-[9px] font-black text-red-400/60 uppercase border border-red-500/5">{lineInfo}</span>
            </div>
          )}
        </div>
        <div className={`p-5 ${t('bg-black/5', 'bg-black/20')}`}>
          <p className={`${t('text-[#AAAAAA]', 'text-white/20')} text-[9px] font-black uppercase mb-3 tracking-[0.3em]`}>Full Stack Trace</p>
          <pre className={`${t('text-[#777777]', 'text-white/40')} font-mono text-[10px] sm:text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed no-scrollbar select-text`}>
            {output}
          </pre>
        </div>
      </div>
    </div>
  );
}

function RunResultsViewer({ data, activeQuestion, customStdin, isDarkMode }) {
  const t = (light, dark) => isDarkMode ? dark : light;
  const [selectedIdx, setSelectedIdx] = useState(0);
  const results = data?.results || [];
  const current = results[selectedIdx] || null;

  if (!current && results.length === 0) return null;

  const isError = current?.status !== 'Accepted';
  const getFallbackInput = () => {
    if (data?.type === 'custom') return customStdin;
    if (data?.type === 'samples') return activeQuestion?.sample_test_cases?.[selectedIdx]?.input;
    return null;
  };
  const displayInput = current?.input || getFallbackInput() || '(None)';

  return (
    <div className={`flex flex-col h-full ${t('bg-white/60', 'bg-[#161b22]/30')}`}>
      {/* 1. Case Switcher + Status */}
      <div className={`flex items-center justify-between px-5 py-3 border-b ${t('border-black/8 bg-black/5', 'border-white/8 bg-[#161b22]/50')}`}>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-[70%]">
          {results.map((_, i) => (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap border ${selectedIdx === i
                ? `bg-[#DAFF0C] ${t('text-[#111111]', 'text-[#0d1117]')} border-[#DAFF0C]`
                : `${t('bg-black/5 text-[#888888] border-black/10 hover:border-black/20', 'bg-white/5 text-white/40 border-white/10 hover:border-white/20')}`
                }`}
            >
              Case {i + 1}
            </button>
          ))}
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${isError ? 'bg-red-500/10 text-red-400 border-red-500/20' : t('bg-emerald-500/10 text-emerald-600 border-emerald-500/20', 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20')
          }`}>
          {current?.status || 'Executed'}
        </div>
      </div>

      {/* 2. Scrollable content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">

        {/* Compilation / Runtime Error specific override */}
        {(current?.compile_output || current?.stderr) && (
          <ErrorDisplay
            status={current.status || (current.compile_output ? 'Compilation Error' : 'Runtime Error')}
            output={current.compile_output || current.stderr}
            isDarkMode={isDarkMode}
          />
        )}

        {/* Comparison section */}
        <div className="space-y-5">
          {/* Input */}
          <div className="space-y-2">
            <p className={`${t('text-[#666666]', 'text-white/30')} text-[10px] font-black uppercase tracking-widest`}>Input</p>
            <div className={`${t('bg-[#F8F8F8] border-black/10 text-black font-bold', 'bg-[#0d1117] border-white/5 text-white/80')} border rounded-xl px-3 py-2.5 font-mono text-xs shadow-inner whitespace-nowrap overflow-x-auto custom-scrollbar`}>
              {displayInput.replace(/\n/g, ' ')}
            </div>
          </div>

          {/* Output Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className={`${t('text-[#666666]', 'text-white/30')} text-[10px] font-black uppercase tracking-widest`}>Output</p>
              <pre className={`${t('bg-[#F8F8F8] border-black/10', 'bg-[#0d1117] border-white/8')} border rounded-xl p-3 font-mono text-xs min-h-[50px] ${isError ? 'text-red-600 font-bold border-red-500/20' : t('text-emerald-700 font-bold', 'text-emerald-400')}`}>
                {current?.stdout || '(No Output)'}
              </pre>
            </div>
            <div className="space-y-2">
              <p className={`${t('text-[#666666]', 'text-white/30')} text-[10px] font-black uppercase tracking-widest`}>Expected</p>
              <pre className={`${t('bg-[#F8F8F8] border-black/10', 'bg-[#0d1117] border-white/8')} border rounded-xl p-3 font-mono text-xs min-h-[50px] ${t('text-emerald-700 font-bold', 'text-emerald-400')}`}>
                {current?.expected_output || '(N/A)'}
              </pre>
            </div>
          </div>
        </div>

        <div className={`pt-4 border-t ${t('border-black/5', 'border-white/5')} flex items-center justify-between opacity-50`}>
          <span className={`text-[10px] ${t('text-[#AAAAAA]', 'text-white/20')} uppercase font-black`}>Performance Metrics</span>
          <span className={`text-[10px] ${t('text-[#777777]', 'text-white/40')} font-mono tracking-wider`}>EXEC_TIME: {current?.execution_time || 0}s</span>
        </div>
      </div>
    </div>
  );
}

function SubmitResultsViewer({ data, isDarkMode }) {
  const t = (light, dark) => isDarkMode ? dark : light;
  const [selectedIdx, setSelectedIdx] = useState(0);
  const tcResults = data?.test_case_results || [];
  const current = tcResults[selectedIdx] || null;
  const isAllPassed = data.status === 'Accepted';

  return (
    <div className={`flex flex-col h-full ${t('bg-white/60', 'bg-[#161b22]/30')}`}>
      {/* 1. Global Performance Banner */}
      <div className={`px-6 py-5 border-b ${t('border-black/10', 'border-white/10')} ${isAllPassed ? 'bg-emerald-500/10' : 'bg-red-500/5'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border ${isAllPassed ? `${t('bg-emerald-500/20 border-emerald-400/30 text-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.1)]', 'bg-emerald-500/20 border-emerald-400/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]')}` : 'bg-red-500/10 border-red-400/30 text-red-400'
              }`}>
              {isAllPassed ? <FiCheckCircle /> : <FiAlertCircle />}
            </div>
            <div>
              <h2 className={`text-xl font-black ${isAllPassed ? t('text-emerald-600', 'text-emerald-400') : 'text-red-400'}`}>{data.status}</h2>
              <p className={`${t('text-[#888888]', 'text-white/30')} text-[9px] font-black uppercase tracking-[0.2em] mt-1`}>
                Score: {data.score}% · {data.passed_test_cases}/{data.total_test_cases} Passed
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`${t('text-[#AAAAAA]', 'text-white/20')} text-[9px] font-black uppercase mb-1`}>Time Elapsed</p>
            <p className="text-[#DAFF0C] font-mono font-black">{data.execution_time || 0}ms</p>
          </div>
        </div>
      </div>

      {/* 2. Test Case Selection Grid */}
      <div className={`px-5 py-3 ${t('bg-[#F0F0F0] border-black/5', 'bg-[#1c2128] border-white/5')} border-b flex items-center gap-3`}>
        <div className="flex flex-wrap gap-2">
          {tcResults.map((tc, i) => (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              className={`w-8 h-8 rounded-lg border transition-all duration-200 cursor-pointer flex items-center justify-center ${selectedIdx === i
                ? `border-[#DAFF0C] ${t('bg-[#DAFF0C]/20 text-[#7A9000]', 'bg-[#DAFF0C]/10 text-[#DAFF0C]')} shadow-lg`
                : `${t('border-black/8 bg-black/5 text-[#AAAAAA] hover:border-black/20', 'border-white/5 bg-white/5 text-white/20 hover:border-white/20')}`
                }`}
            >
              {tc.status === 'Accepted' ? <FiCheckCircle className="text-xs" /> : <FiXCircle className="text-xs" />}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Selected Case Detail */}
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
        {current && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <span className={`text-[10px] font-black uppercase ${t('text-[#AAAAAA]', 'text-white/30')}`}>Case {selectedIdx + 1} Detail</span>
              {current.is_hidden && <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase italic tracking-widest border ${t('bg-black/5 text-[#888888] border-black/10', 'bg-white/5 text-white/30 border-white/10')}`}>Private Case</span>}
            </div>

            {current.is_hidden ? (
              <div className={`border border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center ${t('bg-[#F8F8F8] border-black/10', 'bg-[#0d1117] border-white/10')}`}>
                <FiFlag className={`text-3xl mb-3 ${t('text-[#CCCCCC]', 'text-white/10')}`} />
                <p className={`text-xs font-medium max-w-[300px] ${t('text-[#AAAAAA]', 'text-white/30')}`}>Hidden test case details are restricted to prevent answer leaking. All outputs are encrypted by the judge engine.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(current.compile_output || current.stderr) && (
                  <ErrorDisplay
                    status={current.status}
                    output={current.compile_output || current.stderr}
                    isDarkMode={isDarkMode}
                  />
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${t('text-[#666666]', 'text-white/30')}`}>Output</p>
                    <pre className={`border rounded-xl p-3 font-mono text-xs min-h-[40px] ${t('bg-[#F8F8F8] border-black/10 text-black font-bold', 'bg-[#0d1117] border-white/5 text-white/60')}`}>{current.stdout || '(No Output)'}</pre>
                  </div>
                  <div className="space-y-2">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${t('text-[#666666]', 'text-white/30')}`}>Status</p>
                    <div className={`border rounded-xl p-3 font-mono font-black text-xs min-h-[40px] flex items-center ${t('bg-[#F8F8F8] border-black/10', 'bg-[#0d1117] border-white/5')} ${current.status === 'Accepted' ? t('text-emerald-700 font-bold', 'text-emerald-400') : 'text-red-600 font-bold'}`}>
                      {current.status}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


export default function MainAssessment() {
  const navigate = useNavigate();
  const location = useLocation();

  // ── States ────────────────────────────────────────────────────────────────
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const t = (light, dark) => isDarkMode ? dark : light;

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const { uniqueId } = location.state || {};
  const editorRef = useRef(null);
  const pollRef = useRef(null);
  const draftCacheRef = useRef({});
  const activeDraftKeyRef = useRef(null);
  const codeLoadTokenRef = useRef(0);

  // Session
  const [userId, setUserId] = useState('');
  const [sessionId, setSessionId] = useState(null);

  // Questions
  const [questions, setQuestions] = useState([]);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [questionsLoading, setQuestionsLoading] = useState(true);

  // Editor
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(DEFAULT_CODE.python);
  const [langOpen, setLangOpen] = useState(false);

  // Timer
  const [timeLeft, setTimeLeft] = useState(null); // seconds from session end_time
  const timerRef = useRef(null);

  // Execution
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('testcase'); // testcase | result
  const [stdin, setStdin] = useState('');
  const [runResult, setRunResult] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [submitError, setSubmitError] = useState('');

  // UI
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showLangPanel, setShowLangPanel] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [initPhase, setInitPhase] = useState('auth'); // auth | questions | ready | error
  const [initError, setInitError] = useState('');

  // Resizing state
  const [descriptionWidth, setDescriptionWidth] = useState(400);
  const [consoleHeight, setConsoleHeight] = useState(350);
  const isResizingDesc = useRef(false);
  const isResizingConsole = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizingDesc.current) {
        // Calculate new width for description panel
        // 48px is the width of the left-most problem list icon bar
        const newWidth = Math.max(250, Math.min(e.clientX - 48, window.innerWidth * 0.6));
        setDescriptionWidth(newWidth);
      }
      if (isResizingConsole.current) {
        // Calculate new height for console panel
        const newHeight = Math.max(150, Math.min(window.innerHeight - e.clientY, window.innerHeight * 0.8));
        setConsoleHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      isResizingDesc.current = false;
      isResizingConsole.current = false;
      document.body.style.cursor = 'default';
      // Remove visual indicators
      document.body.classList.remove('resizing-active');
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // ── Initialization ──────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        // 1. Derive candidate ID directly — no auth calls needed (headless backend)
        const email = localStorage.getItem('userEmail') || 'candidate@example.com';
        const uid = email; // use email as stable candidate identifier
        setUserId(uid);

        // 2. Fetch questions
        setInitPhase('questions');
        const qRes = await apiCall('/question/');
        let qs = qRes.data || [];

        // Filter questions if specific problem codes were assigned in test creation
        const testInfo = loadTestInfo();
        const assignedProblemCodes = testInfo?.codingMapping?.problemCodes || [];
        if (Array.isArray(assignedProblemCodes) && assignedProblemCodes.length > 0) {
          const codeSet = new Set(assignedProblemCodes.map(String));
          const filtered = qs.filter(q => codeSet.has(String(q.id)) || codeSet.has(String(q.problem_code)));
          if (filtered.length > 0) {
            qs = filtered;
          }
        }
        setQuestions(qs);

        if (qs.length > 0) {
          await selectQuestion(qs[0], 'python', uid);
        }

        // 3. Start a single assessment session for the entire module (60 mins)
        try {
          const candidateId = uid || email || 'anonymous';
          const sRes = await apiCall('/assessment/start', {
            method: 'POST',
            body: JSON.stringify({ candidate_id: candidateId, duration_minutes: 60 }),
          });
          const sid = sRes.data?.session_id || sRes.data?.id;
          setSessionId(sid);
          if (sid) {
            localStorage.setItem('coding_session_id', sid);
          } else {
            localStorage.removeItem('coding_session_id');
          }

          // Start countdown once
          const endTime = new Date(sRes.data?.end_time).getTime();
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
            setTimeLeft(remaining);
            if (remaining === 0) clearInterval(timerRef.current);
          }, 1000);
        } catch {
          // If session creation fails, show a local 60-min countdown
          localStorage.removeItem('coding_session_id');
          setTimeLeft(60 * 60);
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
              if (prev <= 1) { clearInterval(timerRef.current); return 0; }
              return prev - 1;
            });
          }, 1000);
        }

        setInitPhase('ready');
      } catch (err) {
        setInitPhase('error');
        setInitError(err.message || 'Failed to connect to the coding module.');
      } finally {
        setQuestionsLoading(false);
      }
    };
    init();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []); // eslint-disable-line

  // ── In-Memory Draft Cache Helpers ──────────────────────────────────────────
  const makeDraftKey = (questionId, lang) => `${questionId}::${lang}`;

  const saveDraft = (questionId, lang, codeContent) => {
    if (!questionId || !lang) return;
    if (!draftCacheRef.current[questionId]) {
      draftCacheRef.current[questionId] = {};
    }
    draftCacheRef.current[questionId][lang] = codeContent ?? '';
  };

  const getDraft = (questionId, lang) => {
    if (!questionId || !lang) return null;
    return draftCacheRef.current[questionId]?.[lang] ?? null;
  };

  const hasDraft = (questionId, lang) => {
    return getDraft(questionId, lang) !== null;
  };

  const getBoilerplateForLang = async (q, targetLang) => {
    if (!q) return DEFAULT_CODE[targetLang] || '';

    // 1. Direct from question object boilerplates
    const qBp = q.boilerplates?.[targetLang];
    if (qBp) {
      if (typeof qBp === 'string' && qBp.trim()) return qBp;
      if (qBp.code && qBp.code.trim()) return qBp.code;
      if (qBp.source_code && qBp.source_code.trim()) return qBp.source_code;
      if (qBp.template && qBp.template.trim() && qBp.template !== 'function') return qBp.template;
    }

    // 2. Fetch from backend endpoint
    try {
      const bpRes = await apiCall(`/question/${q.id}/boilerplate?language=${targetLang}`);
      const bpData = bpRes.data;
      const bpCode = bpData?.code || (bpData?.template !== 'function' ? bpData?.template : '') || bpData?.source_code;
      if (bpCode && bpCode.trim()) return bpCode;
    } catch (err) {
      console.warn('Failed to fetch boilerplate from API:', err);
    }

    // 3. Fallback default stubs
    return DEFAULT_CODE[targetLang] || `# ${q.title}\n`;
  };

  // ── Monaco code change handler ──────────────────────────────────────────────
  const handleCodeChange = (value) => {
    const val = value ?? '';
    setCode(val);
    const currentKey = activeDraftKeyRef.current;
    if (!currentKey) return;
    const [qId, lang] = currentKey.split('::');
    if (qId && lang) {
      saveDraft(qId, lang, val);
    }
  };

  // ── Select / switch question ─────────────────────────────────────────────────
  const selectQuestion = async (q, lang, uid) => {
    // 1. Flush currently displayed editor content using activeDraftKeyRef before changing
    if (activeDraftKeyRef.current) {
      const [currQId, currLang] = activeDraftKeyRef.current.split('::');
      const currentVal = editorRef.current ? editorRef.current.getValue() : code;
      if (currQId && currLang) {
        saveDraft(currQId, currLang, currentVal);
      }
    }

    // Prevent typing / onChange from saving to old question/lang during transition
    activeDraftKeyRef.current = null;

    // If clicking the question that is already active with same language, re-arm key and return
    if (activeQuestion?.id === q.id && !uid && (!lang || lang === language)) {
      activeDraftKeyRef.current = makeDraftKey(q.id, language);
      return;
    }

    // 2. Set new active question
    setActiveQuestion(q);
    setRunResult(null);
    setSubmitResult(null);
    setSubmitError('');
    setActiveTab('testcase');

    // 3. Determine language for question q
    const allowed = q.allowed_languages?.length ? q.allowed_languages : ['python', 'cpp', 'java'];
    let targetLang = lang || language || 'python';
    if (!allowed.includes(targetLang)) {
      targetLang = allowed[0] || 'python';
    }

    setLanguage(targetLang);

    // Increment load token to handle async race conditions
    const token = ++codeLoadTokenRef.current;

    // 4. Check if an in-memory draft exists
    const draft = getDraft(q.id, targetLang);
    if (draft !== null) {
      activeDraftKeyRef.current = makeDraftKey(q.id, targetLang);
      setCode(draft);
      return;
    }

    // 5. If no draft exists, load boilerplate
    const boilerplate = await getBoilerplateForLang(q, targetLang);
    if (token !== codeLoadTokenRef.current) return; // Discard stale response

    activeDraftKeyRef.current = makeDraftKey(q.id, targetLang);
    setCode(boilerplate);
  };

  // ── Language switch ──────────────────────────────────────────────────────────
  const handleLangChange = async (langKey) => {
    setLangOpen(false);
    if (language === langKey) return;

    // 1. Save current editor content under current question + OLD language
    if (activeDraftKeyRef.current) {
      const [currQId, currLang] = activeDraftKeyRef.current.split('::');
      const currentVal = editorRef.current ? editorRef.current.getValue() : code;
      if (currQId && currLang) {
        saveDraft(currQId, currLang, currentVal);
      }
    } else if (activeQuestion && language) {
      const currentVal = editorRef.current ? editorRef.current.getValue() : code;
      saveDraft(activeQuestion.id, language, currentVal);
    }

    // Prevent typing / onChange from saving to old key during transition
    activeDraftKeyRef.current = null;

    // 2. Update language state
    setLanguage(langKey);

    if (!activeQuestion) {
      setCode(DEFAULT_CODE[langKey] || '');
      return;
    }

    // Increment load token to handle async race conditions
    const token = ++codeLoadTokenRef.current;

    // 3. Check if in-memory draft exists for new language
    const draft = getDraft(activeQuestion.id, langKey);
    if (draft !== null) {
      activeDraftKeyRef.current = makeDraftKey(activeQuestion.id, langKey);
      setCode(draft);
      return;
    }

    // 4. If no draft exists, load boilerplate for new language
    const boilerplate = await getBoilerplateForLang(activeQuestion, langKey);
    if (token !== codeLoadTokenRef.current) return; // Discard stale response

    activeDraftKeyRef.current = makeDraftKey(activeQuestion.id, langKey);
    setCode(boilerplate);
  };

  // ── Run code ─────────────────────────────────────────────────────────────────
  const handleRun = async () => {
    if (running || submitting || !activeQuestion) return;
    const currentCode = editorRef.current ? editorRef.current.getValue() : code;
    saveDraft(activeQuestion.id, language, currentCode);
    setRunning(true);
    setActiveTab('result');
    setRunResult(null);
    setSubmitResult(null);
    setSubmitError('');
    try {
      const res = await apiCall('/submit/run', {
        method: 'POST',
        body: JSON.stringify({
          question_id: activeQuestion.id,
          language,
          source_code: currentCode,
          stdin,
          candidate_id: userId || 'anonymous',
        }),
      });
      setRunResult(res.data);
    } catch (err) {
      setRunResult({ error: err.message });
    } finally {
      setRunning(false);
    }
  };

  // ── Submit code ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (running || submitting || !activeQuestion) return;
    const currentCode = editorRef.current ? editorRef.current.getValue() : code;
    saveDraft(activeQuestion.id, language, currentCode);

    // Save code submission to localStorage only for Results.jsx display
    try {
      const savedSubmissions = JSON.parse(localStorage.getItem('coding_submissions') || '{}');
      savedSubmissions[`${activeQuestion.id}_${language}`] = currentCode;
      savedSubmissions[activeQuestion.id] = currentCode;
      localStorage.setItem('coding_submissions', JSON.stringify(savedSubmissions));
    } catch (e) {}

    setSubmitting(true);
    setActiveTab('result');
    setRunResult(null);
    setSubmitResult(null);
    setSubmitError('');

    try {
      const res = await apiCall('/submit/', {
        method: 'POST',
        body: JSON.stringify({
          question_id: activeQuestion.id,
          language,
          source_code: currentCode,
          candidate_id: userId || 'anonymous',
          session_id: sessionId || undefined,
        }),
      });

      const submissionId = res.data?.submission_id || res.data?.id;
      // Poll for status
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await apiCall(`/submit/${submissionId}/status`);
          const data = statusRes.data;
          if (data.job_status === 'completed' || data.job_status === 'failed') {
            clearInterval(pollRef.current);
            setSubmitResult(data);
            setSubmitting(false);
          }
        } catch {
          clearInterval(pollRef.current);
          setSubmitting(false);
          setSubmitError('Lost connection while polling for results.');
        }
      }, 1500);
    } catch (err) {
      setSubmitError(err.message || 'Submission failed.');
      setSubmitting(false);
    }
  };

  // ── Finish assessment ────────────────────────────────────────────────────────
  const handleFinishConfirm = async () => {
    if (sessionId) {
      try { await apiCall(`/assessment/${sessionId}/complete`, { method: 'POST' }); } catch {/* ok */ }
    }
    navigate('/coding/results', { state: { uniqueId } });
  };

  // ── Time format ──────────────────────────────────────────────────────────────
  const formatTime = (s) => {
    if (s === null) return '--:--';
    const h = Math.floor(s / 3600);
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return h > 0 ? `${h}:${m}:${sec}` : `${m}:${sec}`;
  };

  const isTimeLow = timeLeft !== null && timeLeft < 300;



  // ── Loading / Error states ───────────────────────────────────────────────────
  if (initPhase !== 'ready' && initPhase !== 'error') {
    const labels = { auth: 'Connecting...', questions: 'Loading questions...' };
    return (
      <div className={`h-screen flex flex-col items-center justify-center font-sans gap-6 transition-colors duration-300 ${t('bg-[#F5F5F5]', 'bg-[#0d1117]')}`}>
        <div className="relative">
          <div className={`w-16 h-16 rounded-full border-4 ${t('border-[#DAFF0C]/20', 'border-[#DAFF0C]/10')}`} />
          <div className="w-16 h-16 rounded-full border-4 border-[#DAFF0C] border-t-transparent animate-spin absolute inset-0" />
        </div>
        <div className="text-center">
          <p className={`font-black text-lg tracking-wide ${t('text-[#111111]', 'text-white')}`}>{labels[initPhase] || 'Initializing...'}</p>
          <p className={`${t('text-[#888888]', 'text-white/30')} text-sm font-medium mt-1`}>Connecting to coding assessment engine</p>
        </div>
      </div>
    );
  }

  if (initPhase === 'error') {
    return (
      <div className={`h-screen flex items-center justify-center font-sans p-4 transition-colors duration-300 ${t('bg-[#F5F5F5]', 'bg-[#0d1117]')}`}>
        <div className={`${t('bg-[#FFFFFF] border-black/8', 'bg-[#161b22] border-white/8')} border rounded-2xl p-8 max-w-md text-center shadow-xl`}>
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle className="text-red-500 text-3xl" />
          </div>
          <h2 className={`text-xl font-black mb-2 ${t('text-[#111111]', 'text-white')}`}>Connection Failed</h2>
          <p className={`${t('text-[#555555]', 'text-white/40')} text-sm mb-6`}>{initError}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-5 py-3 bg-[#DAFF0C] text-[#111111] font-black text-sm rounded-xl cursor-pointer"
            >
              <FiRefreshCw /> Retry
            </button>
            <button
              onClick={() => navigate('/user/dashboard')}
              className={`px-5 py-3 font-bold text-sm rounded-xl cursor-pointer border ${t('bg-black/5 text-[#444444] border-black/10 hover:bg-black/8', 'bg-white/5 text-white/60 border-white/10 hover:bg-white/8')}`}
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Allowed languages for this question ─────────────────────────────────────
  const allowedLangs = activeQuestion?.allowed_languages?.length
    ? LANGUAGES.filter(l => activeQuestion.allowed_languages.includes(l.key))
    : LANGUAGES;

  return (
    <div className={`flex flex-col h-screen font-sans overflow-hidden transition-colors duration-300 select-none ${t('bg-[#F5F5F5] text-[#111111]', 'bg-[#0d1117] text-white')}`}>
      <ScreenProctor />
      <ProctorOverlay uniqueId={uniqueId} />

      {/* ── TOP NAV BAR ── */}
      <nav className={`flex items-center justify-between border-b px-4 py-2.5 z-30 shrink-0 ${t('border-black/8 bg-[#FFFFFF]', 'border-white/8 bg-[#161b22]')}`}>

        {/* Left: Logo + Question selector */}
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg shrink-0 ${t('bg-[#DAFF0C]/20 border-[#DAFF0C]/40', 'bg-[#DAFF0C]/10 border-[#DAFF0C]/20')}`}>
            <FiZap className="text-[#DAFF0C] text-sm" />
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] hidden sm:block ${t('text-[#111111]', 'text-white')}`}>
              Coding Assessment
            </span>
          </div>

          {/* Question title breadcrumb */}
          {activeQuestion && (
            <div className="flex items-center gap-2 text-sm">
              <span className={t('text-[#888888]', 'text-white/20')}>Problems /</span>
              <span className={`font-semibold truncate max-w-[160px] ${t('text-[#111111]', 'text-white')}`}>{activeQuestion.title}</span>
              <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-black border ${DIFF_STYLE[activeQuestion.difficulty] || DIFF_STYLE.Medium}`}>
                {activeQuestion.difficulty}
              </span>
            </div>
          )}
        </div>

        {/* Center: Timer */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 ${isTimeLow ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse' : t('bg-black/5 border-black/10 text-[#111111]', 'bg-white/5 border-white/10 text-white')
          }`}>
          <FiClock className="text-base" />
          <span className="font-mono font-black text-base tracking-wider">{formatTime(timeLeft)}</span>
        </div>

        {/* Right: User + controls */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-lg border transition-all duration-200 group hover:scale-105 ${t('bg-black/5 border-black/10 text-[#888888]', 'bg-white/5 border-white/10 text-white/40')
              }`}
          >
            {isDarkMode ? <FiSun className="text-sm group-hover:text-[#DAFF0C]" /> : <FiMoon className="text-sm group-hover:text-[#DAFF0C]" />}
          </button>

          <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border ${t('bg-black/5 border-black/8', 'bg-white/5 border-white/10')}`}>
            <FiUser className={t('text-[#888888]', 'text-white/20')} />
            <span className={`text-xs font-medium truncate max-w-[120px] ${t('text-[#666666]', 'text-white/60')}`}>
              {localStorage.getItem('userEmail')?.split('@')[0] || 'Candidate'}
            </span>
          </div>



          <button
            onClick={() => setShowFinishModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#DAFF0C] text-[#111111] font-black text-xs uppercase tracking-[0.15em] rounded-xl hover:shadow-lg hover:shadow-[#DAFF0C]/20 transition-all duration-200 cursor-pointer"
          >
            <FiFlag className="text-sm" />
            <span className="hidden sm:block">Finish</span>
          </button>
        </div>
      </nav>

      {/* ── BODY: 3-column layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: Question list sidebar ── */}
        <div className={`w-12 lg:w-56 border-r flex flex-col overflow-hidden shrink-0 transition-all duration-300 ${t('bg-[#FFFFFF] border-black/8', 'bg-[#161b22] border-white/8')}`}>
          <div className={`px-3 py-3 border-b hidden lg:flex items-center gap-2 ${t('border-black/8', 'border-white/8')}`}>
            <FiList className="text-[#DAFF0C] text-sm" />
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${t('text-[#666666]', 'text-white/40')}`}>Problems</span>
            <span className={`ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-full ${t('bg-black/8 text-[#666666]', 'bg-white/8 text-white/40')}`}>{questions.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {questions.map((q, i) => {
              const isActive = activeQuestion?.id === q.id;
              return (
                <button
                  key={q.id}
                  onClick={() => selectQuestion(q, null, userId)}
                  className={`w-full text-left transition-all duration-200 cursor-pointer group ${isActive ? `bg-[#DAFF0C]/20 border-r-2 border-[#DAFF0C] ${t('', 'bg-[#DAFF0C]/10')}` : `hover:bg-black/5 border-r-2 border-transparent ${t('', 'hover:bg-white/5')}`
                    }`}
                >
                  {/* Collapsed (icon only) */}
                  <div className="lg:hidden flex items-center justify-center py-3">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black ${isActive ? 'bg-[#DAFF0C] text-[#111111]' : t('bg-black/8 text-[#888888]', 'bg-white/5 text-white/30')
                      }`}>{i + 1}</span>
                  </div>
                  {/* Expanded */}
                  <div className="hidden lg:block px-3 py-3">
                    <div className="flex items-start gap-2.5">
                      <span className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-black mt-0.5 ${isActive ? 'bg-[#DAFF0C] text-[#111111]' : t('bg-black/8 text-[#888888]', 'bg-white/5 text-white/30')
                        }`}>{i + 1}</span>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold leading-tight truncate ${isActive ? t('text-[#111111]', 'text-white') : t('text-[#444444] group-hover:text-[#222222]', 'text-white/40 group-hover:text-white/80')}`}>
                          {q.title}
                        </p>
                        <span className={`inline-block mt-1 px-1.5 py-0.5 rounded-full text-[8px] font-black border ${DIFF_STYLE[q.difficulty] || DIFF_STYLE.Medium}`}>
                          {q.difficulty}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── MIDDLE: Problem description ── */}
        <div
          className={`border-r flex flex-col overflow-hidden shrink-0 transition-[width] ${isResizingDesc.current ? 'duration-0' : 'duration-300'} ${panelCollapsed ? 'w-0 border-none' : ''} ${t('bg-[#FFFFFF] border-black/8', 'bg-[#0d1117] border-white/8')}`}
          style={{ width: panelCollapsed ? 0 : descriptionWidth }}
        >
          {!panelCollapsed && activeQuestion && (
            <>
              <div className={`flex items-center gap-3 px-5 py-3 border-b ${t('border-black/8', 'border-white/8')}`}>
                <FiCode className="text-[#DAFF0C] text-sm" />
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${t('text-[#666666]', 'text-white/40')}`}>Description</span>
                <button
                  onClick={() => setPanelCollapsed(true)}
                  className={`ml-auto text-xs cursor-pointer p-1 rounded transition-colors ${t('text-[#AAAAAA] hover:text-[#555555]', 'text-white/20 hover:text-white/60')}`}
                  title="Collapse panel"
                >
                  ‹‹
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-5 space-y-5">
                {/* Title */}
                <div>
                  <h1 className={`text-xl font-black leading-snug mb-2 ${t('text-[#111111]', 'text-white')}`}>{activeQuestion.title}</h1>
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black border ${DIFF_STYLE[activeQuestion.difficulty] || DIFF_STYLE.Medium}`}>
                    {activeQuestion.difficulty}
                  </span>
                </div>

                {/* Description */}
                <div>
                  <p className={`text-sm leading-relaxed whitespace-pre-wrap ${t('text-[#444444]', 'text-white/60')}`}>{activeQuestion.description}</p>
                </div>

                {/* Examples */}
                {activeQuestion.examples?.length > 0 && (
                  <div>
                    {activeQuestion.examples.map((ex, i) => (
                      <div key={i} className={`mb-4 rounded-xl p-4 border transition-colors ${t('bg-[#F8F8F8] border-black/10 shadow-sm', 'bg-white/5 border-white/10')}`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${t('text-[#666666]', 'text-white/60')}`}>Example {i + 1}</p>
                        {ex.input !== undefined && (
                          <div className="mb-2">
                            <span className={`text-xs font-bold ${t('text-[#555555]', 'text-white/60')}`}>Input: </span>
                            <code className={`${t('text-black font-bold', 'text-white font-bold')} text-xs font-mono`}>{ex.input}</code>
                          </div>
                        )}
                        {ex.output !== undefined && (
                          <div className="mb-2">
                            <span className={`text-xs font-bold ${t('text-[#555555]', 'text-white/60')}`}>Output: </span>
                            <code className={`${t('text-emerald-700 font-bold', 'text-emerald-300 font-bold')} text-xs font-mono`}>{ex.output}</code>
                          </div>
                        )}
                        {ex.explanation && (
                          <div className={`mt-2 pt-2 border-t ${t('border-black/10', 'border-white/10')}`}>
                            <span className={`text-xs font-bold ${t('text-[#555555]', 'text-white/60')}`}>Explanation: </span>
                            <span className={`text-xs ${t('text-[#333333]', 'text-white/80')}`}>{ex.explanation}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Constraints */}
                {activeQuestion.constraints?.length > 0 && (
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${t('text-[#666666]', 'text-white/60')}`}>Constraints</p>
                    <ul className="space-y-1.5">
                      {activeQuestion.constraints.map((c, i) => (
                        <li key={i} className={`flex items-start gap-2 text-xs ${t('text-[#222222] font-medium', 'text-white font-medium')}`}>
                          <span className={`${t('text-black font-bold', 'text-emerald-400 font-bold')} mt-0.5`}>•</span>
                          <code className="font-mono">{c}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sample test cases */}
                {activeQuestion.sample_test_cases?.length > 0 && (
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${t('text-[#666666]', 'text-white/60')}`}>Sample Test Cases</p>
                    {activeQuestion.sample_test_cases.map((tc, i) => (
                      <div key={i} className={`mb-3 rounded-xl p-4 border transition-colors ${t('bg-[#F8F8F8] border-black/10 shadow-sm', 'bg-white/5 border-white/10')}`}>
                        <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${t('text-[#666666]', 'text-white/60')}`}>Case {i + 1}</p>
                        <div className="text-xs font-mono">
                          <p><span className={t('text-[#555555] font-bold', 'text-white/60')}>Input:  </span><span className={t('text-black font-bold', 'text-white font-bold')}>{tc.input}</span></p>
                          <p><span className={t('text-[#555555] font-bold', 'text-white/60')}>Output: </span><span className={t('text-emerald-700 font-bold', 'text-emerald-300 font-bold')}>{tc.expected_output}</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* No question selected */}
          {!panelCollapsed && !activeQuestion && (
            <div className="flex-1 flex items-center justify-center">
              <p className={t('text-[#AAAAAA]', 'text-white/20')}>No question selected</p>
            </div>
          )}
        </div>

        {/* Panel expand button when collapsed */}
        {panelCollapsed && (
          <button
            onClick={() => setPanelCollapsed(false)}
            style={{ left: 48 }}
            className="absolute top-1/2 -translate-y-1/2 z-20 bg-[#FFFFFF] border border-black/10 text-[#AAAAAA] hover:text-[#555555] text-xs px-1.5 py-3 rounded-r-lg cursor-pointer"
            title="Expand description"
          >
            ››
          </button>
        )}

        {/* Vertical Resizer Handle */}
        {!panelCollapsed && (
          <div
            onMouseDown={(e) => {
              isResizingDesc.current = true;
              document.body.style.cursor = 'col-resize';
            }}
            className="w-1.5 hover:w-1.5 bg-transparent hover:bg-[#DAFF0C]/40 cursor-col-resize z-20 transition-colors group flex items-center justify-center"
            title="Drag to resize description"
          >
            <div className={`w-[1px] h-10 ${t('bg-black/15', 'bg-white/10')} group-hover:bg-[#DAFF0C]/50 rounded-full`} />
          </div>
        )}

        {/* ── RIGHT: Editor + Console ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Editor toolbar */}
          <div className={`flex items-center justify-between px-4 py-2 border-b shrink-0 ${t('bg-[#F5F5F5] border-black/8', 'bg-[#1c2128] border-white/5')}`}>
            {/* Language selector */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(v => !v)}
                className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm font-bold transition-all cursor-pointer ${t('bg-[#FFFFFF] border-black/10 text-[#111111] hover:border-[#DAFF0C]/50', 'bg-white/5 border-white/10 text-white/80 hover:border-[#DAFF0C]/50')}`}
              >
                <FiCode className="text-[#DAFF0C] text-xs" />
                {LANGUAGES.find(l => l.key === language)?.display || language}
                <FiChevronDown className={`${t('text-[#888888]', 'text-white/20')} text-xs transition-transform ${langOpen ? 'rotate-180' : ''}`} />
              </button>

              {langOpen && (
                <div className={`absolute top-full left-0 mt-1 w-52 border rounded-xl shadow-2xl z-50 overflow-hidden ${t('bg-[#FFFFFF] border-black/10', 'bg-[#1c2128] border-white/10')}`}>
                  {allowedLangs.map(lang => (
                    <button
                      key={lang.key}
                      onClick={() => handleLangChange(lang.key)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-all cursor-pointer ${language === lang.key
                        ? `bg-[#DAFF0C]/20 ${t('text-[#7A9000]', 'text-[#DAFF0C]')} font-bold`
                        : `${t('text-[#444444] hover:bg-black/5 hover:text-[#111111]', 'text-white/40 hover:bg-white/5 hover:text-white')}`
                        }`}
                    >
                      {lang.display}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Run / Submit */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRun}
                disabled={running || submitting || !activeQuestion}
                className={`flex items-center gap-2 px-4 py-2 border font-bold text-sm rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer ${t('bg-[#FFFFFF] border-black/10 text-[#111111] hover:border-black/20 hover:bg-black/5', 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10')}`}
              >
                {running ? <FiLoader className="animate-spin text-sm" /> : <FiPlay className="text-sm" fill="currentColor" />}
                Run
              </button>
              <button
                onClick={handleSubmit}
                disabled={running || submitting || !activeQuestion}
                className="flex items-center gap-2 px-4 py-2 bg-[#DAFF0C] text-[#111111] font-black text-sm rounded-xl hover:shadow-lg hover:shadow-[#DAFF0C]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95"
              >
                {submitting ? <FiLoader className="animate-spin text-sm" /> : <FiSend className="text-sm" />}
                Submit
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden" onClick={() => { if (langOpen) setLangOpen(false); }}>
            <Editor
              height="100%"
              theme={isDarkMode ? 'vs-dark' : 'vs'}
              language={LANGUAGES.find(l => l.key === language)?.monaco || 'python'}
              value={code}
              onChange={handleCodeChange}
              onMount={ref => { editorRef.current = ref; }}
              options={{
                fontSize: 14,
                fontFamily: 'Fira Code, Cascadia Code, monospace',
                fontLigatures: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                wordWrap: 'on',
                lineNumbers: 'on',
                renderLineHighlight: 'all',
                padding: { top: 16, bottom: 16 },
                cursorStyle: 'line',
                cursorBlinking: 'smooth',
                smoothScrolling: true,
                // ── Enhanced IntelliSense ──
                quickSuggestions: {
                  other: false,
                  comments: false,
                  strings: false
                },
                suggestOnTriggerCharacters: true,
                acceptSuggestionOnEnter: 'on',
                tabCompletion: 'on',
                wordBasedSuggestions: true,
                parameterHints: {
                  enabled: true
                },
                suggest: {
                  showMethods: true,
                  showFunctions: true,
                  showVariables: true,
                  showConstants: true,
                  showModules: true,
                }
              }}
            />
          </div>

          {/* Horizontal Resizer Handle */}
          <div
            onMouseDown={(e) => {
              isResizingConsole.current = true;
              document.body.style.cursor = 'row-resize';
            }}
            className="h-1.5 hover:h-1.5 bg-transparent hover:bg-[#DAFF0C]/40 cursor-row-resize z-20 transition-colors group flex flex-col items-center justify-center shrink-0"
            title="Drag to resize console"
          >
            <div className={`w-10 h-[1px] ${t('bg-black/15', 'bg-white/10')} group-hover:bg-[#DAFF0C]/50 rounded-full`} />
          </div>

          {/* ── Console / Results panel ── */}
          <div
            className={`border-t flex flex-col shrink-0 overflow-hidden ${t('bg-[#FFFFFF] border-black/8', 'bg-[#0d1117] border-white/8')}`}
            style={{ height: consoleHeight }}
          >
            {/* Console tabs */}
            <div className={`flex items-center justify-between px-4 pt-3 border-b shrink-0 ${t('border-black/8', 'border-white/8')}`}>
              <div className="flex items-center gap-5">
                <button
                  onClick={() => setActiveTab('testcase')}
                  className={`pb-2.5 text-xs font-black uppercase tracking-widest transition-all cursor-pointer border-b-2 ${activeTab === 'testcase' ? `border-[#DAFF0C] ${t('text-[#7A9000]', 'text-[#DAFF0C]')}` : `border-transparent ${t('text-[#AAAAAA] hover:text-[#555555]', 'text-white/20 hover:text-white/60')}`
                    }`}
                >
                  <span className="flex items-center gap-1.5"><FiTerminal className="text-sm" /> Custom Testcase</span>
                </button>
                <button
                  onClick={() => setActiveTab('result')}
                  className={`pb-2.5 text-xs font-black uppercase tracking-widest transition-all cursor-pointer border-b-2 ${activeTab === 'result' ? `border-[#DAFF0C] ${t('text-[#7A9000]', 'text-[#DAFF0C]')}` : `border-transparent ${t('text-[#AAAAAA] hover:text-[#555555]', 'text-white/20 hover:text-white/60')}`
                    }`}
                >
                  <span className="flex items-center gap-1.5"><FiAward className="text-sm" /> Testcase Results</span>
                </button>
              </div>
              {(runResult || submitResult) && activeTab === 'result' && (
                <button
                  onClick={() => { setRunResult(null); setSubmitResult(null); }}
                  className={`mb-2 text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${t('text-[#AAAAAA] hover:text-[#555555]', 'text-white/20 hover:text-white/60')}`}
                >
                  <FiRefreshCw className="text-[9px]" /> Clear
                </button>
              )}
            </div>

            {/* Console body */}
            <div className="flex-1 overflow-hidden">
              {/* Testcase tab */}
              {activeTab === 'testcase' && (
                <div className="p-4 space-y-3 h-full overflow-y-auto custom-scrollbar">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${t('text-[#AAAAAA]', 'text-white/20')}`}>Custom Input (stdin)</p>
                  <textarea
                    value={stdin}
                    onChange={e => setStdin(e.target.value)}
                    placeholder="Enter custom input here..."
                    rows={4}
                    className={`w-full border rounded-xl p-3 font-mono text-sm resize-none outline-none focus:border-[#DAFF0C]/60 transition-all ${t('bg-[#F8F8F8] border-black/10 text-[#222222] placeholder:text-[#CCCCCC]', 'bg-black/20 border-white/5 text-white/80 placeholder:text-white/10')}`}
                  />
                  <p className={t('text-[#AAAAAA] text-[10px]', 'text-white/20 text-[10px]')}>This input will be passed to stdin when you click <span className={t('text-[#777777] font-bold', 'text-white/40 font-bold')}>Run</span>.</p>
                </div>
              )}

              {/* Result tab */}
              {activeTab === 'result' && (
                <div className="h-full flex flex-col">
                  {/* Running states */}
                  {(running || submitting) && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3">
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-full border-2 ${t('border-[#DAFF0C]/20', 'border-white/5')}`} />
                        <div className="w-10 h-10 rounded-full border-2 border-[#DAFF0C] border-t-transparent animate-spin absolute inset-0" />
                      </div>
                      <p className={`text-[10px] font-black uppercase tracking-widest animate-pulse ${t('text-[#555555]', 'text-[#DAFF0C]')}`}>
                        {submitting ? 'Judging Submission...' : 'Executing Code...'}
                      </p>
                    </div>
                  )}

                  {/* Run result Viewer */}
                  {!running && !submitting && runResult && !submitResult && (
                    <div className="flex-1 overflow-hidden">
                      {runResult.error ? (
                        <div className="p-5">
                          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex flex-col items-center gap-3 text-center">
                            <FiAlertCircle className="text-red-400 text-2xl" />
                            <pre className="text-red-400 text-xs font-mono whitespace-pre-wrap">{runResult.error}</pre>
                          </div>
                        </div>
                      ) : (
                        <RunResultsViewer data={runResult} activeQuestion={activeQuestion} customStdin={stdin} isDarkMode={isDarkMode} />
                      )}
                    </div>
                  )}

                  {/* Submit result Viewer */}
                  {!running && !submitting && submitResult && (
                    <div className="flex-1 overflow-hidden">
                      <SubmitResultsViewer data={submitResult} isDarkMode={isDarkMode} />
                    </div>
                  )}

                  {/* Submit error */}
                  {!running && !submitting && submitError && (
                    <div className="p-5">
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
                        <FiAlertCircle className="text-red-400 text-lg flex-shrink-0" />
                        <p className="text-red-400 text-xs font-bold leading-tight">{submitError}</p>
                      </div>
                    </div>
                  )}

                  {/* Idle state */}
                  {!running && !submitting && !runResult && !submitResult && !submitError && (
                    <div className={`flex-1 flex flex-col items-center justify-center gap-2 ${t('text-[#CCCCCC]', 'text-white/10')}`}>
                      <FiZap className="text-3xl" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">Ready to Execute</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── FINISH CONFIRMATION MODAL ── */}
      {showFinishModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className={`border rounded-2xl shadow-2xl max-w-md w-full p-8 ${t('bg-[#FFFFFF] border-black/10', 'bg-[#161b22] border-white/10')}`}>
            <div className="flex items-center justify-center mb-5">
              <div className="w-16 h-16 bg-[#DAFF0C]/20 rounded-full flex items-center justify-center">
                <FiFlag className="text-3xl text-[#DAFF0C]" />
              </div>
            </div>
            <h2 className={`text-2xl font-black text-center mb-2 tracking-tight ${t('text-[#111111]', 'text-white')}`}>Finish Assessment?</h2>
            <p className={`text-sm text-center font-medium mb-8 leading-relaxed ${t('text-[#777777]', 'text-white/40')}`}>
              Make sure you have submitted your solutions before finishing.
              You won't be able to return to the editor after this.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFinishModal(false)}
                className={`flex-1 py-3.5 border font-black text-sm uppercase tracking-widest rounded-xl transition-colors cursor-pointer ${t('bg-black/5 border-black/10 text-[#555555] hover:bg-black/8', 'bg-white/5 border-white/10 text-white/60 hover:bg-white/8')}`}
              >
                Continue
              </button>
              <button
                onClick={handleFinishConfirm}
                className="flex-1 py-3.5 bg-[#DAFF0C] text-[#111111] font-black text-sm uppercase tracking-widest rounded-xl hover:shadow-lg hover:shadow-[#DAFF0C]/20 transition-all cursor-pointer"
              >
                Yes, Finish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
