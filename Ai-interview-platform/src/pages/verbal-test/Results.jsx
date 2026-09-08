import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiArrowLeft, FiCheckCircle, FiInfo, FiTrendingUp,
  FiActivity, FiMessageSquare, FiHeadphones, FiAlertTriangle
} from 'react-icons/fi';
import { submitModuleResult, markModuleCompleted, loadTestInfo, getNextModuleRoute, loadCompletedModules } from '../../utils/testFlowUtils';

// ─── Score Card ───────────────────────────────────────────────────────────────
const ScoreCard = ({ title, score, total = 10, icon, color }) => (
  <div className="bg-white p-6 rounded-3xl border border-[#dce5e5] shadow-sm flex items-center justify-between">
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center text-xl`}>
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-bold text-[#9B9B9B] uppercase tracking-widest">{title}</h4>
        <p className="text-2xl font-bold">
          {score} <span className="text-sm font-normal text-[#9B9B9B]">/ {total}</span>
        </p>
      </div>
    </div>
    <div className="w-20 h-2 bg-gray-100 rounded-full relative overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${(score / total) * 100}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="absolute top-0 left-0 h-full rounded-full bg-[#144542]"
      />
    </div>
  </div>
);

// ─── Parameter Row ────────────────────────────────────────────────────────────
const ParameterRow = ({ name, value, unavailable = false }) => {
  const numericValue = typeof value === 'number' ? value : 0;

  if (unavailable) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
        <span className="text-sm font-medium text-[#144542]">{name}</span>
        <div className="flex items-center gap-2 text-amber-500">
          <FiAlertTriangle size={12} />
          <span className="text-xs font-bold">Unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm font-medium text-[#144542]">{name}</span>
      <div className="flex items-center gap-3 w-32">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${numericValue * 10}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full bg-[#144542]"
          />
        </div>
        <span className="text-xs font-bold w-4">{numericValue}</span>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // ── Read real backend results from navigation state ─────────────────────────
  const listening = location.state?.listeningResults;
  const speaking = location.state?.speakingResults;

  // ── Speaking: use _continuous_scores (0–1) × 10 for display ────────────────
  const speakingContinuous = speaking?._continuous_scores || {};
  const toneNote = speaking?.details?.tone?.note || '';
  const toneUnavailable = toneNote.toLowerCase().includes('could not evaluate');

  const speakingParams = {
    ...(speakingContinuous.pronunciation !== undefined && {
      Pronunciation: Math.round(speakingContinuous.pronunciation * 10),
    }),
    ...(speakingContinuous.fluency !== undefined && {
      Fluency: Math.round(speakingContinuous.fluency * 10),
    }),
    // Tone: show "Unavailable" if backend failed, real value otherwise
    Tone: toneUnavailable ? '__unavailable__'
      : (speakingContinuous.tone !== undefined ? Math.round(speakingContinuous.tone * 10) : '__unavailable__'),
    ...(speakingContinuous.grammar !== undefined && {
      Grammar: Math.round(speakingContinuous.grammar * 10),
    }),
    ...(speakingContinuous.comprehension !== undefined && {
      Comprehension: Math.round(speakingContinuous.comprehension * 10),
    }),
  };

  // ── Listening: use avg_score_01 (0–1) × 10 for display ─────────────────────
  const listeningParams = {};
  Object.entries(listening?.parameters || {}).forEach(([key, val]) => {
    const score01 = typeof val === 'object' ? val?.avg_score_01 : null;
    if (score01 !== undefined && score01 !== null) {
      // Capitalise key nicely
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      listeningParams[label] = Math.round(score01 * 10);
    }
  });

  // ── Final scores ─────────────────────────────────────────────────────────────
  const speakingScore = speaking?.final_score_10 ?? 0;
  const listeningScore = listening?.listening_score_10 ?? 0;

  // ── Verdict / Strengths / Improvements (combine both, prefer listening) ──────
  const verdict = listening?.summary?.verdict || speaking?.summary?.verdict || 'Assessment complete';
  const strengths = [...(listening?.summary?.strengths || []), ...(speaking?.summary?.strengths || [])].filter(Boolean).slice(0, 5);
  const improvements = [...(listening?.summary?.improvements || []), ...(speaking?.summary?.improvements || [])].filter(Boolean).slice(0, 5);

  // ── No real data yet (navigated directly to page) ────────────────────────────
  const hasRealData = !!(listening || speaking);
  const submissionStartedRef = useRef(false);

  // ── Save verbal result to DB (once, when real data is present) ───────────────
  useEffect(() => {
    if (!hasRealData) return;
    if (submissionStartedRef.current) return;
    submissionStartedRef.current = true;

    const testInfo = loadTestInfo();
    submitModuleResult('verbal', {
      verbalCode: testInfo?.verbalMapping?.verbalCode || '',
      moduleTotalScore: 20,
      moduleScoreSecured: (speakingScore + listeningScore),
      speakingScore,
      listeningScore,
      speakingParameters: Object.fromEntries(Object.entries(speakingParams).filter(([_, v]) => typeof v === 'number')),
      listeningParameters: Object.fromEntries(Object.entries(listeningParams).filter(([_, v]) => typeof v === 'number')),
    }).then(() => {
      markModuleCompleted('verbal');
      const completedModules = loadCompletedModules();
      const nextRoute = getNextModuleRoute(testInfo, completedModules);
      navigate(nextRoute, { state: { uniqueId: location.state?.uniqueId }, replace: true });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Return empty div since we are automatically redirecting
  return <div className="min-h-screen bg-[#EAF0F0]" />;
};

export default Results;
