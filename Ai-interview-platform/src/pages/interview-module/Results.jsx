import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FiArrowLeft, FiAward, FiCode, FiCheckCircle, FiXCircle,
  FiClock, FiZap, FiTrendingUp, FiAlertCircle, FiExternalLink,
  FiTarget, FiLoader,
} from 'react-icons/fi';
import ProctorOverlay from '../../routes/ProctorOverlay';
import ScreenProctor from '../../routes/ScreenProctor';
import { submitModuleResult, markModuleCompleted, loadTestInfo, getNextModuleRoute, loadCompletedModules } from '../../utils/testFlowUtils';

const CODING_MODULE_URL = '/api/coding';

// Fallback mock data used when the API is unreachable
const MOCK_RESULTS = {
  totalScore: 0,
  maxScore: 100,
  accuracy: 0,
  problemsAttempted: 0,
  problemsSolved: 0,
  timeTaken: '—',
  problems: [],
};

const STATUS_STYLES = {
  Solved: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  Partial: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  Failed: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-600',
    dot: 'bg-red-500',
  },
};

function RadialProgress({ percentage }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg width="144" height="144" className="-rotate-90">
        {/* Track */}
        <circle
          cx="72" cy="72" r={radius}
          fill="none"
          stroke="#144542"
          strokeOpacity="0.08"
          strokeWidth="10"
        />
        {/* Progress */}
        <circle
          cx="72" cy="72" r={radius}
          fill="none"
          stroke="#DAFF0C"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-[#144542] text-2xl font-black tracking-tight leading-none">
          {percentage}%
        </span>
        <span className="text-[#144542]/40 text-[9px] font-bold uppercase tracking-widest mt-0.5">
          Score
        </span>
      </div>
    </div>
  );
}

