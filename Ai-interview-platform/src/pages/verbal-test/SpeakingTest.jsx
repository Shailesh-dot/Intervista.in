import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMic, FiSkipForward, FiCheck, FiClock, FiPlay, FiUser, FiInfo, FiExternalLink, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import axios from 'axios';
import { getSpeakingQuestions, evaluateSpeakingClip, aggregateSpeakingScore } from '../../services/communicationApi';
import ProctorOverlay from '../../routes/ProctorOverlay';
import ScreenProctor from '../../routes/ScreenProctor';

// CircularTimer Component
const CircularTimer = ({ duration, size = 320, strokeWidth = 16, status, active, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const totalSRef = useRef(duration);
  const hasCompletedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  // Reset timer state whenever duration or status (phase) changes
  useEffect(() => {
    setTimeLeft(duration);
    totalSRef.current = duration;
    hasCompletedRef.current = false;
  }, [duration, status]);

  // Handle countdown
  useEffect(() => {
    if (!active) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true;
            onCompleteRef.current?.();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [active, duration, status]);

  const offset = circumference - (timeLeft / (totalSRef.current || 1)) * circumference;

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="#F3F6F6" strokeWidth={strokeWidth} fill="transparent"
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={active ? (status === 'RECORDING' ? '#EF4444' : '#DAFF0C') : '#E0E0E0'}
          strokeWidth={strokeWidth} fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: active ? offset : circumference }}
          transition={{ duration: 1, ease: "linear" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-[80px] leading-none font-bold tracking-tight text-[#144542]">
          {formatTime(timeLeft)}
        </span>
        <span className="text-sm font-bold text-[#9B9B9B] uppercase mt-2 tracking-[0.2em]">
          {status}
        </span>
      </div>
    </div>
  );
};

const SpeakingTest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { uniqueId } = location.state || {};
  const [session, setSession] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [clipResults, setClipResults] = useState([null, null, null]);
  const [phase, setPhase] = useState('loading'); // loading | idle | preparing | recording | submitting
  const [candidateInfo, setCandidateInfo] = useState({ name: 'Candidate', id: uniqueId || 'UNKNOWN' });
  const [micVolume, setMicVolume] = useState(0);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  // Overall Speaking session timer (15 minutes)
  const [speakingTimeLeft, setSpeakingTimeLeft] = useState(15 * 60);
  const overallTimerRef = useRef(null);

  useEffect(() => {
    const updateTime = () => {
      const startTimeStr = localStorage.getItem('speaking_start_time');
      if (startTimeStr) {
        const elapsed = Math.floor((Date.now() - parseInt(startTimeStr)) / 1000);
        const remaining = Math.max(0, 15 * 60 - elapsed);
        setSpeakingTimeLeft(remaining);
        if (remaining <= 0) {
          if (overallTimerRef.current) clearInterval(overallTimerRef.current);
        }
      }
    };

    updateTime();
    overallTimerRef.current = setInterval(updateTime, 1000);

    return () => {
      if (overallTimerRef.current) clearInterval(overallTimerRef.current);
    };
  }, []);

  // Auto-submit and go to listening when Speaking time is up
  useEffect(() => {
    const handleTimeUp = async () => {
      if (speakingTimeLeft === 0 && phase !== 'loading' && session) {
        // Stop any active timer
        if (overallTimerRef.current) clearInterval(overallTimerRef.current);

        // Go to listening test carrying whatever clip results we have
        navigate('/verbal/listening', {
          state: { 
            sessionId: session.session_id, 
            uniqueId, 
            speakingClipResults: clipResults 
          }
        });
      }
    };
    handleTimeUp();
  }, [speakingTimeLeft, phase, session, clipResults, navigate, uniqueId]);

  // Real-time Mic Volume Analyzer Effect
  useEffect(() => {
    let audioContext;
    let analyser;
    let microphone;
    let animationFrame;

    const initMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateVolume = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          // Scale to 0-100%
          const percent = Math.min(100, Math.round((average / 64) * 100));
          setMicVolume(prev => {
            const smoothed = Math.round(prev * 0.7 + percent * 0.3);
            return Math.max(2, smoothed); // tiny baseline to show it's active
          });
          animationFrame = requestAnimationFrame(updateVolume);
        };
        updateVolume();
      } catch (err) {
        console.error("Mic access denied for volume meter", err);
      }
    };

    initMic();

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (audioContext && audioContext.state !== 'closed') audioContext.close();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const data = await getSpeakingQuestions();
        setSession(data);
        setPhase('idle'); // Question 1 starts idle

        // Fetch Profile Info
        const email = localStorage.getItem("userEmail");
        const userId = localStorage.getItem("userId");
        const token = localStorage.getItem("authToken");

        if (email && token) {
          try {
            const authRes = await axios.get(`/api/user/auth/profile/${encodeURIComponent(email)}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (authRes.data?.name) {
              setCandidateInfo(prev => ({ ...prev, name: authRes.data.name }));
            }
          } catch (e) { console.error("Auth profile fetch failed", e); }
        }

        if (userId) {
          try {
            const profileRes = await axios.get(`/api/user/profile/me`, { headers: { Authorization: `Bearer ${token}` } });
            if (profileRes.data) {
              const d = profileRes.data;
              setCandidateInfo({
                name: d.FullName || d.fullName || d.name || 'Candidate',
                id: userId
              });
            }
          } catch (e) { console.error("Verification profile fetch failed", e); }
        }
      } catch (err) {
        console.error("Failed to load session", err);
      }
    };
    init();
  }, []);

  const startPreparation = () => setPhase('preparing');

  const startRecording = async () => {
    setPhase('recording');
    try {
      let stream = streamRef.current;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      }
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = handleStop;
      mediaRecorderRef.current.start();
    } catch (err) {
      console.error("Mic error", err);
    }
  };

  const handleStop = async () => {
    const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
    chunksRef.current = [];
    setPhase('submitting');

    try {
      const result = await evaluateSpeakingClip(session.session_id, currentIdx, blob);
      const updated = [...clipResults];
      updated[currentIdx] = result;
      setClipResults(updated);

      if (updated.every(r => r !== null)) {
        navigate('/verbal/listening', {
          state: { sessionId: session.session_id, uniqueId, speakingClipResults: updated }
        });
      } else {
        let nextUnanswered = updated.findIndex((r, idx) => idx > currentIdx && r === null);
        if (nextUnanswered === -1) {
          nextUnanswered = updated.findIndex(r => r === null);
        }
        if (nextUnanswered !== -1) {
          setCurrentIdx(nextUnanswered);
          setPhase('preparing');
        }
      }
    } catch (err) {
      console.error("Submission error", err);
      setPhase('idle');
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0 && phase !== 'recording' && phase !== 'submitting') {
      setCurrentIdx(prev => prev - 1);
      setPhase('idle');
    }
  };

  const handleNext = () => {
    if (currentIdx < 2 && phase !== 'recording' && phase !== 'submitting') {
      setCurrentIdx(prev => prev + 1);
      setPhase('idle');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      // Do not stop stream tracks here so the mic monitor continues working
    }
  };

  if (phase === 'loading') return null;

  // Question 1: 120s, Question 2 & 3: 60s
  const getPrepDuration = () => currentIdx === 0 ? 120 : 60;
  const getRecDuration = () => 60;

  const getTimerDuration = () => phase === 'recording' ? getRecDuration() : getPrepDuration();

  const getStatusText = () => {
    if (phase === 'idle') return 'READY';
    if (phase === 'preparing') return 'PREPARING';
    if (phase === 'recording') return 'RECORDING';
    if (phase === 'submitting') return 'PROCESSING';
    return phase.toUpperCase();
  };

  const formatTestTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  return (
    <div className="min-h-screen bg-white text-[#144542] flex font-primary">
      <ScreenProctor />
      <ProctorOverlay uniqueId={uniqueId} />

      {/* LEFT SIDEBAR */}
      <div className="w-[300px] border-r border-gray-100 p-8 flex flex-col gap-10 bg-[#FAFCFC]">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#9B9B9B] mb-4">Candidate Profile</h3>
          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
              <FiUser className="text-gray-400" size={24} />
            </div>
            <div>
              <div className="font-bold text-sm text-[#144542] truncate max-w-[150px]">{candidateInfo.name}</div>
              <div className="text-[10px] text-[#9B9B9B]">ID: {candidateInfo.id}</div>
            </div>
          </div>
        </div>

        <div className="mt-[-15px]">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#9B9B9B] mb-3">Speaking Time Left</h3>
          <div className="flex items-center gap-2.5 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm">
            <FiClock className={speakingTimeLeft < 60 ? "text-red-500 animate-pulse" : "text-[#144542]"} size={18} />
            <span className="font-mono font-extrabold text-sm text-[#144542]">
              {Math.floor(speakingTimeLeft / 60)}:{(speakingTimeLeft % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#9B9B9B] mb-4">Technical Status</h3>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FiMic className={phase === 'recording' ? 'text-red-500' : 'text-[#DAFF0C]'} />
              Mic Input
            </div>
            <div className="px-2 py-0.5 bg-[#DAFF0C]/30 text-[#144542] text-[10px] font-bold rounded uppercase tracking-wider">
              {streamRef.current ? 'Active' : 'Inactive'}
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-[#9B9B9B] mb-1.5 font-bold">
            <span>Signal Strength</span>
            <span>{micVolume}%</span>
          </div>
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
            <motion.div
              className="bg-[#DAFF0C] h-full"
              animate={{ width: `${micVolume}%` }}
              transition={{ type: 'spring', bounce: 0, duration: 0.1 }}
            />
          </div>
        </div>

        <div className="mt-4 pt-8 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm font-semibold mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            Session Performance
          </div>
          <p className="text-[11px] text-[#9B9B9B] italic leading-relaxed">
            "System is analyzing pacing and pronunciation in real-time. Ensure clear articulation."
          </p>
        </div>
      </div>

      {/* CENTER MAIN CONTENT */}
      <div className="flex-1 flex flex-col pt-12 pb-10 px-10 relative">
        <div className="flex items-center gap-2 mb-12">
          <div className="w-2 h-2 rounded-full bg-[#DAFF0C]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#5A7373]">Speaking Session</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full">
          {/* Question Title & Subtitle */}
          <div className="text-center mb-10 w-full flex flex-col items-center">
            {/* Outline style matching the design */}
            <h2 className="text-[48px] font-[600] tracking-tight text-gray-600 mb-6 leading-none font-primary">
              Question {currentIdx + 1} of 3
            </h2>
            <p className="text-[18px] text-black font-bold max-w-lg mb-2">
              {session?.questions[currentIdx] || "Loading prompt..."}
            </p>
            <p className="text-[15px] text-[#5A7373] max-w-lg">
              {phase === 'idle' ? "Click 'Start Preparation' to begin." : "Review the prompt and prepare your response. Recording will start automatically when the timer reaches zero."}
            </p>
          </div>

          {/* Timer */}
          <div className="mb-12">
            <CircularTimer
              duration={getTimerDuration()}
              status={getStatusText()}
              active={phase === 'preparing' || phase === 'recording'}
              onComplete={phase === 'preparing' ? startRecording : undefined}
            />
          </div>

          {/* Middle Controls (Previous / Next) */}
          <div className="flex items-center gap-6 mb-10 w-full justify-center">
            <button
              onClick={handlePrev}
              disabled={currentIdx === 0 || clipResults[currentIdx - 1] !== null || phase === 'recording' || phase === 'submitting'}
              className={`px-8 py-4 rounded-2xl border flex items-center gap-3 text-sm font-semibold transition-colors ${currentIdx === 0 || clipResults[currentIdx - 1] !== null || phase === 'recording' || phase === 'submitting'
                ? 'border-gray-100 text-[#9B9B9B] bg-white cursor-not-allowed opacity-60'
                : 'border-[#144542]/20 text-[#144542] hover:bg-gray-50 cursor-pointer shadow-sm'
                }`}
            >
              <FiChevronLeft size={18} /> Previous Question
            </button>

            <button
              onClick={handleNext}
              disabled={currentIdx === 2 || phase === 'recording' || phase === 'submitting'}
              className={`px-8 py-4 rounded-2xl border flex items-center gap-3 text-sm font-semibold transition-colors ${currentIdx === 2 || phase === 'recording' || phase === 'submitting'
                ? 'border-gray-100 text-[#9B9B9B] bg-white cursor-not-allowed opacity-60'
                : 'border-[#144542]/20 text-[#144542] hover:bg-gray-50 cursor-pointer shadow-sm'
                }`}
            >
              Next Question <FiChevronRight size={18} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-4 w-full">
            {phase === 'idle' && (
              <button
                onClick={startPreparation}
                className="flex items-center gap-3 px-10 py-5 rounded-xl font-bold transition-all bg-[#DAFF0C] text-[#144542] hover:bg-[#c4e600] shadow-md justify-center w-[300px]"
              >
                <FiPlay size={18} /> START PREPARATION
              </button>
            )}

            {phase === 'preparing' && (
              <>
                <button
                  onClick={startRecording}
                  className="flex items-center gap-3 px-8 py-5 rounded-xl text-[13px] font-bold transition-all bg-white border border-gray-200 text-[#144542] hover:bg-gray-50 flex-1 max-w-[280px] justify-center"
                >
                  <FiSkipForward size={16} /> SKIP PREPARATION
                </button>
                <button
                  onClick={startRecording}
                  className="flex items-center justify-between px-8 py-4 rounded-xl transition-all bg-[#DAFF0C] text-[#144542] hover:bg-[#c4e600] shadow-md flex-1 max-w-[340px]"
                >
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[10px] font-medium opacity-80">Ready?</span>
                    <span className="text-[15px] font-bold uppercase tracking-wide">START RECORDING</span>
                  </div>
                  <FiChevronRight size={20} />
                </button>
              </>
            )}

            {phase === 'recording' && (
              <button
                onClick={stopRecording}
                className="flex items-center gap-3 px-10 py-5 rounded-xl font-bold transition-all bg-[#EF4444] text-white hover:bg-red-600 shadow-md justify-center w-[300px] animate-pulse"
              >
                STOP RECORDING <FiCheck size={18} />
              </button>
            )}

            {phase === 'submitting' && (
              <button
                disabled
                className="flex items-center justify-center gap-3 px-10 py-5 rounded-xl font-bold bg-gray-100 text-gray-400 justify-center w-[300px] cursor-not-allowed"
              >
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                PROCESSING...
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR */}
      <div className="w-[320px] border-l border-gray-100 p-8 flex flex-col gap-8 bg-[#FAFCFC]">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold mb-6 uppercase tracking-widest text-[#144542]">
            <FiInfo className="text-[#A78BFA]" size={14} /> Tips & Hints
          </div>
          <ul className="space-y-5 text-[13px] text-[#5A7373] leading-relaxed">
            <li className="flex gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#DAFF0C] mt-1.5 flex-shrink-0" />
              <span>Use varied sentence structures (complex/compound).</span>
            </li>
            <li className="flex gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#DAFF0C] mt-1.5 flex-shrink-0" />
              <span>Focus on clear pronunciation of 'th' and 'r' sounds.</span>
            </li>
            <li className="flex gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#DAFF0C] mt-1.5 flex-shrink-0" />
              <span>Incorporate descriptive adjectives like 'scenic' or 'breathtaking'.</span>
            </li>
            <li className="flex gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#DAFF0C] mt-1.5 flex-shrink-0" />
              <span>Keep a steady pace; avoid long silences between points.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SpeakingTest;
