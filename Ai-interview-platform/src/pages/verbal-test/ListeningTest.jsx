import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlay, FiMic, FiCheck, FiHeadphones, FiStopCircle,
  FiClock, FiAlertCircle, FiRepeat, FiMessageSquare,
  FiUser, FiInfo, FiChevronRight, FiCircle
} from 'react-icons/fi';
import axios from 'axios';
import {
  getListeningClips,
  submitAllListeningResponses,
  aggregateListeningScore,
  aggregateSpeakingScore,
} from '../../services/communicationApi';
import ProctorOverlay from '../../routes/ProctorOverlay';
import { loadTestInfo, loadCompletedModules, getNextModuleRoute, markModuleCompleted, submitModuleResult } from '../../utils/testFlowUtils';
import ScreenProctor from '../../routes/ScreenProctor';

// ─────────────────────────────────────────────────────────────
// Waveform bar visualiser
// ─────────────────────────────────────────────────────────────
const Waveform = ({ progress = 0 }) => {
  const heights = useRef([...Array(36)].map(() => Math.random() * 60 + 20));
  return (
    <div className="flex items-center gap-[3px] h-10 w-full">
      {heights.current.map((h, i) => (
        <div
          key={i}
          className={`flex-1 rounded-full transition-colors duration-300 ${(i / 36) * 100 < progress ? 'bg-[#144542]' : 'bg-gray-100'
            }`}
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
const ListeningTest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { uniqueId, speakingClipResults } = location.state || {};

  // loading | idle | playing | ready_to_prepare | recording | completed_recording | submitting
  const [phase, setPhase] = useState('loading');
  const [session, setSession] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [audioBlobs, setAudioBlobs] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const [submitError, setSubmitError] = useState(null);
  const [candidateInfo, setCandidateInfo] = useState({ name: 'Candidate', id: uniqueId || 'UNKNOWN' });
  const [micVolume, setMicVolume] = useState(0);

  const audioRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  // Overall Listening session timer (15 minutes)
  const [listeningTimeLeft, setListeningTimeLeft] = useState(15 * 60);
  const overallTimerRef = useRef(null);
  // Prevents auto-submit from firing before the timer has had at least one
  // proper tick in this session (avoids instant-zero on mount when
  // listening_start_time is stale from a previous session).
  const timerReadyRef = useRef(false);
  const autoSubmitCalledRef = useRef(false);

  useEffect(() => {
    // Always reset the listening start time on mount so the Speaking module's
    // elapsed time does not bleed into this session's 15-minute countdown.
    localStorage.setItem('listening_start_time', Date.now().toString());
    timerReadyRef.current = false;
    autoSubmitCalledRef.current = false;

    const updateTime = () => {
      const startTimeStr = localStorage.getItem('listening_start_time');
      if (startTimeStr) {
        const elapsed = Math.floor((Date.now() - parseInt(startTimeStr)) / 1000);
        const remaining = Math.max(0, 15 * 60 - elapsed);
        setListeningTimeLeft(remaining);
        // Mark timer as properly initialized after the first real tick
        timerReadyRef.current = true;
        if (remaining <= 0) {
          if (overallTimerRef.current) clearInterval(overallTimerRef.current);
        }
      }
    };

    // Delay first tick by 1 s so state is settled before any auto-submit check
    overallTimerRef.current = setInterval(updateTime, 1000);

    return () => {
      if (overallTimerRef.current) clearInterval(overallTimerRef.current);
    };
  }, []);

  // Auto-submit when time is up — only after the timer has had a real tick
  useEffect(() => {
    if (
      listeningTimeLeft === 0 &&
      timerReadyRef.current &&
      !autoSubmitCalledRef.current &&
      phase !== 'loading' &&
      session &&
      phase !== 'submitting'
    ) {
      autoSubmitCalledRef.current = true;
      submitAll(audioBlobs);
    }
  }, [listeningTimeLeft, phase, session, audioBlobs]);



  // ── Load clips & profile on mount ─────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = await getListeningClips();
        setSession(data);
        setPhase('idle');

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
            const [profileRes, statusRes] = await Promise.all([
              axios.get(`/api/user/profile/me`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
              axios.get(`/api/user/verification/status`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null)
            ]);

            setCandidateInfo(prev => {
              const newInfo = { ...prev };
              if (profileRes && profileRes.data) {
                const d = profileRes.data;
                newInfo.name = d.FullName || d.fullName || d.name || prev.name;
              }
              if (statusRes && statusRes.data && statusRes.data.uniqueId) {
                newInfo.id = statusRes.data.uniqueId;
              } else if (newInfo.id === 'UNKNOWN') {
                newInfo.id = userId;
              }
              return newInfo;
            });
          } catch (e) { console.error("Profile/Status fetch failed", e); }
        }
      } catch (e) {
        console.error('Failed to load listening clips', e);
      }
    })();
  }, [uniqueId]);

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
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        analyser.fftSize = 256;

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
      // Only stop stream if we're not actually recording
      if (streamRef.current && phase !== 'recording') {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const currentClip = session?.clips?.[currentIdx] ?? null;
  const totalClips = session?.clips?.length ?? 4;
  const isRepeat = currentClip?.task_type === 'REPEAT';
  const isQnA = currentClip?.task_type === 'QnA';

  // ── Called after recorder stops ─────────────────────────
  const handleRecordingStop = useCallback(() => {
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    chunksRef.current = [];

    if (currentClip?.clip_id) {
      setAudioBlobs(prev => ({ ...prev, [currentClip.clip_id]: blob }));
      setPhase('completed_recording');
    } else {
      console.error("Recording stopped but currentClip is missing.");
      setPhase('idle');
    }
  }, [currentClip, setAudioBlobs, setPhase]);

  // ── Start recording ──────────────────────────────────────
  const startRecording = useCallback(async () => {
    setPhase('recording');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = e => chunksRef.current.push(e.data);
      rec.onstop = handleRecordingStop;
      rec.start();
    } catch (err) {
      console.error('Microphone error', err);
      setPhase('ready_to_prepare');
    }
  }, [handleRecordingStop]);

  // 10-Second Remembering timer
  const [rememberTimeLeft, setRememberTimeLeft] = useState(10);
  const rememberTimerRef = useRef(null);

  useEffect(() => {
    if (phase === 'remembering') {
      rememberTimerRef.current = setInterval(() => {
        setRememberTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(rememberTimerRef.current);
            startRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (rememberTimerRef.current) {
        clearInterval(rememberTimerRef.current);
      }
    }
    return () => {
      if (rememberTimerRef.current) {
        clearInterval(rememberTimerRef.current);
      }
    };
  }, [phase, startRecording]);

  // ── Play the clip audio ─────────────────────────────────
  const playAudio = () => {
    if (!currentClip?.audio_b64) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const audio = new Audio(`data:audio/wav;base64,${currentClip.audio_b64}`);
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      if (audio.duration) setPlayProgress((audio.currentTime / audio.duration) * 100);
    };
    audio.onended = () => {
      setIsPlaying(false);
      setPlayProgress(100);
      setPhase('remembering');
      setRememberTimeLeft(10);
    };
    audio.onerror = () => {
      setIsPlaying(false);
      setPhase('ready_to_prepare'); // If error, allow manual start
    };

    setIsPlaying(true);
    setPhase('playing');
    audio.play().catch(() => {
      setIsPlaying(false);
      setPhase('ready_to_prepare');
    });
  };

  // ── Stop recording manually ─────────────────────────────
  const stopRecording = () => {
    if (recorderRef.current?.state !== 'inactive') {
      recorderRef.current.stop();
      recorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  };

  // ── Advance to next question or submit ──────────────────
  const goToNext = () => {
    if (currentIdx < totalClips - 1) {
      setCurrentIdx(i => i + 1);
      setPhase('idle');
      setPlayProgress(0);
      setIsPlaying(false);
    } else {
      submitAll({ ...audioBlobs });
    }
  };

  // ── Final submission ────────────────────────────────────
  const submitAll = async (blobs) => {
    setPhase('submitting');
    setSubmitError(null);
    try {
      const audioFiles = {
        clip_1: blobs['clip_1'] ?? null,
        clip_2: blobs['clip_2'] ?? null,
        clip_3: blobs['clip_3'] ?? null,
        clip_4: blobs['clip_4'] ?? null,
      };
      const { clip_results } = await submitAllListeningResponses(session.session_id, audioFiles);
      const listeningAggregated = await aggregateListeningScore(clip_results, session.session_id);

      let speakingAggregated = null;
      if (speakingClipResults && speakingClipResults.length > 0) {
        try {
          speakingAggregated = await aggregateSpeakingScore(speakingClipResults);
        } catch (sErr) {
          console.error('Speaking aggregation failed:', sErr);
        }
      }

      navigate('/verbal/results', {
        state: {
          speakingResults: speakingAggregated,
          listeningResults: listeningAggregated,
          speakingClips: speakingClipResults || [],
          listeningClips: clip_results || [],
          uniqueId
        }
      });
    } catch (err) {
      console.error('Submission failed', err);
      setSubmitError('Submission failed. Please try again.');
      setPhase('completed_recording');
    }
  };



  // ── Loading state ───────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-primary">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-[#DAFF0C] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-[#144542] font-semibold tracking-widest uppercase text-xs">Loading listening session…</p>
        </div>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white text-[#144542] flex font-primary">
      <ScreenProctor />
      <ProctorOverlay uniqueId={uniqueId} />

      {/* LEFT SIDEBAR */}
      <div className="w-[300px] border-r border-gray-100 p-8 flex flex-col gap-10 bg-[#FAFCFC]">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#9B9B9B] mb-4">Candidate Profile</h3>
          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-400 shadow-sm">
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
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#9B9B9B] mb-3">Listening Time Left</h3>
          <div className="flex items-center gap-2.5 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm">
            <FiClock className={listeningTimeLeft < 60 ? "text-red-500 animate-pulse" : "text-[#144542]"} size={18} />
            <span className="font-mono font-extrabold text-sm text-[#144542]">
              {Math.floor(listeningTimeLeft / 60)}:{(listeningTimeLeft % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#9B9B9B] mb-4">Module Progress</h3>
          <div className="flex flex-col gap-3">
            {[...Array(totalClips)].map((_, i) => {
              const isActive = i === currentIdx;
              const isPast = i < currentIdx;
              let label = i < 2 ? 'Repeat Sentence' : 'Short Answer';

              return (
                <div
                  key={i}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isActive
                    ? 'bg-[#fcffea] border-[#DAFF0C] shadow-sm'
                    : isPast
                      ? 'bg-white border-gray-100 opacity-60'
                      : 'bg-transparent border-transparent'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-5 h-5 rounded-full ${isActive ? 'bg-[#DAFF0C] text-[#144542]' : isPast ? 'bg-[#144542] text-[#DAFF0C]' : 'bg-gray-200 text-gray-400'
                      }`}>
                      {isPast ? <FiCheck size={12} /> : <FiCircle size={10} className={isActive ? "fill-current" : ""} />}
                    </div>
                    <span className={`text-xs font-bold ${isActive ? 'text-[#144542]' : 'text-[#9B9B9B]'}`}>
                      Q{i + 1}: {label}
                    </span>
                  </div>
                  {isActive && <FiChevronRight size={16} className="text-[#DAFF0C]" />}
                </div>
              );
            })}
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
      </div>

      {/* CENTER MAIN CONTENT */}
      <div className="flex-1 flex flex-col pt-12 pb-10 px-10 relative">
        <div className="flex items-center gap-2 mb-12">
          <div className="w-2 h-2 rounded-full bg-[#DAFF0C]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#5A7373]">Listening Session</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full">
          {/* Question Title & Subtitle */}
          <div className="text-center mb-10 w-full flex flex-col items-center">
            <h2 className="text-[48px] font-[600] tracking-tight text-gray-600 mb-6 leading-none font-primary">
              Question {currentIdx + 1} of {totalClips}
            </h2>
            <p className="text-[15px] text-[#5A7373] max-w-lg mb-2">
              {isRepeat ? 'Listen to the sentence carefully and repeat it exactly as you heard it.' : 'Listen to the passage and answer the following question.'}
            </p>
          </div>

          {/* Audio Playback Card */}
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm w-full mb-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-bold text-2xl text-[#144542] mb-2">Listen to the Passage</h3>
                <p className="text-sm text-[#9B9B9B]">Play the audio before starting your response.</p>
              </div>
              <div className={`text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border ${!currentClip?.audio_b64 ? 'bg-red-50 text-red-500 border-red-100'
                : isPlaying ? 'bg-[#DAFF0C]/20 text-[#144542] border-[#DAFF0C]'
                  : playProgress === 100 ? 'bg-green-50 text-green-600 border-green-100'
                    : 'bg-gray-50 text-[#9B9B9B] border-gray-200'
                }`}>
                {!currentClip?.audio_b64 ? 'No Audio'
                  : isPlaying ? 'Playing...'
                    : playProgress === 100 ? 'Played'
                      : 'Ready'}
              </div>
            </div>

            <div className="bg-[#FAFCFC] rounded-2xl p-6 flex items-center gap-6 border border-gray-50">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
                <FiHeadphones size={20} className="text-[#144542]" />
              </div>
              <button
                onClick={playAudio}
                disabled={!currentClip?.audio_b64 || phase !== 'idle'}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${!currentClip?.audio_b64 || phase !== 'idle'
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  : 'bg-[#DAFF0C] text-[#144542] hover:scale-105 shadow-md'
                  }`}
              >
                <FiPlay size={22} fill="currentColor" />
              </button>

              <div className="flex-1 flex items-center gap-4">
                <Waveform progress={playProgress} />
              </div>
            </div>

            {/* Display question text for QnA after playing */}
            {isQnA && playProgress === 100 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 pt-6 border-t border-gray-100">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A78BFA] mb-2 block">
                  Question
                </span>
                <h4 className="text-xl font-bold text-[#144542]">
                  {currentClip?.questions?.[0] ?? 'What did you hear in the passage?'}
                </h4>
              </motion.div>
            )}

            {/* If audio is missing — allow skip */}
            {phase === 'idle' && !currentClip?.audio_b64 && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="mt-6 flex items-center gap-2 text-red-500 bg-red-50 px-4 py-3 rounded-xl border border-red-100"
              >
                <FiAlertCircle size={16} />
                <span className="text-xs font-semibold">Audio unavailable for this clip.</span>
                <button
                  onClick={startRecording}
                  className="ml-auto text-xs font-bold underline underline-offset-2 hover:text-red-700"
                >
                  Force Start Recording →
                </button>
              </motion.div>
            )}
          </div>

          {/* Recording Panel */}
          <div className="bg-[#FAFCFC] rounded-3xl p-10 border border-gray-100 border-dashed w-full flex flex-col items-center justify-center min-h-[220px]">
            {phase === 'idle' || phase === 'playing' ? (
              <div className="flex flex-col items-center opacity-40">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <FiMic size={24} className="text-gray-400" />
                </div>
                <h4 className="font-bold text-lg text-[#144542] mb-2">Recording Not Started</h4>
                <p className="text-xs text-[#9B9B9B] max-w-[250px] text-center mb-6">
                  Finish listening to the audio passage to unlock the recording phase.
                </p>
                <button disabled className="px-8 py-3 rounded-xl font-bold text-sm bg-gray-100 text-gray-400 flex items-center gap-2 cursor-not-allowed border border-gray-200">
                  <FiMic size={16} /> Start recording
                </button>
              </div>
            ) : phase === 'remembering' ? (
              <div className="flex flex-col items-center">
                <div className="relative w-20 h-20 flex items-center justify-center mb-4">
                  <div className="absolute inset-0 border-4 border-[#144542]/10 rounded-full" />
                  <div className="absolute inset-0 border-4 border-[#DAFF0C] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[#144542] text-2xl font-black">{rememberTimeLeft}s</span>
                </div>
                <h4 className="font-bold text-lg text-[#144542] mb-2">Prepare Response</h4>
                <p className="text-xs text-[#9B9B9B] max-w-[280px] text-center mb-6">
                  Taking 10 seconds to remember the audio. Recording will start automatically...
                </p>
                <button onClick={startRecording} className="px-8 py-3 rounded-xl font-bold text-sm bg-[#DAFF0C] text-[#144542] flex items-center gap-2 hover:scale-105 transition-transform shadow-md">
                  <FiMic size={16} /> Skip and start recording
                </button>
              </div>
            ) : phase === 'ready_to_prepare' ? (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <FiMic size={24} className="text-gray-400" />
                </div>
                <h4 className="font-bold text-lg text-[#144542] mb-2">Ready to Record</h4>
                <p className="text-xs text-[#9B9B9B] max-w-[250px] text-center mb-6">
                  Click below if the recording did not start automatically.
                </p>
                <button onClick={startRecording} className="px-8 py-3 rounded-xl font-bold text-sm bg-[#DAFF0C] text-[#144542] flex items-center gap-2 hover:scale-105 transition-transform shadow-md">
                  <FiMic size={16} /> Start recording
                </button>
              </div>
            ) : phase === 'recording' ? (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-6 relative">
                  <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-20" />
                  <FiMic size={32} className="text-red-500" />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-8 animate-pulse">Recording in progress...</div>

                <button
                  onClick={stopRecording}
                  className="flex items-center gap-3 px-10 py-4 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 hover:scale-105 shadow-xl transition-all"
                >
                  <FiStopCircle size={20} /> Stop Recording
                </button>
              </motion.div>
            ) : phase === 'completed_recording' ? (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-6">
                  <FiCheck size={28} className="text-green-500" />
                </div>
                <h4 className="font-bold text-lg text-[#144542] mb-6">Response Recorded Successfully</h4>
                <button
                  onClick={goToNext}
                  className="flex items-center gap-3 px-10 py-4 rounded-xl font-bold bg-[#144542] text-white hover:scale-105 shadow-xl transition-all"
                >
                  {currentIdx < totalClips - 1 ? 'Next Question' : 'Finish & Submit'} <FiChevronRight size={20} />
                </button>
              </motion.div>
            ) : phase === 'submitting' ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full border-4 border-[#DAFF0C] border-t-transparent animate-spin" />
                <span className="text-sm font-bold text-[#9B9B9B] uppercase tracking-widest">Submitting...</span>
              </div>
            ) : null}

            {submitError && (
              <div className="mt-4 flex items-center gap-2 text-red-500 text-sm font-semibold bg-red-50 px-4 py-3 rounded-xl border border-red-100">
                <FiAlertCircle size={16} /> {submitError}
              </div>
            )}
          </div>

          {/* Pagination dots at bottom */}
          <div className="flex justify-center items-center gap-3 mt-8">
            {[...Array(totalClips)].map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${i < currentIdx || (i === currentIdx && phase === 'completed_recording') ? 'w-5 h-2 bg-[#DAFF0C]'
                  : i === currentIdx ? 'w-8 h-2 bg-[#DAFF0C]'
                    : 'w-2 h-2 bg-gray-200'
                  }`}
              />
            ))}
          </div>
          <div className="mt-3 text-[9px] font-bold uppercase tracking-widest text-[#9B9B9B]">
            Q1 - Q4: Audio Tasks
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR */}
      <div className="w-[320px] border-l border-gray-100 p-8 flex flex-col gap-8 bg-[#FAFCFC]">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold mb-6 uppercase tracking-widest text-[#144542]">
            <FiInfo className="text-[#A78BFA]" size={14} /> Test Guidelines
          </div>
          <ul className="space-y-6 text-sm text-[#5A7373] leading-relaxed">
            <li className="flex gap-4 items-start">
              <FiPlay className="text-[#DAFF0C] mt-1 flex-shrink-0" size={16} />
              <span>Press Play to hear the audio passage only once.</span>
            </li>
            <li className="flex gap-4 items-start">
              <FiHeadphones className="text-[#DAFF0C] mt-1 flex-shrink-0" size={16} />
              <span>Ensure your volume is adjusted correctly before starting.</span>
            </li>
            <li className="flex gap-4 items-start">
              <FiClock className="text-[#DAFF0C] mt-1 flex-shrink-0" size={16} />
              <span>The recording starts <strong>automatically</strong> after the audio finishes.</span>
            </li>
            <li className="flex gap-4 items-start">
              <FiMic className="text-[#DAFF0C] mt-1 flex-shrink-0" size={16} />
              <span>Speak clearly and answer directly to the point.</span>
            </li>
            <li className="flex gap-4 items-start">
              <FiInfo className="text-[#DAFF0C] mt-1 flex-shrink-0" size={16} />
              <span>Reviewing guidelines will not pause the test.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ListeningTest;
