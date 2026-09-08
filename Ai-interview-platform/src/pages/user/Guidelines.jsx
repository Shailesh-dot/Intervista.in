import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FiArrowLeft, FiInfo, FiWifi, FiCheckCircle, FiMousePointer,
  FiCheck, FiHelpCircle, FiMonitor, FiCamera, FiCpu,
  FiZap, FiHeadphones, FiMic, FiAlertCircle
} from 'react-icons/fi';
import ScreenProctor from '../../routes/ScreenProctor';
import { submitModuleResult } from '../../utils/testFlowUtils';

export default function Guidelines() {
  const navigate = useNavigate();
  const location = useLocation();

  // Read testInfo from route state (passed from UserDashboard) or localStorage fallback
  const testInfo = location.state?.testInfo || (() => {
    try { return JSON.parse(localStorage.getItem('testInfo') || 'null'); } catch { return null; }
  })();

  // Determine the first enabled module route
  function getFirstModuleRoute(info) {
    if (!info) return '/user/dashboard';
    if (info.interviewModule) return '/interview/resume-parser';
    if (info.aptitudeModule)  return '/aptitude/start';
    if (info.codingModule)    return '/coding/instructions';
    if (info.verbalModule)    return '/verbal/start';
    return '/user/dashboard';
  }

  const handleStartAssessment = () => {
    submitModuleResult('start', { started: true });
    navigate(getFirstModuleRoute(testInfo));
  };

  return (
    <div className="min-h-screen bg-[#EAF0F0] font-sans overflow-x-hidden relative pb-16">
      {/* Background Decorative Circles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#144542]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#DAFF0C]/8 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-8 pt-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/user/dashboard')}
          className="group inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-100 text-[#144542] hover:bg-[#144542] hover:text-white rounded-xl transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer font-bold text-sm mb-8"
        >
          <FiArrowLeft className="text-lg group-hover:-translate-x-1 transition-transform" />
          <span>Back to Dashboard</span>
        </button>

        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#144542]/5 border border-[#144542]/20 rounded-full mb-4">
            <span className="text-[#144542] text-[10px] font-bold uppercase tracking-[0.2em]">Official Assessment</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[#144542] tracking-tight mb-3">
            Test Guidelines
          </h1>
          <p className="text-[#144542]/60 font-medium text-sm md:text-base max-w-2xl mx-auto">
            Please review these instructions carefully to ensure a smooth and fair testing experience.
          </p>
        </div>

        {/* 1. Test Instructions (Foundational Rules) */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-xl shadow-[#144542]/5 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-[#144542] rounded-2xl flex items-center justify-center text-[#DAFF0C] shrink-0 shadow-lg">
              <FiInfo className="text-2xl" />
            </div>
            <div>
              <h2 className="text-[#144542] text-lg font-black uppercase tracking-wide leading-tight">Test Instructions</h2>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">FOUNDATIONAL RULES</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {/* Rule 1 */}
            <div className="bg-white border border-gray-150 rounded-2xl p-5 flex items-center gap-4 transition-all duration-300 hover:border-[#144542]/15">
              <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-[#144542] shrink-0 bg-gray-50/50">
                <FiWifi className="text-lg" />
              </div>
              <p className="text-[#144542] text-sm md:text-base font-semibold">
                Ensure a stable internet connection. The test timer will continue even if you are disconnected temporarily.
              </p>
            </div>

            {/* Rule 2 */}
            <div className="bg-white border border-gray-150 rounded-2xl p-5 flex items-center gap-4 transition-all duration-300 hover:border-[#144542]/15">
              <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-[#144542] shrink-0 bg-gray-50/50">
                <FiCheckCircle className="text-lg" />
              </div>
              <p className="text-[#144542] text-sm md:text-base font-semibold">
                Each question has only one correct answer. No negative marking is applied for incorrect responses in this module.
              </p>
            </div>

            {/* Rule 3 */}
            <div className="bg-white border border-gray-150 rounded-2xl p-5 flex items-center gap-4 transition-all duration-300 hover:border-[#144542]/15">
              <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-[#144542] shrink-0 bg-gray-50/50">
                <FiMousePointer className="text-lg" />
              </div>
              <p className="text-[#144542] text-sm md:text-base font-semibold">
                You can navigate between questions at any time. Review and change your answers before final submission.
              </p>
            </div>
          </div>
        </div>

        {/* 2. DO'S and GUIDELINES Column Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Column 1: DO'S */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-xl shadow-[#144542]/5">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-[#E8F8F5] rounded-xl flex items-center justify-center text-[#1abc9c] shrink-0">
                <FiCheck className="text-xl font-bold" />
              </div>
              <div>
                <h3 className="text-[#144542] text-base font-black uppercase tracking-wide">DO'S</h3>
                <p className="text-gray-400 text-[9px] font-bold uppercase tracking-wider">FOLLOW THESE GUIDELINES</p>
              </div>
            </div>

            <ul className="space-y-4 text-xs md:text-sm font-semibold text-[#144542]/80 pl-2">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 bg-[#1abc9c] rounded-full shrink-0 mt-1.5" />
                <span>Read each problem statement completely before writing any code or recording responses.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 bg-[#1abc9c] rounded-full shrink-0 mt-1.5" />
                <span>Test your solution against all provided sample cases first if applicable.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 bg-[#1abc9c] rounded-full shrink-0 mt-1.5" />
                <span>Use a quiet, distraction-free environment throughout the session.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 bg-[#1abc9c] rounded-full shrink-0 mt-1.5" />
                <span>Ensure a stable internet connection before clicking 'Start Assessment'.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 bg-[#1abc9c] rounded-full shrink-0 mt-1.5" />
                <span>Submit only when you are confident in your solution; changes aren't possible after.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 bg-[#1abc9c] rounded-full shrink-0 mt-1.5" />
                <span>Manage your time wisely across all problems to ensure full completion.</span>
              </li>
            </ul>
          </div>

          {/* Column 2: GUIDELINES */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-xl shadow-[#144542]/5">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-[#EBF5FB] rounded-xl flex items-center justify-center text-[#2980b9] shrink-0">
                <FiHelpCircle className="text-xl" />
              </div>
              <div>
                <h3 className="text-[#144542] text-base font-black uppercase tracking-wide">GUIDELINES</h3>
                <p className="text-gray-400 text-[9px] font-bold uppercase tracking-wider">FOR A SMOOTH EXPERIENCE</p>
              </div>
            </div>

            <ul className="space-y-4 text-xs md:text-sm font-semibold text-[#144542]/80 pl-2">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 bg-[#2980b9] rounded-full shrink-0 mt-1.5" />
                <span>Stay focused on the coding challenge throughout the entire session.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 bg-[#2980b9] rounded-full shrink-0 mt-1.5" />
                <span>Attempt all problems to demonstrate your problem-solving logic and breadth.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 bg-[#2980b9] rounded-full shrink-0 mt-1.5" />
                <span>Your solutions are automatically saved as you write or record content.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 bg-[#2980b9] rounded-full shrink-0 mt-1.5" />
                <span>Do not attempt to exit full-screen mode or open other browser tabs.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 bg-[#2980b9] rounded-full shrink-0 mt-1.5" />
                <span>Use provided keyboard shortcuts for a more efficient workflow.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 bg-[#2980b9] rounded-full shrink-0 mt-1.5" />
                <span>Be prepared for both written, code, and audio-based assessment phases.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 3. System Requirements Banner */}
        <div className="bg-[#144542] rounded-3xl p-6 md:p-8 text-white shadow-xl mb-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-3 mb-6">
            <FiMonitor className="text-2xl text-[#DAFF0C]" />
            <h3 className="text-lg md:text-xl font-black uppercase tracking-wide">System Requirements</h3>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Req 1 */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
              <FiMonitor className="text-xl text-[#DAFF0C] mb-3" />
              <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider mb-1">BROWSER</p>
              <p className="text-sm font-extrabold leading-snug">Edge / Firefox recommended</p>
            </div>

            {/* Req 2 */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
              <FiWifi className="text-xl text-[#DAFF0C] mb-3" />
              <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider mb-1">INTERNET</p>
              <p className="text-sm font-extrabold leading-snug">Stable broadband required</p>
            </div>

            {/* Req 3 */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
              <FiCamera className="text-xl text-[#DAFF0C] mb-3" />
              <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider mb-1">CAMERA</p>
              <p className="text-sm font-extrabold leading-snug">Required for proctoring</p>
            </div>

            {/* Req 4 */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
              <FiCpu className="text-xl text-[#DAFF0C] mb-3" />
              <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider mb-1">SYSTEM</p>
              <p className="text-sm font-extrabold leading-snug">No heavy background apps</p>
            </div>
          </div>
        </div>

        {/* 4. Quick Guidelines Card */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-xl shadow-[#144542]/5">
          <div className="flex items-center gap-3 mb-6">
            <FiZap className="text-2xl text-[#144542]" />
            <h3 className="text-lg md:text-xl font-black text-[#144542] uppercase tracking-wide">Quick Guidelines</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6">
            <div className="flex items-start gap-3">
              <FiCheckCircle className="text-emerald-500 text-lg shrink-0 mt-0.5" />
              <p className="text-xs md:text-sm font-semibold text-[#144542]/80">
                Ensure you are in a quiet, well-lit environment free from background noise.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <FiCheckCircle className="text-emerald-500 text-lg shrink-0 mt-0.5" />
              <p className="text-xs md:text-sm font-semibold text-[#144542]/80">
                Grant microphone and audio permissions when prompted by your browser.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <FiCheckCircle className="text-emerald-500 text-lg shrink-0 mt-0.5" />
              <p className="text-xs md:text-sm font-semibold text-[#144542]/80">
                Speak clearly, maintaining a natural pace and consistent volume throughout.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <FiCheckCircle className="text-emerald-500 text-lg shrink-0 mt-0.5" />
              <p className="text-xs md:text-sm font-semibold text-[#144542]/80">
                Do not refresh the page or exit the browser during the assessment.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-150 w-full mb-6" />

          {/* Footer Guidelines */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-gray-400 text-[10px] md:text-xs font-black uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <FiHeadphones className="text-sm shrink-0" />
              <span>System Audio: Be Ready</span>
            </div>
            <div className="flex items-center gap-2">
              <FiMic className="text-sm shrink-0" />
              <span>Microphone Test Recommended</span>
            </div>
            <div className="flex items-center gap-2">
              <FiCheckCircle className="text-sm shrink-0" />
              <span>Attempts Allowed: 1</span>
            </div>
          </div>
        </div>
      </div>

      {/* Start Assessment CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-6 px-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-5xl">
          <button
            onClick={handleStartAssessment}
            className="w-full flex items-center justify-center gap-3 py-4 bg-[#144542] hover:bg-[#1b5b53] text-[#DAFF0C] font-black text-base uppercase tracking-widest rounded-2xl shadow-[0_10px_40px_rgba(20,69,66,0.4)] hover:shadow-[0_15px_50px_rgba(20,69,66,0.5)] transition-all duration-300 group"
          >
            <span>Start Assessment</span>
            <div className="w-2 h-2 border-t-2 border-r-2 border-[#DAFF0C] rotate-45 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
