import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiClock, FiCheck, FiAlertCircle, FiSend, FiLoader } from 'react-icons/fi';
import { fetchQuestions, submitAnswers, fetchResults, fetchResultAnswers } from '../../services/aptitudeApi';
import ProctorOverlay from '../../routes/ProctorOverlay';
import ScreenProctor from '../../routes/ScreenProctor';
import { submitModuleResult, markModuleCompleted, loadTestInfo, getNextModuleRoute, loadCompletedModules } from '../../utils/testFlowUtils';


const TOTAL_TIME = 30 * 60;

export default function AptitudeTest() {
  const navigate = useNavigate();
  const location = useLocation();
  const { uniqueId } = location.state || {};

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const testInfo = loadTestInfo();
        let selectedTopics = testInfo?.aptitudeMapping?.topics || [];
        if (typeof selectedTopics === 'string') {
          try {
            selectedTopics = JSON.parse(selectedTopics);
          } catch {
            selectedTopics = [selectedTopics];
          }
        }
        if (!Array.isArray(selectedTopics) && selectedTopics) {
          selectedTopics = [selectedTopics];
        }

        const data = await fetchQuestions(selectedTopics, 15);
        setQuestions(data);
      } catch (err) {
        console.error('Failed to load questions:', err);
        setError('Failed to load questions. Please check your connection and try again.');
      } finally {
        setIsLoading(false);
      }
    };
    loadQuestions();
  }, []);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      // Build answers array with the correct key 'answer' as expected by /api/save
      const answersPayload = questions.map((q) => ({
        question_id: q.id,
        answer: selectedAnswers[q.id] || null,
      }));

      const userEmail = localStorage.getItem('userEmail') || localStorage.getItem('email');

      const result = await submitAnswers(answersPayload, userEmail);

      // Fetch actual scores evaluated by backend using the result_id
      let score = 0;
      let correct = 0;
      let incorrect = 0;
      let correctAnswersList = [];
      if (result?.result_id) {
        try {
          const resultsList = await fetchResults();
          const matchingResult = resultsList.find(r => r.id === result.result_id);
          if (matchingResult) {
            score = matchingResult.score ?? matchingResult.correct ?? 0;
            correct = matchingResult.correct ?? 0;
            incorrect = matchingResult.wrong ?? 0;
          }

          // Fetch correct solutions details to store them in consolidated database
          const answersDetails = await fetchResultAnswers(result.result_id);
          correctAnswersList = questions.map((q) => {
            const detail = answersDetails.find(a => a.question_id === q.id);
            return detail ? detail.correct_answer : '';
          });
        } catch (fetchErr) {
          console.error('[Aptitude] Failed to fetch verified score or solutions:', fetchErr);
        }
      }

      // ── Save aptitude result to consolidated DB ──
      const testInfo = loadTestInfo();
      await submitModuleResult('aptitude', {
        aptitudeCode: testInfo?.aptitudeMapping?.aptitudeCode || '',
        moduleTotalScore: questions.length,
        moduleScoreSecured: score,
        questions: questions.map(q => q.question),
        userAnswers: answersPayload.map(a => a.answer),
        correctAnswers: correctAnswersList,
        topics: testInfo?.aptitudeMapping?.topics || [],
        correct: correct,
        incorrect: incorrect,
      });
      markModuleCompleted('aptitude');

      setShowSuccess(true);
      const completedModules = loadCompletedModules();
      const nextRoute = getNextModuleRoute(testInfo, completedModules);
      setTimeout(() => {
        navigate(nextRoute, { state: { uniqueId } });
      }, 3000);
    } catch (err) {
      console.error('Failed to submit:', err);
      // Mark as completed so the candidate can proceed even if DB submission failed
      markModuleCompleted('aptitude');
      
      // Still show success and redirect even if submit fails
      setShowSuccess(true);
      const testInfo = loadTestInfo();
      const completedModules = loadCompletedModules();
      const nextRoute = getNextModuleRoute(testInfo, completedModules);
      setTimeout(() => {
        navigate(nextRoute, { state: { uniqueId } });
      }, 3000);
    }
  }, [isSubmitting, questions, selectedAnswers, navigate]);

  // Timer countdown
  useEffect(() => {
    if (isLoading || questions.length === 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLoading, questions.length]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft === 0 && !isSubmitting && questions.length > 0) {
      handleSubmit();
    }
  }, [timeLeft, isSubmitting, questions.length, handleSubmit]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSelectAnswer = (questionId, option) => {
    setSelectedAnswers((prev) => {
      // If the same option is clicked again, deselect it (leave it as null)
      if (prev[questionId] === option) {
        const newAnswers = { ...prev };
        delete newAnswers[questionId];
        return newAnswers;
      }
      return { ...prev, [questionId]: option };
    });
  };

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(selectedAnswers).length;
  const isTimeLow = timeLeft < 60;
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  // ── Loading State ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#EAF0F0] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-[#144542]/10 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-[#144542] border-t-transparent rounded-full animate-spin absolute inset-0"></div>
          </div>
          <div className="text-center">
            <p className="text-[#144542] font-black text-lg tracking-wide">Loading Questions</p>
            <p className="text-[#144542]/40 text-sm font-medium mt-1">Preparing your assessment...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <div className="min-h-screen bg-[#EAF0F0] flex items-center justify-center font-sans p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl max-w-md text-center border border-red-100">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle className="text-3xl text-red-500" />
          </div>
          <h2 className="text-[#144542] text-xl font-black mb-2">Connection Error</h2>
          <p className="text-[#144542]/50 text-sm mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-[#144542] text-white font-bold text-sm rounded-xl hover:bg-[#1b5b53] transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => navigate('/user/dashboard')}
              className="px-6 py-3 bg-gray-100 text-[#144542] font-bold text-sm rounded-xl hover:bg-gray-200 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Success State ──
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-[#EAF0F0] flex items-center justify-center font-sans">
        <div className="text-center animate-fade-in">
          <div className="relative inline-block mb-6">
            <div className="w-24 h-24 bg-[#144542] rounded-full flex items-center justify-center shadow-2xl shadow-[#144542]/30">
              <FiCheck className="text-[#DAFF0C] text-5xl" strokeWidth={3} />
            </div>
            <div className="absolute inset-0 w-24 h-24 bg-[#DAFF0C]/20 rounded-full animate-ping"></div>
          </div>
          <h2 className="text-[#144542] text-3xl font-black tracking-tight mb-3">Test Submitted!</h2>
          <p className="text-[#144542]/50 text-base font-medium mb-2">Your responses have been recorded successfully.</p>
          <p className="text-[#144542]/30 text-sm font-medium">Redirecting to Next Assessment...</p>
          <div className="mt-6 flex justify-center">
            <div className="w-48 h-1.5 bg-[#144542]/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#DAFF0C] rounded-full animate-[shimmer_2s_ease-in-out_infinite]" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Test UI ──
  return (
    <div className="min-h-screen bg-[#EAF0F0] flex flex-col font-sans">
      {/* Continuous Face Monitoring */}
      <ScreenProctor />
      <ProctorOverlay uniqueId={uniqueId} />
      {/* Top Header Bar */}
      <div className="bg-[#144542] px-6 md:px-10 py-4 flex items-center justify-between shadow-lg shadow-[#144542]/20 relative z-20">
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg border border-white/5">
            <span className="text-[#DAFF0C] text-[10px] font-bold uppercase tracking-[0.15em]">Aptitude Module</span>
          </div>
          <div className="md:hidden">
            <span className="text-[#DAFF0C] text-xs font-bold uppercase tracking-wider">Aptitude</span>
          </div>
        </div>

        {/* Timer */}
        <div className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl border transition-all duration-300 ${isTimeLow
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : 'bg-white/5 border-white/10 text-white'
          }`}>
          <FiClock className={`text-lg ${isTimeLow ? 'animate-pulse' : ''}`} />
          <span className="font-mono font-bold text-lg tracking-wider">{formatTime(timeLeft)}</span>
        </div>

        {/* Question Counter */}
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-xs font-bold uppercase tracking-widest hidden md:block">Question</span>
          <div className="flex items-baseline gap-1">
            <span className="text-[#DAFF0C] text-2xl font-black">{String(currentIndex + 1).padStart(2, '0')}</span>
            <span className="text-white/30 text-sm font-bold">/ {questions.length}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-[#144542]/10">
        <div
          className="h-full bg-[#DAFF0C] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col lg:flex-row h-full">
        {/* Left/Middle Content: Question and Options */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:gap-8 p-4 md:p-8 lg:p-10">
            {/* Left Panel — Question */}
            <div className="lg:w-1/2 flex flex-col">
              {/* Category Badge */}
              <div className="mb-4">
                <span className="inline-block px-4 py-1.5 bg-[#144542]/5 border border-[#144542]/10 text-[#144542]/60 text-[10px] font-bold uppercase tracking-[0.15em] rounded-lg">
                  {currentQuestion?.category || 'General'}
                </span>
              </div>

              {/* Question Card */}
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 flex-1 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#144542]"></div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#144542] rounded-full flex items-center justify-center shrink-0 shadow-lg">
                    <span className="text-[#DAFF0C] text-sm font-black">{currentIndex + 1}</span>
                  </div>
                  <p className="text-[#144542] text-base md:text-lg leading-relaxed font-semibold flex-1 pt-1.5">
                    {currentQuestion?.question}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Panel — Options */}
            <div className="lg:w-1/2 flex flex-col">
              <div className="mb-4">
                <span className="text-[#144542]/40 text-[10px] font-bold uppercase tracking-[0.2em]">Select Your Answer</span>
              </div>

              <div className="space-y-3 flex-1">
                {currentQuestion && Object.entries(currentQuestion.options).map(([key, value]) => {
                  const isSelected = selectedAnswers[currentQuestion.id] === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleSelectAnswer(currentQuestion.id, key)}
                      className={`w-full flex items-center gap-4 p-4 md:p-5 rounded-2xl border-2 transition-all duration-300 text-left group cursor-pointer ${isSelected
                          ? 'bg-[#144542] border-[#144542] text-white shadow-xl shadow-[#144542]/20 scale-[1.02]'
                          : 'bg-white border-gray-100 text-[#144542] hover:border-[#144542]/20 hover:shadow-md'
                        }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm transition-all duration-300 ${isSelected
                            ? 'bg-[#DAFF0C] text-[#144542]'
                            : 'bg-[#144542]/5 text-[#144542]/60 group-hover:bg-[#144542]/10'
                          }`}
                      >
                        {key}
                      </div>
                      <span className={`font-semibold text-sm md:text-base flex-1 ${isSelected ? 'text-white' : ''}`}>
                        {value}
                      </span>
                      {isSelected && (
                        <div className="w-8 h-8 bg-[#DAFF0C] rounded-full flex items-center justify-center">
                          <FiCheck className="text-[#144542] text-lg" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Question Navigation */}
        <div className="w-full lg:w-80 bg-white border-l border-gray-200 p-6 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.02)] -mr-31">
          <div className="mb-6">
            <h3 className="text-[#144542] text-sm font-black uppercase tracking-widest mb-1 leading-none">Question Palette</h3>
            <p className="text-[#144542]/40 text-[10px] font-bold uppercase tracking-wider">Quick Navigation</p>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {questions.map((q, i) => {
              const isAnswered = !!selectedAnswers[q.id];
              const isCurrent = i === currentIndex;

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition-all duration-300 cursor-pointer ${isCurrent
                      ? 'ring-2 ring-offset-2 ring-[#144542] bg-[#144542] text-[#DAFF0C] scale-110 shadow-lg'
                      : isAnswered
                        ? 'bg-green-500 text-white shadow-md shadow-green-500/20 hover:scale-105'
                        : 'bg-[#144542] text-white/80 hover:bg-[#1b5b53] hover:text-white'
                    }`}
                >
                  {String(i + 1).padStart(2, '0')}
                </button>
              );
            })}
          </div>

          {/* Real-time Stats */}
          <div className="mt-8 pt-8 border-t border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[#144542]/40 text-[10px] font-bold uppercase tracking-widest">Attended</span>
              <span className="text-green-500 text-sm font-black tracking-tight">{answeredCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#144542]/40 text-[10px] font-bold uppercase tracking-widest">Not Attended</span>
              <span className="text-[#144542] text-sm font-black tracking-tight">{questions.length - answeredCount}</span>
            </div>

            <div className="pt-2">
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-500 ease-out"
                  style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-auto pt-6 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-green-500 rounded shadow-sm"></div>
              <span className="text-[#144542] text-[10px] font-bold uppercase tracking-wider">Answered</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-[#144542] rounded shadow-sm"></div>
              <span className="text-[#144542] text-[10px] font-bold uppercase tracking-wider">Not Answered / Current</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="bg-white border-t border-gray-100 px-6 md:px-10 py-4 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.03)] relative z-20">
        {/* Answered count (Desktop) */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[#144542] text-[10px] font-black uppercase tracking-widest leading-none">Assessment Progress</span>
            <span className="text-[#144542]/40 text-[9px] font-bold uppercase tracking-wider mt-1">{answeredCount} of {questions.length} Questions Answered</span>
          </div>
        </div>

        {/* Mobile: answered count */}
        <div className="md:hidden text-[#144542]/50 text-xs font-bold">
          {answeredCount}/{questions.length} answered
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 px-5 py-3 bg-gray-50 text-[#144542] font-bold text-sm rounded-xl border border-gray-100 hover:bg-gray-100 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <FiChevronLeft className="text-lg" />
            <span className="hidden md:block">Previous</span>
          </button>

          {currentIndex < questions.length - 1 ? (
            <button
              onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              className="flex items-center gap-2 px-5 py-3 bg-[#144542] text-white font-bold text-sm rounded-xl hover:bg-[#1b5b53] transition-all duration-300 shadow-md shadow-[#144542]/20 cursor-pointer"
            >
              <span className="hidden md:block">Next</span>
              <FiChevronRight className="text-lg" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-3 bg-[#DAFF0C] text-[#144542] font-black text-sm uppercase tracking-wider rounded-xl hover:shadow-lg hover:shadow-[#DAFF0C]/30 transition-all duration-300 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <FiLoader className="text-lg animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <FiSend className="text-lg" />
                  <span>Submit Test</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
