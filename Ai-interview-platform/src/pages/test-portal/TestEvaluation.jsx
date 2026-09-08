import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiAward, FiBarChart2, FiCheckCircle, FiTrendingUp,
  FiMessageSquare, FiCode, FiTarget, FiUsers,
  FiArrowRight, FiDownload, FiChevronDown, FiChevronUp,
  FiStar, FiZap, FiCpu, FiAlertCircle
} from 'react-icons/fi';
import { evaluateAnswers } from '../../services/interviewApi';
import ProctorOverlay from '../../routes/ProctorOverlay';
import ScreenProctor from '../../routes/ScreenProctor';
import { submitModuleResult, markModuleCompleted, loadTestInfo, getNextModuleRoute, loadCompletedModules } from '../../utils/testFlowUtils';

const CircularProgress = ({ score, size = 160, strokeWidth = 12 }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 500);
    return () => clearTimeout(timer);
  }, [score]);

  const getColorClass = (s) => {
    if (s >= 80) return 'stroke-green-500';
    if (s >= 60) return 'stroke-secondary';
    return 'stroke-red-500';
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="currentColor" strokeWidth={strokeWidth}
          className="text-white/10"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`transition-all duration-1000 ease-out ${getColorClass(score)}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-white leading-none tracking-tighter">{score}</span>
        <span className="text-[0.65rem] font-black text-white/50 uppercase tracking-widest mt-1">Score</span>
      </div>
    </div>
  );
};

const ScoreBar = ({ score, colorClass, delay = 0 }) => {
  return (
    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 1, delay: delay / 1000, ease: "easeOut" }}
        className={`h-full rounded-full ${colorClass}`}
      />
    </div>
  );
};

export default function TestEvaluation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [evaluationData, setEvaluationData] = useState(null);
  const [evalError, setEvalError] = useState(null);

  // Receive data from TestPortal
  const sessionId = location.state?.sessionId;
  const answersPayload = location.state?.answers || [];
  const questions = location.state?.questions || [];
  const uniqueId = location.state?.uniqueId;
  const evaluationStartedRef = useRef(false);

  useEffect(() => {
    if (evaluationStartedRef.current) return;
    evaluationStartedRef.current = true;

    const runEvaluation = async () => {
      if (!sessionId || !answersPayload.length) {
        console.warn('No session or answers found. Marking completed and redirecting to next module.');
        markModuleCompleted('interview');
        setIsLoading(false);
        const testInfo = loadTestInfo();
        const completedModules = loadCompletedModules();
        const nextRoute = getNextModuleRoute(testInfo, completedModules);
        navigate(nextRoute, { state: { uniqueId }, replace: true });
        return;
      }

      try {
        const result = await evaluateAnswers(sessionId, answersPayload);
        setEvaluationData(result);

        // ── Save interview result to the consolidated DB ──
        const totalScore = result.max_score || (questions.length * 10);
        const secured = result.total_score || 0;
        const testInfo = loadTestInfo();
        await submitModuleResult('interview', {
          aiCode: testInfo?.aiInterviewMapping?.aiInterviewCode || '',
          moduleTotalScore: totalScore,
          moduleScoreSecured: secured,
          questions: questions.map(q => q.question),
          answers: answersPayload.map(a => a.candidate_answer),
          correctAnswers: (result.results || []).map(r => JSON.stringify({ score: r.score, feedback: r.feedback })),
          correct: (result.results || []).filter(r => r.score >= 7).length,
          wrong: (result.results || []).filter(r => r.score < 7).length,
        });

      } catch (err) {
        console.error('Evaluation error:', err);
        setEvalError(err.message || 'Evaluation failed. Please try again.');

        // ── Save fallback interview result to the consolidated DB ──
        try {
          const testInfo = loadTestInfo();
          const totalScore = questions.length * 10;
          await submitModuleResult('interview', {
            aiCode: testInfo?.aiInterviewMapping?.aiInterviewCode || '',
            moduleTotalScore: totalScore,
            moduleScoreSecured: 0,
            questions: questions.map(q => q.question),
            answers: answersPayload.map(a => a.candidate_answer),
            correctAnswers: questions.map(() => `Evaluation failed: ${err.message || err.toString()}`),
            correct: 0,
            wrong: questions.length,
          });
        } catch (dbErr) {
          console.error('Failed to submit fallback result:', dbErr);
        }
      } finally {
        markModuleCompleted('interview');
        setIsLoading(false);
        const testInfo = loadTestInfo();
        const completedModules = loadCompletedModules();
        const nextRoute = getNextModuleRoute(testInfo, completedModules);
        navigate(nextRoute, { state: { uniqueId }, replace: true });
      }
    };

    runEvaluation();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-light flex items-center justify-center font-sans overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center relative p-12"
        >
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-10 -z-10">
             <div className="w-[400px] h-[400px] border-2 border-brand-dark rounded-full animate-ping" />
          </div>
          <div className="w-24 h-24 mb-8 mx-auto relative">
             <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
             <div className="absolute inset-0 border-4 border-brand-dark rounded-full border-t-transparent animate-spin" />
             <div className="absolute inset-0 flex items-center justify-center text-brand-dark text-3xl">
                <FiCpu className="animate-pulse" />
             </div>
          </div>
          <h2 className="text-3xl font-black text-brand-dark mb-3 tracking-tight">AI Assessment in Progress</h2>
          <p className="text-brand-dark/60 font-medium max-w-[320px] mx-auto text-sm leading-relaxed">
            Our neural engines are currently analyzing your responses for technical depth and logic...
          </p>
          <div className="mt-8 flex justify-center gap-1.5">
             {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                  className="w-2 h-2 bg-brand-dark rounded-full"
                />
             ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (evalError || !evaluationData) {
    return (
      <div className="min-h-screen bg-brand-light flex items-center justify-center font-sans">
        <div className="text-center max-w-md px-8">
          <FiAlertCircle className="mx-auto text-5xl text-red-500 mb-6" />
          <h2 className="text-2xl font-black text-brand-dark mb-3">Evaluation Failed</h2>
          <p className="text-gray-500 mb-8">{evalError || 'Something went wrong.'}</p>
          <button
            onClick={() => navigate('/interview/resume-parser')}
            className="px-8 py-3 bg-brand-dark text-white rounded-xl font-bold cursor-pointer hover:scale-105 transition-all"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  // Map backend response to display data
  const data = evaluationData;
  const overallPercentage = data.percentage || Math.round((data.total_score / data.max_score) * 100) || 0;
  const grade = data.grade || 'N/A';
  const summary = data.summary || 'Evaluation complete.';

  // Build question scores from the results array
  const questionScores = (data.results || []).map(r => ({
    id: r.question_id,
    score: r.score * 10, // Backend gives score out of 10, display as percentage
    rawScore: r.score,
    feedback: r.feedback || 'No feedback available.',
    difficulty: r.difficulty || 'medium',
    question: questions.find(q => q.id === r.question_id)?.question || `Question ${r.question_id}`,
  }));

  const getScoreColor = (s) => {
    if (s >= 70) return 'text-green-600';
    if (s >= 40) return 'text-secondary';
    return 'text-red-600';
  };

  const getScoreBg = (s) => {
    if (s >= 70) return 'bg-green-50';
    if (s >= 40) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  const getScoreBarColor = (s) => {
    if (s >= 70) return 'bg-green-500';
    if (s >= 40) return 'bg-secondary';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-brand-light font-sans pb-20">
      {/* Continuous Face Monitoring */}
      <ScreenProctor />
      <ProctorOverlay uniqueId={uniqueId} />
      {/* Hero Header Section */}
      <div className="bg-brand-dark relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-secondary/5 -skew-x-12 transform translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-1/4 h-1/2 bg-white/5 skew-y-12 transform -translate-x-1/4" />

        <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-1"
            >
              <div className="flex items-center gap-3 bg-white/10 w-fit px-4 py-2 rounded-full border border-white/10 mb-8 backdrop-blur-md">
                <FiAward className="text-secondary" />
                <span className="text-[0.65rem] font-black text-white uppercase tracking-[0.2em]">Verified Interview Report</span>
              </div>

              <h1 className="text-4xl lg:text-5xl font-black text-white mb-6 tracking-tighter leading-tight">
                Assessment <br /><span className="text-secondary">Summary Results</span>
              </h1>

              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md max-w-xl">
                <p className="text-white/70 text-base lg:text-lg font-medium leading-relaxed italic">
                  "{summary}"
                </p>
              </div>

              {/* Score Details */}
              <div className="mt-6 flex flex-wrap gap-4">
                <div className="px-5 py-2 bg-white/10 border border-white/10 rounded-full text-white text-sm font-bold">
                  Total Score: {data.total_score}/{data.max_score}
                </div>
                <div className="px-5 py-2 bg-white/10 border border-white/10 rounded-full text-white text-sm font-bold">
                  Percentage: {overallPercentage}%
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="relative p-10 bg-brand-dark/50 border border-white/10 rounded-[3rem] shadow-2xl backdrop-blur-xl flex flex-col items-center"
            >
              <CircularProgress score={overallPercentage} size={180} />
              <div className="mt-6 flex flex-col items-center gap-1">
                 <span className="text-[0.7rem] font-black text-white/40 uppercase tracking-widest">Performance Grade</span>
                 <div className="px-6 py-2 bg-secondary rounded-full font-black text-brand-dark text-xl shadow-lg shadow-secondary/20 uppercase tracking-tight">
                   {grade}
                 </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 -mt-10 relative z-20">

        {/* Question-wise Detailed Scores */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-[2.5rem] p-8 lg:p-10 shadow-xl border border-gray-100"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-light flex items-center justify-center rounded-xl text-brand-dark">
                <FiStar className="text-secondary" />
              </div>
              <h3 className="text-xl font-black text-brand-dark tracking-tight">Question-wise Analysis</h3>
            </div>
            <span className="text-[0.65rem] font-black text-gray-400 uppercase tracking-widest hidden sm:block">
              {questionScores.length} Questions Evaluated
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {questionScores.map((qs) => (
              <div key={qs.id} className="overflow-hidden border-b border-gray-50 last:border-0">
                <button
                  onClick={() => setExpandedQuestion(expandedQuestion === qs.id ? null : qs.id)}
                  className={`w-full flex items-center gap-4 py-4 px-6 transition-all hover:bg-brand-light/50 text-left rounded-2xl ${expandedQuestion === qs.id ? 'bg-brand-light/50 shadow-inner' : ''}`}
                >
                  <span className="w-8 text-[0.7rem] font-black text-gray-400 uppercase tracking-widest">Q{qs.id}</span>
                  <div className="flex-1">
                    <ScoreBar score={qs.score} colorClass={getScoreBarColor(qs.score)} />
                  </div>
                  <div className={`px-4 py-1.5 rounded-xl font-black text-sm min-w-[3.5rem] text-center ${getScoreBg(qs.score)} ${getScoreColor(qs.score)} shadow-sm`}>
                    {qs.rawScore}/10
                  </div>
                  {expandedQuestion === qs.id ? <FiChevronUp className="text-gray-400" /> : <FiChevronDown className="text-gray-400" />}
                </button>

                <AnimatePresence>
                  {expandedQuestion === qs.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-12 py-6 overflow-hidden"
                    >
                      <div className="p-6 bg-brand-light text-brand-dark/80 rounded-3xl border border-brand-dark/5 text-sm font-medium leading-relaxed relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-brand-dark/10" />
                        <span className="text-brand-dark font-black uppercase text-[0.65rem] block mb-2 tracking-widest opacity-50">
                          [{qs.difficulty}] Q{qs.id}: {qs.question}
                        </span>
                        <p className="italic">{qs.feedback}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Global Action Bar */}
        <div className="mt-12 flex flex-col sm:flex-row gap-6">
          <button className="flex-1 bg-white border-2 border-brand-dark text-brand-dark py-5 rounded-3xl font-black text-base flex items-center justify-center gap-3 transition-all hover:bg-brand-dark hover:text-white group active:scale-95 shadow-lg cursor-pointer">
            <FiDownload className="group-hover:rotate-12 transition-transform" />
            Download PDF Report
          </button>
          <button
            onClick={() => {
              const testInfo = loadTestInfo();
              const completedModules = JSON.parse(localStorage.getItem('completedModules') || '[]');
              const nextRoute = getNextModuleRoute(testInfo, completedModules);
              navigate(nextRoute, { state: { uniqueId } });
            }}
            className="flex-[1.5] bg-brand-dark text-white py-5 rounded-3xl font-black text-base flex items-center justify-center gap-3 transition-all hover:scale-[1.02] shadow-2xl active:scale-95 cursor-pointer"
          >
            Continue to Next Module
            <FiArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
}
