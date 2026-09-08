import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiClock, FiCheckCircle, FiAward, FiWifi, FiCpu, FiInfo, FiArrowLeft, FiZap, FiLoader } from 'react-icons/fi';
import ProctorOverlay from '../../routes/ProctorOverlay';

export default function StartingTest() {
  const navigate = useNavigate();
  const location = useLocation();
  const { uniqueId } = location.state || {};
  const [prepTimeLeft, setPrepTimeLeft] = useState(60);

  useEffect(() => {
    if (prepTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setPrepTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [prepTimeLeft]);

  const stats = [
    { icon: <FiCheckCircle className="text-2xl" />, value: '15 Questions', label: 'TOTAL VOLUME' },
    { icon: <FiClock className="text-2xl" />, value: '30 Minutes', label: 'TIMED DURATION' },
    { icon: <FiAward className="text-2xl" />, value: '1 Point', label: 'PER QUESTION' },
  ];

  const instructions = [
    {
      icon: <FiWifi className="text-xl text-[#144542]" />,
      text: 'Ensure a stable internet connection. The test timer will continue even if you are disconnected temporarily.',
    },
    {
      icon: <FiCheckCircle className="text-xl text-[#144542]" />,
      text: 'Each question has only one correct answer. No negative marking is applied for incorrect responses in this module.',
    },
    {
      icon: <FiInfo className="text-xl text-[#144542]" />,
      text: 'You can navigate between questions at any time. Review and change your answers before final submission.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#EAF0F0] flex items-center justify-center p-4 md:p-8 font-sans overflow-y-auto">
      <ProctorOverlay uniqueId={uniqueId} paused={true} />
      {/* Background decorative elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#144542]/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#DAFF0C]/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-4xl">
        {/* Header Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#144542] rounded-full shadow-lg shadow-[#144542]/20">
            <FiZap className="text-[#DAFF0C] text-sm" />
            <span className="text-[#DAFF0C] text-xs font-bold uppercase tracking-[0.2em]">Assessment Module</span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-5xl font-black text-[#144542] tracking-tight leading-tight mb-4">
            Aptitude Module:<br />Readiness Assessment
          </h1>
          <p className="text-[#144542]/50 text-sm md:text-base max-w-lg mx-auto leading-relaxed font-medium">
            This diagnostic evaluates logical reasoning, quantitative capacity, and abstract
            pattern recognition. Please ensure you are in a distraction-free environment.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="group bg-white border border-gray-100 rounded-2xl p-6 flex flex-col items-center text-center shadow-sm hover:shadow-xl hover:border-[#144542]/10 transition-all duration-500 hover:-translate-y-1"
            >
              <div className="w-14 h-14 bg-[#144542]/5 rounded-xl flex items-center justify-center text-[#144542] mb-4 group-hover:bg-[#144542] group-hover:text-white transition-all duration-300">
                {stat.icon}
              </div>
              <span className="text-[#144542] text-xl font-black tracking-tight">{stat.value}</span>
              <span className="text-[#144542]/40 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Instructions Card - Updated to Light White Theme */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8 mb-8 shadow-xl shadow-[#144542]/5 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-[#144542]/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="w-8 h-8 bg-[#144542] rounded-lg flex items-center justify-center">
              <FiInfo className="text-[#DAFF0C] text-lg" />
            </div>
            <h2 className="text-[#144542] text-lg font-black tracking-wide uppercase">Test Instructions</h2>
          </div>

          <div className="space-y-4 relative z-10">
            {instructions.map((instruction, index) => (
              <div key={index} className="flex items-start gap-4 bg-[#144542]/5 rounded-xl p-4 border border-[#144542]/5 hover:border-[#144542]/10 transition-all duration-300">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  {instruction.icon}
                </div>
                <p className="text-[#144542]/70 text-sm leading-relaxed font-medium">{instruction.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Preparation Timer ── */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-8 text-center shadow-xl shadow-[#144542]/5 relative overflow-hidden">
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
                  You are ready! Click "Start Test" below to begin.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => {
              try {
                if (document.documentElement.requestFullscreen) {
                  document.documentElement.requestFullscreen().catch((err) => {
                    console.warn("Fullscreen request failed:", err);
                  });
                }
              } catch (err) {
                console.warn("Fullscreen error:", err);
              }
              navigate('/aptitude/test', { state: { uniqueId } });
            }}
            disabled={prepTimeLeft > 0}
            className={`group border cursor-pointer relative px-10 py-4 font-black text-sm uppercase tracking-[0.15em] rounded-xl transition-all duration-300 ${
              prepTimeLeft > 0
                ? 'bg-gray-200 border-gray-150 text-gray-400 cursor-not-allowed shadow-none'
                : 'border-gray-300 bg-[#DAFF0C] text-[#144542] shadow-lg shadow-[#DAFF0C]/30 hover:shadow-xl hover:shadow-[#DAFF0C]/40 hover:-translate-y-0.5'
            } overflow-hidden`}
          >
            <span className="relative z-10 flex items-center gap-2">
              <FiZap className="text-lg" />
              {prepTimeLeft > 0 ? `Start Test (${prepTimeLeft}s)` : 'Start Test'}
            </span>
            {prepTimeLeft === 0 && (
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
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
      </div>
    </div>
  );
}
