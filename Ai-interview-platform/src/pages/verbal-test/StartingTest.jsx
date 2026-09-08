import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMic, FiHeadphones, FiCheckCircle, FiChevronRight, FiVolume2, FiInfo, FiLoader } from 'react-icons/fi';
import { MdOutlineSecurity } from 'react-icons/md'; // For the shield-like icon if needed, but we'll stick to FiCheckCircle for now as it's safe and standard.
import ProctorOverlay from '../../routes/ProctorOverlay';

const StartingTest = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Read uniqueId forwarded from the previous module (screening → verbal)
  const { uniqueId } = location.state || {};
  const [prepTimeLeft, setPrepTimeLeft] = useState(60);

  useEffect(() => {
    if (prepTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setPrepTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [prepTimeLeft]);

  const startTest = () => {
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.warn("Fullscreen request failed:", err);
        });
      }
    } catch (err) {
      console.warn("Fullscreen error:", err);
    }
    // Set the overall Speaking test start time
    localStorage.setItem('speaking_start_time', Date.now().toString());
    // Pass uniqueId forward so SpeakingTest and ListeningTest can use it
    navigate('/verbal/speaking', { state: { uniqueId } });
  };

  const rules = [
    "Ensure you are in a quiet, well-lit environment free from background noise.",
    "Grant microphone and audio permissions when prompted by your browser.",
    "Speak clearly, maintaining a natural pace and consistent volume throughout.",
    "Do not refresh the page or exit the browser during the assessment."
  ];

  return (
    <div className="min-h-screen bg-[#FAFBFA] text-[#144542] flex flex-col items-center py-16 px-4 md:px-8 font-primary overflow-y-auto">
      {/* Monitoring paused while reading instructions — camera stays visible */}
      <ProctorOverlay uniqueId={uniqueId} paused={true} />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full"
      >
        {/* Header Section */}
        <div className="text-center mb-16 flex flex-col items-center">
          <div className="inline-flex items-center px-6 py-2 rounded-full bg-white border border-gray-200 text-[10px] font-bold tracking-widest uppercase text-gray-600 mb-6 shadow-sm">
            Assessment Module
          </div>
          <h1 className="text-4xl md:text-[54px] font-bold mb-6 text-[#144542] tracking-tight leading-tight">
            Verbal Communication
          </h1>
          <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto font-medium leading-relaxed">
            This assessment evaluates your fluency, pronunciation, grammar, and listening comprehension through a series of interactive speaking and listening tasks.
          </p>
        </div>

        {/* Modules Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Card 1: Speaking */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-[24px] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all flex flex-col h-full"
          >
            <div className="mb-8">
              <FiMic className="text-2xl text-[#144542]" strokeWidth={2} />
            </div>
            <div className="mb-2">
              <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Phase 1</span>
            </div>
            <h3 className="text-2xl font-bold mb-4 text-[#144542]">Speaking Proficiency</h3>
            <p className="text-gray-600 leading-relaxed font-medium mb-8 flex-grow">
              3 dynamic questions designed to record and analyze your vocal response patterns.
            </p>
            <p className="text-sm text-gray-500 italic">
              You'll have dedicated preparation time for each task to organize your thoughts.
            </p>
          </motion.div>

          {/* Card 2: Listening */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-[24px] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all flex flex-col h-full"
          >
            <div className="mb-8 w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
              <FiHeadphones className="text-2xl text-green-500" strokeWidth={2} />
            </div>
            <div className="mb-2">
              <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Phase 2</span>
            </div>
            <h3 className="text-2xl font-bold mb-4 text-[#144542]">Listening Mastery</h3>
            <p className="text-gray-600 leading-relaxed font-medium mb-8 flex-grow">
              4 unique audio clips followed by interactive tasks and situational Q&A sessions.
            </p>
            <p className="text-sm text-gray-500 italic">
              Includes repeat tasks and comprehension checks based on the provided audio.
            </p>
          </motion.div>
        </div>

        {/* Guidelines Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-[24px] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 mb-16"
        >
          <div className="flex items-center gap-3 mb-10">
            <div className="text-[#144542]">
               <FiCheckCircle className="text-[22px]" strokeWidth={2} />
            </div>
            <h3 className="text-xl font-bold text-[#144542]">Quick Guidelines</h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-8 mb-10">
            {rules.map((rule, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <div className="mt-0.5">
                  <FiCheckCircle className="text-[#C6F53C] text-xl shrink-0" strokeWidth={2.5} />
                </div>
                <span className="text-gray-600 text-[15px] font-semibold leading-relaxed">{rule}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-8 border-t border-gray-100 pt-8">
            <div className="flex items-center gap-2.5">
              <FiVolume2 className="text-gray-400 text-lg" strokeWidth={2} />
              <span className="text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase">System Audio: Be Ready</span>
            </div>
            <div className="flex items-center gap-2.5">
              <FiInfo className="text-gray-400 text-lg" strokeWidth={2} />
              <span className="text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase">Attempts Allowed: 1</span>
            </div>
          </div>
        </motion.div>

        {/* ── Preparation Timer ── */}
        <div className="bg-white border border-gray-100 rounded-[24px] p-6 mb-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
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
                  You are ready! Click "Begin Assessment" below to start.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Action Button & Footer */}
        <div className="flex flex-col items-center text-center">
          <motion.button
            whileHover={prepTimeLeft === 0 ? { scale: 1.02 } : {}}
            whileTap={prepTimeLeft === 0 ? { scale: 0.98 } : {}}
            onClick={startTest}
            disabled={prepTimeLeft > 0}
            className={`flex items-center gap-3 px-12 py-5 rounded-full font-bold text-[17px] transition-all mb-16 cursor-pointer ${
              prepTimeLeft > 0
                ? 'bg-gray-200 border border-gray-150 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-[#DAFF0C] hover:bg-[#C6F53C] text-[#144542] shadow-[0_10px_30px_rgba(218,255,12,0.3)]'
            }`}
          >
            {prepTimeLeft > 0 ? `Begin Assessment (${prepTimeLeft}s)` : 'Begin Assessment'}
            <FiChevronRight className="text-xl" strokeWidth={3} />
          </motion.button>

          <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase mb-4">
            Professional Assessment Module V2.4.1
          </p>
          <p className="text-sm text-gray-500 font-semibold">
            By clicking "Begin Assessment", you agree to the terms of service.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default StartingTest;