export default function Results() {
  const navigate = useNavigate();
  const location = useLocation();
  const { uniqueId } = location.state || {};

  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [animateScore, setAnimateScore] = useState(false);
  const submissionStartedRef = useRef(false);

  useEffect(() => {
    if (submissionStartedRef.current) return;
    submissionStartedRef.current = true;

    const fetchResults = async () => {
      const userId = localStorage.getItem('userId') || '';
      const userEmail = localStorage.getItem('userEmail') || '';
      const codingCandidateId = userEmail || userId || 'candidate@example.com';
      const testInfo = loadTestInfo();
      const problemCodes = testInfo?.codingMapping?.problemCodes || [];

      try {
        // 1. Fetch questions to map IDs to titles
        let allQuestions = [];
        try {
          const qRes = await fetch(`${CODING_MODULE_URL}/question/`);
          if (qRes.ok) {
            const qJson = await qRes.json();
            allQuestions = qJson.data || [];
          }
        } catch (err) {
          console.error('[Results] Failed to fetch questions:', err);
        }

        // 2. Fetch candidate submissions from the correct endpoint
        let candidateSubmissions = [];
        try {
          const subRes = await fetch(`${CODING_MODULE_URL}/submit/candidate/${encodeURIComponent(codingCandidateId)}`);
          if (subRes.ok) {
            const subJson = await subRes.json();
            candidateSubmissions = subJson.data || [];
          }
        } catch (err) {
          console.error('[Results] Failed to fetch candidate submissions:', err);
        }

        // Get local submitted codes/drafts (saved by MainAssessment on submit or change)
        const localSubmissions = JSON.parse(localStorage.getItem('coding_submissions') || '{}');
        const localDrafts = JSON.parse(localStorage.getItem('coding_draft_codes') || '{}');

        // 4. Group by question_id and find the best submission (highest score) submitted in the current session
        const bestSubmissionsMap = {};
        candidateSubmissions.forEach(sub => {
          const qId = sub.question_id;
          // Check if they explicitly submitted this question in the current session
          const currentCode = localSubmissions[qId];
          if (!currentCode) return; 

          const existing = bestSubmissionsMap[qId];
          if (!existing || sub.score > existing.score) {
            bestSubmissionsMap[qId] = sub;
          }
        });

        const problemsData = [];
        let moduleTotalScore = 0;
        let moduleScoreSecured = 0;
        const testcaseTotals = [];
        const testcasePassed = [];
        const answers = [];

        // Determine which questions were assigned
        const targetQuestions = problemCodes.length > 0 
          ? problemCodes 
          : (allQuestions.length > 0 ? allQuestions.map(q => q.id) : Object.keys(bestSubmissionsMap));

        targetQuestions.forEach(qId => {
          const bestSub = bestSubmissionsMap[qId];
          const qMeta = allQuestions.find(q => q.id === qId);
          const title = qMeta?.title || `Problem ${qId}`;
          
          const totalCases = bestSub?.total_test_cases ?? 10;
          const passedCases = bestSub?.passed_test_cases ?? 0;
          const scoreSecured = bestSub?.score ?? 0; // out of 100
          
          moduleTotalScore += 100;
          moduleScoreSecured += scoreSecured;

          testcaseTotals.push(totalCases);
          testcasePassed.push(passedCases);

          // Retrieve source code of submission
          // 1. check coding_submissions (explicitly submitted)
          // 2. check coding_draft_codes (saved draft)
          // 3. fallback to empty
          const sourceCode = localSubmissions[qId] || localDrafts[qId] || "";
          answers.push(sourceCode);

          problemsData.push({
            title,
            name: title,
            maxScore: 100,
            max_score: 100,
            score: scoreSecured,
            marks: scoreSecured,
            language: bestSub?.language || 'python',
            lang: bestSub?.language || 'python',
            status: bestSub?.status || 'Failed',
          });
        });

        const normalized = {
          totalScore: moduleScoreSecured,
          maxScore: moduleTotalScore,
          accuracy: moduleTotalScore > 0 ? Math.round((moduleScoreSecured / moduleTotalScore) * 100) : 0,
          problemsAttempted: targetQuestions.length,
          problemsSolved: Object.values(bestSubmissionsMap).filter(s => s.status === 'Accepted').length,
          timeTaken: '—',
          problems: problemsData,
        };

        setResults(normalized);

        // ── Save coding result to consolidated DB ──
        await submitModuleResult('coding', {
          codingCode: targetQuestions.join(','),
          moduleTotalScore,
          moduleScoreSecured,
          testcaseTotals,
          testcasePassed,
          answers,
        });
        markModuleCompleted('coding');
      } catch (err) {
        console.error('[Results] Error processing/saving results:', err);
        setFetchError(true);
        setResults(MOCK_RESULTS);
      } finally {
        setIsLoading(false);
        // Automatically route to next module after submission
        const completedModules = loadCompletedModules();
        const nextRoute = getNextModuleRoute(testInfo, completedModules);
        navigate(nextRoute, { state: { uniqueId }, replace: true });
      }
    };

    fetchResults();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#EAF0F0] flex flex-col items-center justify-center font-sans gap-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-[#144542]/10 rounded-full" />
          <div className="w-16 h-16 border-4 border-[#144542] border-t-transparent rounded-full animate-spin absolute inset-0" />
        </div>
        <div className="text-center">
          <p className="text-[#144542] font-black text-lg tracking-wide">Fetching Your Results</p>
          <p className="text-[#144542]/40 text-sm font-medium mt-1">Analyzing your submission...</p>
        </div>
      </div>
    );
  }

  const percentage = results.maxScore > 0
    ? Math.round((results.totalScore / results.maxScore) * 100)
    : 0;

  const isGoodScore = percentage >= 60;
  const isGreatScore = percentage >= 80;

  const performanceLabel = isGreatScore
    ? 'Outstanding Performance'
    : isGoodScore
    ? 'Good Performance'
    : 'Needs Improvement';

  const performanceColor = isGreatScore
    ? 'text-emerald-600'
    : isGoodScore
    ? 'text-amber-600'
    : 'text-red-500';

  const metricCards = [
    {
      icon: <FiTarget className="text-2xl" />,
      value: results.problemsAttempted,
      label: 'Problems Attempted',
      sub: 'Total questions opened',
    },
    {
      icon: <FiCheckCircle className="text-2xl" />,
      value: results.problemsSolved,
      label: 'Problems Solved',
      sub: 'Fully accepted solutions',
    },
    {
      icon: <FiTrendingUp className="text-2xl" />,
      value: `${results.accuracy}%`,
      label: 'Accuracy',
      sub: 'Correct vs attempted',
    },
    {
      icon: <FiClock className="text-2xl" />,
      value: results.timeTaken,
      label: 'Time Taken',
      sub: 'Total session duration',
    },
  ];

  return (
    <div className="min-h-screen bg-[#EAF0F0] font-sans overflow-x-hidden">
      <ScreenProctor />
      <ProctorOverlay uniqueId={uniqueId} />

      {/* Background Decorative */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#144542]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#DAFF0C]/8 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-8 py-10 md:py-14">

        {/* ── API Warning Banner ── */}
        {fetchError && (
          <div className="mb-6 flex items-center gap-3 px-5 py-3.5 bg-amber-50 border border-amber-200 rounded-xl">
            <FiAlertCircle className="text-amber-500 text-lg shrink-0" />
            <p className="text-amber-700 text-sm font-medium">
              Could not reach the results API. Displaying placeholder data — scores will update once the API is connected.
            </p>
          </div>
        )}

        {/* ── Module Badge ── */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#144542] rounded-full shadow-lg shadow-[#144542]/25">
            <FiZap className="text-[#DAFF0C] text-sm" />
            <span className="text-[#DAFF0C] text-xs font-bold uppercase tracking-[0.2em]">
              Assessment Complete
            </span>
          </div>
        </div>

        {/* ── Hero Score Card ── */}
        <div className="bg-white border border-gray-100 rounded-3xl p-8 md:p-10 mb-8 shadow-xl shadow-[#144542]/5 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-[#144542]/4 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-[#DAFF0C]/8 rounded-full blur-2xl pointer-events-none" />

          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-[#144542] rounded-full flex items-center justify-center shadow-2xl shadow-[#144542]/30">
                <FiAward className="text-[#DAFF0C] text-4xl" />
              </div>
              <div className="absolute inset-0 w-20 h-20 bg-[#DAFF0C]/20 rounded-full animate-ping" />
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-[#144542] text-center tracking-tight mb-2">
            Coding Assessment Results
          </h1>
          <p className={`text-center font-black text-base uppercase tracking-widest mb-8 ${performanceColor}`}>
            {performanceLabel}
          </p>

          {/* Score Display */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-10">
            {/* Radial Progress */}
            <div className={`transition-all duration-700 ${animateScore ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
              <RadialProgress percentage={percentage} />
            </div>

            {/* Score Numbers */}
            <div className="flex flex-col items-center md:items-start gap-4">
              <div className="text-center md:text-left">
                <p className="text-[#144542]/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">
                  Total Score
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-[#144542] text-5xl md:text-6xl font-black tracking-tight">
                    {results.totalScore}
                  </span>
                  <span className="text-[#144542]/30 text-2xl font-black">
                    / {results.maxScore}
                  </span>
                </div>
              </div>

              <div className="h-px w-full bg-[#144542]/10" />

              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#144542]/5 border border-[#144542]/10 rounded-xl">
                <FiCode className="text-[#144542] text-sm" />
                <span className="text-[#144542] text-sm font-bold">
                  {results.problemsSolved} of {results.problemsAttempted} problems solved
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Metric Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {metricCards.map((metric, i) => (
            <div
              key={i}
              className="group bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:border-[#144542]/10 transition-all duration-500 hover:-translate-y-1 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#144542]/3 rounded-full -mr-8 -mt-8 blur-xl group-hover:bg-[#144542]/8 transition-colors" />
              <div className="w-11 h-11 bg-[#144542]/5 rounded-xl flex items-center justify-center text-[#144542] mb-4 group-hover:bg-[#144542] group-hover:text-[#DAFF0C] transition-all duration-300">
                {metric.icon}
              </div>
              <p className="text-[#144542] text-xl font-black tracking-tight">{metric.value}</p>
              <p className="text-[#144542] text-[11px] font-bold uppercase tracking-wide mt-0.5">{metric.label}</p>
              <p className="text-[#144542]/40 text-[10px] font-medium mt-0.5">{metric.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Per-Problem Breakdown Table ── */}
        {results.problems && results.problems.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm mb-8 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 bg-[#144542] rounded-lg flex items-center justify-center">
                <FiCode className="text-[#DAFF0C] text-base" />
              </div>
              <div>
                <h2 className="text-[#144542] text-base font-black uppercase tracking-wide">
                  Problem Breakdown
                </h2>
                <p className="text-[#144542]/40 text-[10px] font-bold uppercase tracking-widest">
                  {results.problems.length} problems attempted
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#144542]/3 border-b border-gray-100">
                    {['#', 'Problem Title', 'Status', 'Score', 'Language'].map((h) => (
                      <th
                        key={h}
                        className="text-left px-5 py-3 text-[#144542]/50 text-[9px] font-black uppercase tracking-[0.15em]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.problems.map((prob, i) => {
                    const status = prob.status || 'Failed';
                    const style = STATUS_STYLES[status] || STATUS_STYLES.Failed;
                    return (
                      <tr
                        key={i}
                        className="border-b border-gray-50 hover:bg-[#144542]/2 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <span className="w-7 h-7 bg-[#144542] rounded-lg flex items-center justify-center text-[#DAFF0C] text-xs font-black">
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-[#144542] text-sm font-semibold">
                            {prob.title || prob.name || `Problem ${i + 1}`}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${style.bg} ${style.border} ${style.text}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                            {status}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-[#144542] text-sm font-bold">
                            {prob.score ?? prob.marks ?? '—'}
                            {prob.maxScore || prob.max_score
                              ? ` / ${prob.maxScore ?? prob.max_score}`
                              : ''}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-2.5 py-1 bg-[#144542]/5 border border-[#144542]/8 text-[#144542]/70 text-xs font-bold rounded-lg font-mono">
                            {prob.language || prob.lang || 'N/A'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Empty Problems Placeholder ── */}
        {(!results.problems || results.problems.length === 0) && !fetchError && (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-[#144542]/5 rounded-full flex items-center justify-center mb-4">
              <FiCode className="text-3xl text-[#144542]/30" />
            </div>
            <h3 className="text-[#144542] text-base font-black mb-1">No Problem Data Available</h3>
            <p className="text-[#144542]/40 text-sm font-medium">
              Per-problem breakdown is not available for this session.
            </p>
          </div>
        )}

        {/* ── Action Buttons ── */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => {
              const testInfo = loadTestInfo();
              const completedModules = loadCompletedModules();
              const nextRoute = getNextModuleRoute(testInfo, completedModules);
              navigate(nextRoute, { state: { uniqueId } });
            }}
            className="group px-10 py-4 bg-[#144542] text-white font-black text-sm uppercase tracking-[0.15em] rounded-xl shadow-lg shadow-[#144542]/20 hover:bg-[#1b5b53] hover:shadow-xl hover:shadow-[#144542]/30 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <FiArrowLeft className="text-lg group-hover:-translate-x-1 transition-transform" />
              Continue to Next Module
            </span>
          </button>

          <a
            href={`${CODING_MODULE_URL}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 px-10 py-4 bg-white border-2 border-[#144542]/10 text-[#144542] font-black text-sm uppercase tracking-[0.15em] rounded-xl hover:border-[#144542]/30 hover:bg-[#144542]/5 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
          >
            <FiExternalLink className="text-lg" />
            View Submission Details
          </a>
        </div>

        {/* ── Footer Note ── */}
        <p className="text-center text-[#144542]/25 text-xs font-medium mt-8">
          Results are processed by the assessment engine. Contact support if you notice any discrepancies.
        </p>
      </div>
    </div>
  );
}
