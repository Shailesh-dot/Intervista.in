import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FiZap, FiArrowLeft, FiCheckCircle, FiXCircle,
  FiMonitor, FiWifi, FiCamera, FiClock, FiCode,
  FiAlertTriangle, FiShield, FiCpu, FiInfo,
} from 'react-icons/fi';
import ProctorOverlay from '../../routes/ProctorOverlay';

const CODING_MODULE_URL = '/api/coding';

const stats = [
  { icon: <FiCode className="text-2xl" />, value: 'Code Problems', label: 'ASSESSMENT TYPE' },
  { icon: <FiClock className="text-2xl" />, value: 'Timed Session', label: 'TIMER ACTIVE' },
  { icon: <FiShield className="text-2xl" />, value: 'Auto Submit', label: 'ON TIMEOUT' },
];

const dos = [
  'Read each problem statement completely before writing any code.',
  'Test your solution against all provided sample cases first.',
  'Use a quiet, distraction-free environment throughout.',
  'Ensure a stable internet connection before starting.',
  'Submit only when you are confident in your solution.',
  'Manage your time wisely across all problems.',
];

const guidelines = [
  'Stay focused on the coding challenge throughout the session.',
  'Attempt all problems to demonstrate your problem-solving logic.',
  'Your solutions are automatically saved as you write code.',
];

const systemChecks = [
  { icon: <FiMonitor className="text-lg" />, label: 'Browser', value: 'Chrome / Firefox recommended' },
  { icon: <FiWifi className="text-lg" />, label: 'Internet', value: 'Stable broadband required' },
  { icon: <FiCamera className="text-lg" />, label: 'Camera', value: 'May be required for proctoring' },
  { icon: <FiCpu className="text-lg" />, label: 'System', value: 'No heavy background applications' },
];

