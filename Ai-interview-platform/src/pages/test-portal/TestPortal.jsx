import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiMic, FiSquare, FiPlay, FiPause, FiArrowRight,
  FiCheckCircle, FiClock, FiEdit3, FiSave, FiAlertCircle,
  FiVolume2, FiLoader
} from 'react-icons/fi';
import { transcribeAudio, synthesizeSpeech } from '../../services/interviewApi';
import ProctorOverlay from '../../routes/ProctorOverlay';
import { loadTestInfo, loadCompletedModules, getNextModuleRoute, markModuleCompleted } from '../../utils/testFlowUtils';
import ScreenProctor from '../../routes/ScreenProctor';


export default function TestPortal() {
  const navigate = useNavigate();
  const location = useLocation();

  // Receive data from ResumeParser
  const parsedData = location.state?.parsedData;
  const backendQuestions = location.state?.questions || [];
  const sessionId = location.state?.sessionId;
  const uniqueId = location.state?.uniqueId;

  const totalQuestions = backendQuestions.length;


  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasRecording, setHasRecording] = useState({});
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sttError, setSttError] = useState(null);
  const [hasEdited, setHasEdited] = useState({}); // Tracking if user edited for each question


  // Timed Editing
  const [isEditing, setIsEditing] = useState(false);
  const [editTimer, setEditTimer] = useState(0);
  const editTimerIntervalRef = useRef(null);
  const recordingTimerRef = useRef(null);

  // Real MediaRecorder refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const currentAudioRef = useRef(null);

  const question = backendQuestions[currentQuestion] || {};

  // Overall session timer (20 minutes)
  const [sessionTimeLeft, setSessionTimeLeft] = useState(20 * 60);
  const overallTimerRef = useRef(null);

  useEffect(() => {
    if (!backendQuestions.length) return;

    overallTimerRef.current = setInterval(() => {
      setSessionTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(overallTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (overallTimerRef.current) clearInterval(overallTimerRef.current);
    };
  }, [backendQuestions.length]);

  // Auto-submit when overall timer runs out
  useEffect(() => {
    if (sessionTimeLeft === 0 && backendQuestions.length > 0) {
      // Build the answers payload for the evaluation page
      const answerPayload = backendQuestions.map((q, i) => ({
        question_id: q.id,
        candidate_answer: answers[i] || '(no answer)',
      }));

      navigate('/interview/evaluation', {
        state: {
          sessionId,
          answers: answerPayload,
          questions: backendQuestions,
          uniqueId
        }
      });
    }
  }, [sessionTimeLeft, backendQuestions, answers, sessionId, uniqueId, navigate]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 120) {
            handleStopRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      clearInterval(recordingTimerRef.current);
    }
    return () => clearInterval(recordingTimerRef.current);
  }, [isRecording]);

  // Edit window timer
  useEffect(() => {
    if (editTimer > 0) {
      editTimerIntervalRef.current = setInterval(() => {
        setEditTimer(prev => prev - 1);
      }, 1000);
    } else if (editTimer === 0 && isEditing) {
      clearInterval(editTimerIntervalRef.current);
      setIsEditing(false);
      setHasEdited(prev => ({ ...prev, [currentQuestion]: true }));
    } else {
      clearInterval(editTimerIntervalRef.current);
    }
    return () => clearInterval(editTimerIntervalRef.current);
  }, [editTimer]);

  // ── Real Recording with MediaRecorder ──
  const handleStartRecording = async () => {
    setSttError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      mediaRecorder.start(1000); // collect chunks every 1s
      setIsRecording(true);
      setRecordingTime(0);
      setEditTimer(0);
      setIsEditing(false);
    } catch (err) {
      console.error('Mic error:', err);
      setSttError('Microphone access denied. Please allow microphone permissions.');
    }
  };

  const handleStopRecording = async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    setIsRecording(false);
    setIsTranscribing(true);
    clearInterval(recordingTimerRef.current);

    // Stop the recorder – this triggers final 'dataavailable' + 'stop'
    mediaRecorderRef.current.stop();

    // Wait a beat for the final data chunk
    await new Promise(r => setTimeout(r, 500));

    // Stop all mic tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    setHasRecording(prev => ({ ...prev, [currentQuestion]: true }));

    // Transcribe the audio via Module 2 STT
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

    try {
      const result = await transcribeAudio(audioBlob);
      const existingText = answers[currentQuestion] || '';
      const newText = existingText ? existingText + ' ' + result.text : result.text;
      setAnswers(prev => ({ ...prev, [currentQuestion]: newText }));

      // REMOVED: Automatic 20-second edit window (now triggers on manual click)
    } catch (err) {
      console.error('STT error:', err);
      setSttError(`Transcription failed: ${err.message}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  // ── TTS: Speak the question aloud ──
  const handleSpeakQuestion = async () => {
    if (!question.question) return;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    setIsSpeaking(true);
    try {
      const audioBlob = await synthesizeSpeech(question.question);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      audio.onended = () => setIsSpeaking(false);
      await audio.play();
    } catch (err) {
      console.error('TTS error:', err);
      setIsSpeaking(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleEditChange = (e) => {
    setAnswers(prev => ({ ...prev, [currentQuestion]: e.target.value }));
  };

  const handleSaveAndContinue = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(prev => prev + 1);
      setIsRecording(false);
      setRecordingTime(0);
      setIsPlaying(false);
      setEditTimer(0);
      setIsEditing(false);
      setSttError(null);
    } else {
      // Build the answers payload for the evaluation page
      const answerPayload = backendQuestions.map((q, i) => ({
        question_id: q.id,
        candidate_answer: answers[i] || '(no answer)',
      }));

      navigate('/interview/evaluation', {
        state: {
          sessionId,
          answers: answerPayload,
          questions: backendQuestions,
          uniqueId
        }
      });
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
      setIsRecording(false);
      setRecordingTime(0);
      setIsPlaying(false);
      setEditTimer(0);
      setIsEditing(false);
      setSttError(null);
    }
  };

  // Waveform bars
  const generateWaveformBars = (count = 40) => {
    return Array.from({ length: count }, (_, i) => {
      const height = isRecording
        ? 8 + Math.random() * 28
        : hasRecording[currentQuestion]
          ? 6 + Math.sin(i * 0.3) * 12 + Math.random() * 8
          : 4 + Math.sin(i * 0.5) * 3;
      return height;
    });
  };

  const [waveformBars, setWaveformBars] = useState(generateWaveformBars());

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setWaveformBars(generateWaveformBars());
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Guard: if no questions were passed, show an error
  if (!backendQuestions.length) {
    return (
      <div className="min-h-screen bg-[#f8fafa] font-sans flex items-center justify-center">
        <div className="text-center max-w-md px-8">
          <FiAlertCircle className="mx-auto text-5xl text-red-500 mb-6" />
          <h2 className="text-2xl font-black text-brand-dark mb-3">No Questions Available</h2>
          <p className="text-gray-500 mb-8">Please go back and parse a resume first to generate interview questions.</p>
          <button
            onClick={() => navigate('/interview/resume-parser')}
            className="px-8 py-3 bg-brand-dark text-white rounded-xl font-bold cursor-pointer hover:scale-105 transition-all"
          >
            Go to Resume Parser
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafa] font-sans">
      {/* Continuous Face Monitoring */}
      <ScreenProctor />
      <ProctorOverlay uniqueId={uniqueId} />
      {/* Top Progress Bar */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[0.7rem] font-extrabold text-gray-500 uppercase tracking-widest">
              Interview Progress
            </span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-brand-light/35 border border-brand-dark/10 rounded-lg text-brand-dark">
                <FiClock className={sessionTimeLeft < 60 ? "animate-pulse text-red-500" : ""} size={14} />
                <span className="text-xs font-bold font-mono">
                  {Math.floor(sessionTimeLeft / 60)}:{(sessionTimeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <span className="text-[0.8rem] font-bold text-brand-dark">
                Question {currentQuestion + 1} of {totalQuestions}
              </span>
            </div>
          </div>
          <div className="h-[5px] bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-brand-dark to-[#1b7a6e] rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Main Content - 50/50 split */}
      <div className="max-w-7xl mx-auto px-8 py-12 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        {/* Left Side - Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col"
          >
            {/* Difficulty badge */}
            <div className="inline-block px-[0.85rem] py-[0.35rem] bg-[#f0fdf4] text-[#16a34a] rounded-[0.4rem] font-bold text-[0.65rem] uppercase tracking-wide mb-6 w-fit">
              {question.difficulty || question.category || 'Interview'}
            </div>

            {/* Question Text */}
            <h2 className="text-[1.8rem] font-extrabold text-[#111827] leading-tight mb-6 tracking-tight">
              {question.question || 'Loading question...'}
            </h2>

            {/* Speak Question Button */}
            <button
              onClick={handleSpeakQuestion}
              disabled={isSpeaking}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-[1.5px] mb-8 font-bold text-sm transition-all w-fit ${isSpeaking
                ? 'bg-brand-dark text-white border-brand-dark cursor-wait'
                : 'bg-white text-brand-dark border-gray-300 hover:bg-brand-dark hover:text-white cursor-pointer'
                }`}
            >
              <FiVolume2 className={isSpeaking ? 'animate-pulse' : ''} />
              {isSpeaking ? 'Speaking...' : 'Listen to Question'}
            </button>

            {/* Audio Waveform Preview Card */}
            <div className="bg-white rounded-[1.25rem] p-8 border border-gray-200 mb-8 shadow-sm">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => {
                    if (isRecording) handleStopRecording();
                    else handleStartRecording();
                  }}
                  disabled={isTranscribing || (!isRecording && hasRecording[currentQuestion])}
                  className={`w-14 h-14 rounded-full border-none flex items-center justify-center cursor-pointer transition-all flex-shrink-0 text-white shadow-md active:scale-95 ${isTranscribing ? 'bg-yellow-500 cursor-wait' :
                    isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' :
                      hasRecording[currentQuestion] ? 'bg-gray-400 cursor-not-allowed opacity-50' : 'bg-brand-dark hover:scale-105'
                    }`}
                >
                  {isTranscribing ? <FiLoader size={20} className="animate-spin" /> :
                    isRecording ? <FiSquare size={20} /> :
                      hasRecording[currentQuestion] ? <FiCheckCircle size={20} /> :
                        <FiPlay size={20} className="ml-1" />}
                </button>

                {/* Waveform Visualization */}
                <div className="flex-1 flex items-center gap-[3px] h-12 overflow-hidden">
                  {waveformBars.map((h, i) => (
                    <div
                      key={i}
                      style={{ height: `${h}px` }}
                      className={`w-[4px] rounded-[2px] transition-all duration-300 ${isRecording
                        ? (i % 3 === 0 ? 'bg-red-500' : 'bg-brand-dark opacity-90')
                        : 'bg-brand-dark opacity-40'
                        }`}
                    />
                  ))}
                </div>

                <span className="text-[0.75rem] font-black text-gray-500 uppercase tracking-[0.1em] whitespace-nowrap">
                  {isTranscribing ? 'Transcribing...' :
                    isRecording ? formatTime(recordingTime) : 'Record your answer'}
                </span>
              </div>
            </div>

            {/* STT Error Display */}
            {sttError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700">
                <FiAlertCircle className="mt-0.5 flex-shrink-0" />
                <span className="text-sm font-semibold">{sttError}</span>
              </div>
            )}

            {/* Navigation Buttons for Questions */}
            <div className="flex items-center gap-4 mt-6">
              {currentQuestion > 0 && (
                <button
                  onClick={handlePrevious}
                  className="px-6 py-3 rounded-[0.8rem] border-[1.5px] border-gray-300 bg-white text-gray-700 font-bold text-[0.85rem] cursor-pointer hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
                >
                  ← Previous
                </button>
              )}

              {/* Pagination Dots */}
              <div className="flex items-center gap-1.5 flex-wrap py-2">
                {backendQuestions.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setCurrentQuestion(i);
                      setIsRecording(false);
                      setRecordingTime(0);
                      setEditTimer(0);
                      setSttError(null);
                    }}
                    className={`h-2.5 rounded-full cursor-pointer transition-all duration-300 ${i === currentQuestion ? 'w-8 bg-brand-dark' :
                      i < currentQuestion ? 'w-2.5 bg-[#16a34a]' :
                        'w-2.5 bg-gray-300'
                      }`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Right Side - Voice Input Only */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[1.5rem] border border-gray-200 shadow-[0_10px_30px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col min-h-[500px]"
        >
          {/* Voice Input Section */}
          <div className="p-8 pb-8 bg-brand-light/20 border-b border-gray-100">
            <p className="text-[0.7rem] font-black text-brand-dark opacity-40 uppercase tracking-[0.2em] mb-4">
              Voice Transcription Mode
            </p>
            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              disabled={isTranscribing || (!isRecording && hasRecording[currentQuestion])}
              className={`w-full py-6 px-8 rounded-[1rem] border-none text-white font-black text-[1.1rem] cursor-pointer flex items-center justify-center gap-4 transition-all shadow-xl active:scale-[0.98] ${isTranscribing
                ? 'bg-yellow-500 shadow-yellow-500/20 cursor-wait'
                : isRecording
                  ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/20'
                  : hasRecording[currentQuestion]
                    ? 'bg-gray-400 shadow-none cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-br from-brand-dark to-[#1b7a6e] shadow-brand-dark/20 hover:shadow-brand-dark/30 hover:scale-[1.01]'
                }`}
            >
              {isTranscribing ? (
                <>
                  <FiLoader size={22} className="animate-spin" />
                  Transcribing Audio...
                </>
              ) : isRecording ? (
                <>
                  <FiSquare size={22} />
                  Stop Recording ({formatTime(recordingTime)})
                </>
              ) : hasRecording[currentQuestion] ? (
                <>
                  <FiCheckCircle size={22} />
                  Answer Recorded
                </>
              ) : (
                <>
                  <FiMic size={22} />
                  Record Your Answer
                </>
              )}
            </button>
            <div className="flex items-center justify-center gap-2 mt-5">
              <FiClock size={16} className="text-gray-400" />
              <span className="text-[0.8rem] text-gray-400 font-semibold tracking-tight">
                Transcription will appear below automatically.
              </span>
            </div>
          </div>

          {/* Transcription Display Area */}
          <div className="flex-1 p-8 relative">
            <div className="flex items-center justify-between mb-4">
              {/* Edit Timer / Action (One time only) */}
              {answers[currentQuestion] && !isEditing && !hasEdited[currentQuestion] && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => {
                    setIsEditing(true);
                    setEditTimer(20);
                  }}
                  className="flex items-center gap-2 px-4 py-1.5 bg-brand-dark text-white rounded-lg text-xs font-black shadow-md hover:scale-105 transition-all"
                >
                  <FiEdit3 /> Edit Answer
                </motion.button>
              )}
              {isEditing && (
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-brand-dark/10 text-brand-dark rounded-md text-[0.7rem] font-bold flex items-center gap-1.5">
                    <FiClock className="animate-pulse" /> {editTimer}s remaining
                  </div>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditTimer(0);
                      setHasEdited(prev => ({ ...prev, [currentQuestion]: true }));
                    }}
                    className="flex items-center gap-2 px-4 py-1.5 bg-[#16a34a] text-white rounded-lg text-xs font-black shadow-md"
                  >
                    <FiSave /> Done
                  </button>
                </div>
              )}
            </div>

            <div className="relative h-full min-h-[220px]">
              {isEditing ? (
                <textarea
                  value={answers[currentQuestion] || ''}
                  onChange={handleEditChange}
                  className="w-full h-full min-h-[220px] rounded-xl border-2 border-brand-dark/10 p-5 text-[1rem] text-gray-700 font-medium resize-none outline-none bg-white focus:border-brand-dark"
                  autoFocus
                  placeholder="Start typing your answer..."
                />
              ) : answers[currentQuestion] ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full h-full p-6 rounded-xl bg-[#fafbfb] border border-gray-100 text-[1rem] text-brand-dark/70 font-medium leading-relaxed italic relative"
                >
                  {answers[currentQuestion]}
                  {(editTimer === 0 || hasEdited[currentQuestion]) && (
                    <div className="absolute top-4 right-4 text-green-500 opacity-50">
                      <FiCheckCircle size={20} />
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="w-full h-full min-h-[220px] border-2 border-dashed border-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-300">
                  <FiMic size={40} className="mb-4 opacity-20" />
                  <p className="text-sm font-bold uppercase tracking-widest opacity-30">Waiting for voice input...</p>
                </div>
              )}
            </div>

            {/* Warning if edit window is closing */}
            {editTimer > 0 && editTimer <= 5 && !isEditing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 flex items-center gap-2 text-red-500 text-[0.7rem] font-black uppercase tracking-widest bg-red-50 p-3 rounded-lg border border-red-100"
              >
                <FiAlertCircle className="animate-pulse" /> Final seconds to edit!
              </motion.div>
            )}
          </div>

          {/* Main Action Button */}
          <div className="px-8 pb-8 mt-auto">
            <button
              onClick={handleSaveAndContinue}
              disabled={!answers[currentQuestion] || isRecording || isTranscribing}
              className={`w-full py-5 rounded-[1rem] border-none font-black text-[1rem] cursor-pointer flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${!answers[currentQuestion] || isRecording || isTranscribing
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                : currentQuestion === totalQuestions - 1
                  ? 'bg-gradient-to-br from-[#16a34a] to-[#15803d] text-white shadow-lg'
                  : 'bg-brand-dark text-white hover:shadow-brand-dark/20 hover:scale-[1.01]'
                }`}
            >
              {currentQuestion === totalQuestions - 1 ? (
                <>Finish & Submit Interview <FiCheckCircle size={18} /></>
              ) : (
                <>Next Question <FiArrowRight size={18} /></>
              )}
            </button>
          </div>

          {/* AI Status Bar */}
          <div className="p-4 bg-brand-light/30 border-t border-gray-100 flex items-center justify-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse" />
            <span className="text-[0.7rem] text-brand-dark/60 font-black uppercase tracking-widest">
              AI Speech Engine: <span className="text-[#16a34a]">Ready for Streaming</span>
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}