export default function InitialProcess() {
  const navigate = useNavigate();
  const location = useLocation();
  const { uniqueId } = location.state || {};
  const [userName, setUserName] = useState('Candidate');
  const [agreed, setAgreed] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [prepTimeLeft, setPrepTimeLeft] = useState(60);

  useEffect(() => {
    if (prepTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setPrepTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [prepTimeLeft]);

  useEffect(() => {
    const name = localStorage.getItem('userName') || localStorage.getItem('userEmail') || 'Candidate';
    setUserName(name.split('@')[0]);

    // Periodically pulse the start button to draw attention
    const interval = setInterval(() => {
      setPulse((p) => !p);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = () => {
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.warn("Fullscreen request failed:", err);
        });
      }
    } catch (err) {
      console.warn("Fullscreen error:", err);
    }
    localStorage.removeItem('coding_draft_codes');
    localStorage.removeItem('coding_submissions');
    localStorage.removeItem('coding_session_submissions');
    localStorage.removeItem('coding_session_id');
    localStorage.removeItem('coding_assigned_codes');
    navigate('/coding/assessment', { state: { uniqueId } });
  };

  return (
    <div className="min-h-screen bg-[#EAF0F0] font-sans overflow-x-hidden overflow-y-auto">
      {/* Continuous Face Monitoring — paused on intro page */}
      <ProctorOverlay uniqueId={uniqueId} paused={true} />

      {/* Fixed decorative blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#144542]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#DAFF0C]/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#144542]/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-8 py-10 md:py-14">

        {/* ── Header Badge + Title ── */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#144542] rounded-full shadow-lg shadow-[#144542]/25">
            <FiZap className="text-[#DAFF0C] text-sm" />
            <span className="text-[#DAFF0C] text-xs font-bold uppercase tracking-[0.2em]">
              Coding Assessment Module
            </span>
          </div>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-5xl font-black text-[#144542] tracking-tight leading-tight mb-4">
            Coding Assessment:<br />
            <span className="text-[#144542]/50">Readiness Check</span>
          </h1>
          <p className="text-[#144542]/50 text-sm md:text-base max-w-xl mx-auto leading-relaxed font-medium">
            This module evaluates your programming aptitude through real-world coding challenges.
            Read all instructions carefully before proceeding.
          </p>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="group bg-white border border-gray-100 rounded-2xl p-6 flex flex-col items-center text-center shadow-sm hover:shadow-xl hover:border-[#144542]/10 transition-all duration-500 hover:-translate-y-1"
            >
              <div className="w-14 h-14 bg-[#144542]/5 rounded-xl flex items-center justify-center text-[#144542] mb-4 group-hover:bg-[#144542] group-hover:text-[#DAFF0C] transition-all duration-300">
                {stat.icon}
              </div>
              <span className="text-[#144542] text-lg font-black tracking-tight">{stat.value}</span>
              <span className="text-[#144542]/40 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* ── Do's & Don'ts ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Do's */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-l-2xl" />
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
                <FiCheckCircle className="text-emerald-600 text-lg" />
              </div>
              <div>
                <h3 className="text-[#144542] text-base font-black uppercase tracking-wide">Do's</h3>
                <p className="text-[#144542]/40 text-[10px] font-bold uppercase tracking-widest">Follow these guidelines</p>
              </div>
            </div>
            <div className="space-y-3">
              {dos.map((item, i) => (
                <div key={i} className="flex items-start gap-3 group">
                  <div className="w-5 h-5 mt-0.5 bg-emerald-100 rounded-full flex items-center justify-center shrink-0 group-hover:bg-emerald-500 transition-colors duration-200">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full group-hover:bg-white transition-colors duration-200" />
                  </div>
                  <p className="text-[#144542]/70 text-sm leading-relaxed font-medium">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Guidelines */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-2xl" />
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
                <FiInfo className="text-amber-600 text-lg" />
              </div>
              <div>
                <h3 className="text-[#144542] text-base font-black uppercase tracking-wide">Guidelines</h3>
                <p className="text-[#144542]/40 text-[10px] font-bold uppercase tracking-widest">For a smooth experience</p>
              </div>
            </div>
            <div className="space-y-3">
              {guidelines.map((item, i) => (
                <div key={i} className="flex items-start gap-3 group">
                  <div className="w-5 h-5 mt-0.5 bg-amber-100 rounded-full flex items-center justify-center shrink-0 group-hover:bg-amber-500 transition-colors duration-200">
                    <div className="w-2 h-2 bg-amber-500 rounded-full group-hover:bg-white transition-colors duration-200" />
                  </div>
                  <p className="text-[#144542]/70 text-sm leading-relaxed font-medium">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── System Requirements Banner ── */}
        <div className="bg-[#144542] rounded-2xl p-6 md:p-8 mb-8 relative overflow-hidden shadow-xl shadow-[#144542]/20">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-[#DAFF0C]/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="w-8 h-8 bg-[#DAFF0C]/10 rounded-lg flex items-center justify-center">
              <FiInfo className="text-[#DAFF0C] text-base" />
            </div>
            <h2 className="text-white text-base font-black uppercase tracking-widest">
              System Requirements
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
            {systemChecks.map((check, i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-200 group"
              >
                <div className="w-9 h-9 bg-[#DAFF0C]/10 rounded-lg flex items-center justify-center text-[#DAFF0C] mb-3 group-hover:bg-[#DAFF0C]/20 transition-colors">
                  {check.icon}
                </div>
                <p className="text-white/40 text-[9px] font-bold uppercase tracking-[0.15em] mb-1">{check.label}</p>
                <p className="text-white text-xs font-semibold leading-snug">{check.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Preparation Timer ── */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 mb-8 text-center shadow-xl shadow-[#144542]/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-[#144542]/2 pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center justify-center">
            {prepTimeLeft > 0 ? (
              <>
                <div className="relative w-16 h-16 flex items-center justify-center mb-3">
                  <div className="absolute inset-0 border-4 border-[#144542]/10 rounded-full" />
                  <div className="absolute inset-0 border-4 border-[#144542] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[#144542] text-xl font-black">{prepTimeLeft}s</span>
                </div>
                <h3 className="text-[#144542] text-sm font-black uppercase tracking-wide mb-1">Preparation Time Active</h3>
                <p className="text-[#144542]/50 text-xs font-semibold max-w-sm">
                  Please use this time to carefully review the guidelines and prepare yourself. The start button will activate shortly.
                </p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center text-emerald-500 mb-3 animate-bounce">
                  <FiCheckCircle className="text-2xl" />
                </div>
                <h3 className="text-emerald-700 text-sm font-black uppercase tracking-wide mb-1">Preparation Complete</h3>
                <p className="text-emerald-600/70 text-xs font-semibold max-w-sm">
                  You are ready! Check the agreement box below and click "Start Test" to begin.
                </p>
              </>
            )}
          </div>
        </div>

        {/* ── Academic Integrity Checkbox ── */}
        <div
          onClick={() => setAgreed(!agreed)}
          className={`cursor-pointer bg-white border-2 rounded-2xl p-5 mb-8 flex items-start gap-4 transition-all duration-300 ${
            agreed ? 'border-[#144542] bg-[#144542]/3' : 'border-gray-200 hover:border-[#144542]/30'
          }`}
        >
          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300 ${
            agreed ? 'bg-[#144542] border-[#144542]' : 'border-gray-300 bg-white'
          }`}>
            {agreed && (
              <svg viewBox="0 0 12 10" fill="none" className="w-3 h-2.5">
                <path d="M1 5l3 3 7-7" stroke="#DAFF0C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <div>
            <p className="text-[#144542] font-bold text-sm leading-relaxed">
              I have read and understood all the instructions above.
            </p>
            <p className="text-[#144542]/50 text-xs font-medium mt-1 leading-relaxed">
              I agree to follow the assessment guidelines and complete the tasks fairly and independently.
            </p>
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleStart}
            disabled={!agreed || prepTimeLeft > 0}
            className={`group relative cursor-pointer px-12 py-4 font-black text-sm uppercase tracking-[0.15em] rounded-xl transition-all duration-300 overflow-hidden ${
              agreed && prepTimeLeft === 0
                ? 'bg-[#DAFF0C] text-[#144542] shadow-lg shadow-[#DAFF0C]/30 hover:shadow-xl hover:shadow-[#DAFF0C]/40 hover:-translate-y-0.5'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <span className="relative z-10 flex items-center gap-2">
              <FiZap className="text-lg" />
              {prepTimeLeft > 0 ? `Start Test (${prepTimeLeft}s)` : 'Start Test'}
            </span>
            {agreed && prepTimeLeft === 0 && (
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            )}
          </button>

          <button
            onClick={() => navigate('/user/dashboard')}
            className="group cursor-pointer px-10 py-4 bg-white border-2 border-[#144542]/10 text-[#144542] font-black text-sm uppercase tracking-[0.15em] rounded-xl hover:border-[#144542]/30 hover:bg-[#144542]/5 transition-all duration-300 hover:-translate-y-0.5"
          >
            <span className="flex items-center gap-2">
              <FiArrowLeft className="text-lg group-hover:-translate-x-1 transition-transform" />
              Go Back
            </span>
          </button>
        </div>

        {/* ── Disclaimer ── */}
        <div className="flex items-center justify-center gap-2 mt-8">
          <FiShield className="text-[#144542]/30 text-sm shrink-0" />
          <p className="text-[#144542]/30 text-xs font-medium text-center">
            This assessment uses standard monitoring to ensure platform integrity and fairness.
          </p>
        </div>
      </div>
    </div>
  );
}
