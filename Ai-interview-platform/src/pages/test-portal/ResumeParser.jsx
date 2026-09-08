import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUploadCloud, FiFile, FiX, FiZap, FiCheckCircle,
  FiLoader, FiArrowRight, FiCpu, FiCode, FiDatabase,
  FiGlobe, FiStar, FiTrendingUp, FiAlertCircle
} from 'react-icons/fi';
import { uploadResume, generateQuestions } from '../../services/interviewApi';
import ScreenProctor from '../../routes/ScreenProctor';

// ── Steps for the AI Concierge ──
const PARSE_STEPS = [
  { label: 'Extracting skills...', key: 'extract' },
  { label: 'Analyzing experience...', key: 'analyze' },
  { label: 'Parsing resume skills...', key: 'generate' },
];



export default function ResumeParser() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  // Forward uniqueId from verification state into assessment chain
  const { uniqueId } = location.state || {};

  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseStep, setParseStep] = useState(-1);
  const [parseProgress, setParseProgress] = useState(0);
  const [isParsed, setIsParsed] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  // Drag & Drop Handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f =>
      ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
        .includes(f.type)
    );
    setFiles(prev => [...prev, ...droppedFiles]);
  }, []);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Real Resume Upload + Parse via Module 1 API
  const handleParse = async () => {
    if (files.length === 0) return;
    setIsParsing(true);
    setParseStep(0);
    setParseProgress(0);
    setApiError(null);

    try {
      // Step 1: Uploading/Extracting
      setParseStep(0);
      setParseProgress(15);
      const profileData = await uploadResume(files[0]);

      // Step 2: Analyzing (Internal delay for UI feel)
      setParseStep(1);
      setParseProgress(55);
      await new Promise(r => setTimeout(r, 800));

      // Step 3: Synthesis
      setParseStep(2);
      setParseProgress(85);

      // --- Smart Data Extraction ---
      // The backend may return empty strings for specific fields but provide data in raw_sections
      const rawSections = profileData.raw_sections || [];
      const findSection = (headers) => {
        const found = rawSections.find(s =>
          headers.some(h => s.header.replace(/\s+/g, '').toUpperCase().includes(h.replace(/\s+/g, '').toUpperCase()))
        );
        return found ? found.content : '';
      };

      // 1. Extract Name & Summary
      let candidateName = profileData.candidate_name || 'Candidate';
      let summaryText = profileData.executive_summary || profileData.summary || '';

      if (!summaryText || summaryText.length < 5) {
        const aboutContent = findSection(['ABOUT', 'SUMMARY', 'PROFILE']);
        if (aboutContent) {
          // If experience is leaked into about, try to split it
          const splitPoint = aboutContent.indexOf('E X P E R I E N C E');
          summaryText = splitPoint !== -1 ? aboutContent.substring(0, splitPoint).trim() : aboutContent.trim();

          // Try to pull name from first line if name is just "Candidate"
          if (candidateName === 'Candidate') {
            const firstLine = aboutContent.split('\n')[0].trim();
            if (firstLine.length > 2 && firstLine.length < 40) candidateName = firstLine;
          }
        }
      }

      // 2. Extract Skills (Direct from backend where possible)
      let skillsData = { skill: [], technicalSkill: [], otherSkill: [] };
      const skillsInput = profileData.skills || findSection(['SKILLS', 'TECHNICAL']);

      if (skillsInput) {
        if (typeof skillsInput === 'string') {
          const lowerInput = skillsInput.toLowerCase();
          if (lowerInput.includes('programming') || lowerInput.includes('technical') || lowerInput.includes('skill')) {
            const parts = skillsInput.split(/(?=Programming\s+languages:|Technical\s+skills:|Other\s+skills:|Skill\s+Section:|Technical\s+Skill\s+Section:|Other\s+Skill\s+Section:)/i);
            parts.forEach(p => {
              const clean = p.trim();
              if (clean.toLowerCase().includes('programming') || clean.toLowerCase().includes('languages')) {
                skillsData.skill.push(...clean.replace(/(Programming\s+languages:|Languages:)/i, '').split(/[,|\n•]/).map(s => s.trim()).filter(Boolean));
              } else if (clean.toLowerCase().includes('technical')) {
                skillsData.technicalSkill.push(...clean.replace(/(Technical\s+skills:|Technical\s+Skill\s+Section:)/i, '').split(/[,|\n•]/).map(s => s.trim()).filter(Boolean));
              } else {
                const finalClean = clean.replace(/(Other\s+skills:|Skill\s+Section:|Other\s+Skill\s+Section:)/i, '').trim();
                if (finalClean) skillsData.otherSkill.push(...finalClean.split(/[,|\n•]/).map(s => s.trim()).filter(Boolean));
              }
            });
          } else {
            skillsData.technicalSkill = skillsInput.split(/[,|\n•]/).map(s => s.trim()).filter(Boolean);
          }
        } else if (Array.isArray(skillsInput)) {
          skillsData.technicalSkill = skillsInput;
        }
      }

      // Simple cleanup - no aggressive removal of titles/dates
      Object.keys(skillsData).forEach(key => {
        skillsData[key] = [...new Set(skillsData[key])].map(s => s.trim()).filter(s => s.length > 1).slice(0, 30);
      });

      // 3. Extract Experience
      let experienceArray = [];
      const expData = profileData.experience || profileData.work_experience;
      if (expData && expData.length > 0 && typeof expData !== 'string') {
        experienceArray = expData;
      } else {
        // Look for EXPERIENCE in sections
        const expContent = findSection(['EXPERIENCE', 'HISTORY', 'WORK']);
        if (expContent) {
          // Rudimentary split by newlines/headers
          const lines = expContent.split('\n').filter(l => l.trim().length > 10);
          experienceArray = lines.slice(0, 3).map(line => ({
            role: line.split('-')[0]?.trim() || 'Role',
            company: line.split('-')[1]?.trim() || 'Company',
            duration: 'Refer to resume'
          }));
        }
      }

      // 4. Extract Projects
      let projectsArray = [];
      const projData = profileData.projects || profileData.projects_list;
      if (projData && projData.length > 0 && typeof projData !== 'string') {
        projectsArray = projData;
      } else {
        const projContent = findSection(['PROJECTS', 'DEVELOPMENT', 'PORTFOLIO', 'ACADEMIC', 'RESEARCH', 'ACCOMPLISHMENTS']);
        if (projContent) {
          // Try multiple split strategies: Numbers, "Project:", or just double newlines
          let blocks = projContent.split(/\n(?=\d\.)|\n(?=Project:)/).filter(b => b.trim().length > 20);

          if (blocks.length <= 1) {
            // Fallback: split by double newline if no numbered list found
            blocks = projContent.split(/\n\s*\n/).filter(b => b.trim().length > 30);
          }

          projectsArray = blocks.slice(0, 4).map(block => {
            const lines = block.trim().split('\n');
            // Clean title: remove leading numbers, bullets, or "Project:"
            let title = lines[0].replace(/^[\d\.\-\•\s]*|Project:\s*/gi, '').trim();
            if (title.length < 3) title = 'Featured Project';

            return {
              title: title,
              description: lines.slice(1).join(' ').replace(/\s+/g, ' ').substring(0, 180).trim() + (block.length > 180 ? '...' : ''),
              tech: []
            };
          });
        }
      }

      // 5. Extract Education
      let eduData = profileData.education_info || profileData.education;
      if (!eduData || (!eduData.degree && !eduData.institution)) {
        const eduContent = findSection(['EDUCATION', 'QUALIFICATIONS', 'ACADEMIC']);
        if (eduContent) {
          const lines = eduContent.split('\n').filter(l => l.trim().length > 5);
          eduData = {
            degree: lines[0]?.trim() || 'Degree',
            institution: lines[1]?.trim() || 'Institution',
            year: 'Refer to resume'
          };
        }
      }

      const displayData = {
        name: candidateName,
        summary: summaryText || 'Profile parsed from resume text sections.',
        skills: skillsData,
        experience: experienceArray,
        projects: projectsArray,
        education: eduData,
        certifications: profileData.certifications || '',
        _rawProfile: profileData,
      };

      setParseProgress(100);
      await new Promise(r => setTimeout(r, 400));
      setParsedData(displayData);
      setIsParsed(true);
    } catch (err) {
      console.error('Resume parse error:', err);
      setApiError(err.message || 'Failed to parse resume. Please try again.');
    } finally {
      setIsParsing(false);
    }
  };

  // Generate Questions via Module 2 API, then navigate to TestPortal
  const handleGenerateQuestions = async () => {
    if (!parsedData) return;
    setIsGenerating(true);
    setApiError(null);

    try {
      let numQuestions = 15;
      try {
        const testInfo = JSON.parse(localStorage.getItem('testInfo') || '{}');
        if (testInfo?.aiInterviewMapping?.noOfQuestions) {
          numQuestions = parseInt(testInfo.aiInterviewMapping.noOfQuestions) || 15;
        }
      } catch (e) {}

      // Use the raw profile data from Module 1 response
      const profilePayload = {
        ...(parsedData._rawProfile || {
          candidate_name: parsedData.name,
          skills: Array.isArray(parsedData.skills) ? parsedData.skills.join(', ') : parsedData.skills,
          projects: Array.isArray(parsedData.projects)
            ? parsedData.projects.map(p => p.title || p).join(', ')
            : (parsedData.projects || ''),
          experience: typeof parsedData.experience === 'string'
            ? parsedData.experience
            : (parsedData.experience || []).map(e => `${e.role} at ${e.company}`).join(', '),
        }),
        num_questions: numQuestions,
      };

      const result = await generateQuestions(profilePayload);
      setGeneratedQuestions(result.questions);
      setSessionId(result.session_id);
    } catch (err) {
      console.error('Question generation error:', err);
      setApiError(err.message || 'Failed to generate questions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartInterview = () => {
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.warn("Fullscreen request failed:", err);
        });
      }
    } catch (err) {
      console.warn("Fullscreen error:", err);
    }
    navigate('/interview/test-portal', {
      state: {
        parsedData: parsedData,
        questions: generatedQuestions,
        sessionId: sessionId,
        uniqueId,
      }
    });
  };

  const getFileIcon = (file) => {
    if (file.type === 'application/pdf') return '📄';
    if (file.type?.includes('word')) return '📝';
    return '📃';
  };

  return (
    <div className="min-h-screen bg-brand-light font-sans">
      <ScreenProctor />

      {/* Header */}
      <div className="max-w-6xl mx-auto px-6 pt-10 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-[2.5rem] font-black text-brand-dark mb-2 tracking-tight">
            Upload Resume
          </h1>
          <p className="text-gray-500 text-lg max-w-[600px] leading-relaxed">
            Our AI Module will handle the heavy lifting. Upload your resume and let us map their skills to the job description instantly.
          </p>
        </motion.div>
      </div>

      {/* Upload Section */}
      <div className="max-w-6xl mx-auto px-6 mb-8 text-center sm:text-left">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)]"
        >
          <div className={`grid ${files.length > 0 ? 'grid-cols-1 lg:grid-cols-[1fr,320px]' : 'grid-cols-1'} gap-6 items-start`}>
            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-[1.25rem] py-12 px-8 text-center cursor-pointer transition-all duration-300 min-h-[260px] flex flex-col items-center justify-center ${isDragging ? 'border-brand-dark bg-green-50' : 'border-gray-300 bg-gray-50/50'
                }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#e6f4f1] to-[#d1ebe6] flex items-center justify-center mb-5">
                <FiUploadCloud className="text-[1.75rem] text-brand-dark" />
              </div>
              <p className="font-extrabold text-xl text-gray-800 mb-2">
                Drop resumes here
              </p>
              <p className="text-gray-400 text-sm mb-5">
                Supports PDF, DOCX, and TXT files up to 25MB each.
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="px-7 py-2.5 rounded-full border-2 border-brand-dark bg-white text-brand-dark font-bold text-sm cursor-pointer transition-all hover:bg-brand-dark hover:text-white"
              >
                Select Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* File Queue */}
            {files.length > 0 && (
              <div className="bg-gray-50/50 rounded-[1.25rem] p-5 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-extrabold text-gray-800 text-base">
                    Queue ({files.length})
                  </h3>
                  <span className="text-[0.7rem] font-bold text-green-600 uppercase tracking-widest bg-green-50 px-3 py-1 rounded-full">
                    Ready
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <AnimatePresence>
                    {files.map((file, idx) => (
                      <motion.div
                        key={file.name + idx}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100"
                      >
                        <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center text-lg flex-shrink-0">
                          {getFileIcon(file)}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="font-bold text-sm text-gray-800 truncate">
                            {file.name}
                          </p>
                          <p className="text-[0.7rem] text-gray-400">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFile(idx)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <FiX />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Parse Button */}
                <button
                  onClick={handleParse}
                  disabled={isParsing || isParsed}
                  className={`w-full mt-4 py-3.5 rounded-xl border-none text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2 ${isParsed ? 'bg-green-600' : 'bg-brand-dark'
                    } ${isParsing ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}
                >
                  {isParsed ? (
                    <>Parsed <FiCheckCircle /></>
                  ) : isParsing ? (
                    <>Processing... <FiLoader className="animate-spin" /></>
                  ) : (
                    <>Parse Resume <FiZap /></>
                  )}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Processing Section */}
      <AnimatePresence>
        {(isParsing || isParsed) && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-6xl mx-auto px-6 mb-8"
          >
            <div className="bg-white rounded-[1.5rem] border border-gray-100 p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
              {/* AI Status Header */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border-[3px] border-brand-dark flex items-center justify-center relative flex-shrink-0">
                    <span className="font-black text-[0.7rem] text-brand-dark">
                      {Math.round(parseProgress)}%
                    </span>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-gray-800">
                      AI Concierge is Analyzing
                    </h3>
                    <p className="text-sm text-gray-500">
                      Processing {files.length} document{files.length > 1 ? 's' : ''} with High Precision engine.
                    </p>
                  </div>
                </div>
                <span className={`text-[0.7rem] font-extrabold uppercase tracking-widest px-4 py-1.5 rounded-full flex items-center gap-1.5 ${isParsed ? 'text-green-600 bg-green-50' : 'text-yellow-600 bg-yellow-50'
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isParsed ? 'bg-green-600' : 'bg-yellow-600 animate-pulse'
                    }`} />
                  {isParsed ? 'Complete' : 'Processing...'}
                </span>
              </div>

              {/* Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {PARSE_STEPS.map((step, i) => (
                  <div
                    key={step.key}
                    className={`p-5 rounded-2xl border transition-all duration-500 ${parseStep >= i
                      ? (parseStep > i || isParsed ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200')
                      : 'bg-gray-50/50 border-gray-100'
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {parseStep > i || isParsed ? (
                        <FiCheckCircle className="text-green-600 text-base" />
                      ) : parseStep === i && !isParsed ? (
                        <FiLoader className="text-blue-600 text-base animate-spin" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                      )}
                      <span className="text-[0.7rem] font-bold text-gray-400 uppercase tracking-wider">
                        Step {i + 1}
                      </span>
                    </div>
                    <p className={`font-extrabold text-sm ${parseStep >= i ? 'text-gray-800' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                <motion.div
                  animate={{ width: `${parseProgress}%` }}
                  transition={{ duration: 0.3 }}
                  className="h-full bg-gradient-to-r from-brand-dark via-green-700 to-green-500 rounded-full"
                />
              </div>

              {/* Progress Labels */}
              <div className="flex justify-between items-center px-1">
                {['Initialization', 'Synthesis', 'Output Generation'].map((label) => (
                  <span key={label} className="text-[0.65rem] font-bold text-gray-400 uppercase tracking-[0.08em]">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Parsed Results */}
      <AnimatePresence>
        {isParsed && parsedData && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-6xl mx-auto px-6 pb-12"
          >
            <div className="bg-white rounded-[1.5rem] border border-gray-100 overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
              {/* Profile Header */}
              <div className="p-8 md:p-10 border-b border-gray-50">
                <p className="text-[0.7rem] font-extrabold text-green-600 uppercase tracking-[0.15em] mb-3 text-center sm:text-left">
                  Candidate Analysis Profile
                </p>
                <h2 className="text-3xl md:text-[2.25rem] font-black text-brand-dark mb-4 tracking-tight text-center sm:text-left leading-tight">
                  {parsedData.name}
                </h2>
                <p className="text-gray-500 text-lg leading-relaxed max-w-[550px] text-center sm:text-left mx-auto sm:mx-0">
                  {parsedData.summary}
                </p>
              </div>

              {/* Skills Section */}
              <div className="p-8 md:p-10 border-b border-gray-50">
                <h3 className="font-extrabold text-xl text-gray-800 mb-6 flex items-center justify-center sm:justify-start gap-2">
                  <FiCode className="text-brand-dark" /> Skills Overview
                </h3>
                <div className="flex flex-col gap-6">
                  {Object.entries(parsedData.skills).map(([category, list]) => (
                    list.length > 0 && (
                      <div key={category}>
                        <p className="text-[0.65rem] font-extrabold text-brand-dark/40 uppercase tracking-[0.2em] mb-4">
                          {category.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                          {list.map((skill, i) => (
                            <motion.span
                              key={skill + i}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.05 }}
                              className="px-4 py-2 rounded-full border-1.5 border-gray-300 bg-white font-semibold text-sm text-gray-700 transition-all hover:bg-brand-dark hover:text-white hover:border-brand-dark cursor-default"
                            >
                              {skill}
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Projects Section */}
              {parsedData.projects && parsedData.projects.length > 0 && (
                <div className="p-8 md:p-10 border-b border-gray-50">
                  <h3 className="font-extrabold text-xl text-gray-800 mb-7 flex items-center justify-center sm:justify-start gap-2">
                    <FiGlobe className="text-brand-dark" /> Key Project Portfolio
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {parsedData.projects.map((project, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="rounded-2xl border border-gray-200 overflow-hidden bg-white transition-all duration-300 hover:shadow-[0_8px_30_rgba(20,69,66,0.1)] hover:-translate-y-1 group"
                      >
                        <div className={`h-32 bg-gradient-to-br flex items-center justify-center relative overflow-hidden ${i % 3 === 0 ? 'from-[#0f2027] via-[#203a43] to-[#2c5364]' :
                          i % 3 === 1 ? 'from-[#134e5e] to-[#71b280]' :
                            'from-[#1a2a6c] via-[#b21f1f] to-[#fdbb2d]'
                          }`}>
                          <div className="absolute inset-0 bg-radial-at-tl from-white/10 to-transparent" />
                          <div className="transform transition-transform duration-500 group-hover:scale-110">
                            {i % 3 === 0 ? <FiCpu className="text-4xl text-white/70" /> :
                              i % 3 === 1 ? <FiGlobe className="text-4xl text-white/70" /> :
                                <FiDatabase className="text-4xl text-white/70" />}
                          </div>
                        </div>
                        <div className="p-5">
                          <h4 className="font-extrabold text-lg text-gray-800 mb-2 truncate">
                            {project.title}
                          </h4>
                          <p className="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-3">
                            {project.description}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-auto">
                            {project.tech && project.tech.map(t => (
                              <span key={t} className="px-2.5 py-1 bg-gray-100 rounded text-[0.65rem] font-extrabold text-gray-600 uppercase tracking-widest border border-gray-200/50">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience Section */}
              {parsedData.experience && parsedData.experience.length > 0 && (
                <div className="p-8 md:p-10 border-b border-gray-50">
                  <h3 className="font-extrabold text-xl text-gray-800 mb-6 flex items-center justify-center sm:justify-start gap-2">
                    <FiTrendingUp className="text-brand-dark" /> Experience
                  </h3>
                  <div className="flex flex-col gap-3">
                    {parsedData.experience.map((exp, i) => (
                      <div key={i} className="flex flex-col sm:flex-row items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100 gap-4">
                        <div className="text-center sm:text-left">
                          <p className="font-extrabold text-base text-gray-800 mb-0.5">
                            {exp.role}
                          </p>
                          <p className="text-sm text-gray-500">
                            {exp.company}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider backdrop-blur-sm px-3 py-1 bg-white/50 rounded-full border border-gray-100">
                          {exp.duration}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education Section */}
              {parsedData.education && (
                <div className="p-8 md:p-10 border-b border-gray-50">
                  <h3 className="font-extrabold text-xl text-gray-800 mb-6 flex items-center justify-center sm:justify-start gap-2">
                    <FiStar className="text-secondary" /> Education
                  </h3>
                  <div className="p-6 bg-gray-50/50 rounded-xl border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-center sm:text-left">
                      <p className="font-extrabold text-lg text-gray-800 mb-0.5">
                        {parsedData.education.degree || 'Degree'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {parsedData.education.institution || 'Institution'} • {parsedData.education.year || 'N/A'}
                      </p>
                    </div>
                    {parsedData.education.gpa && (
                      <div className="px-5 py-2.5 bg-brand-dark text-white rounded-xl font-black text-sm shadow-lg shadow-brand-dark/20">
                        GPA: {parsedData.education.gpa}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Certifications Section */}
              {parsedData.certifications && parsedData.certifications.length > 2 && (
                <div className="p-8 md:p-10 border-b border-gray-50">
                  <h3 className="font-extrabold text-xl text-gray-800 mb-6 flex items-center justify-center sm:justify-start gap-2">
                    <FiZap className="text-brand-dark" /> Certifications
                  </h3>
                  <div className="p-5 bg-brand-light/30 rounded-2xl border border-brand-dark/5">
                    <p className="text-sm font-bold text-brand-dark/80 leading-relaxed italic">
                      {parsedData.certifications}
                    </p>
                  </div>
                </div>
              )}

              {/* Generate Questions Button */}
              <div className="p-8 md:p-10">
                {apiError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700">
                    <FiAlertCircle className="mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-semibold">{apiError}</span>
                  </div>
                )}
                {generatedQuestions ? (
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStartInterview}
                    className="w-full py-5 rounded-2xl border-none bg-gradient-to-r from-[#144542] to-brand-dark text-white font-extrabold text-lg flex items-center justify-center gap-3 shadow-[0_8px_30px_rgba(20,69,66,0.25)] tracking-tight cursor-pointer"
                  >
                    Start Assessment <FiArrowRight className="text-2xl" />
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleGenerateQuestions}
                    disabled={isGenerating}
                    className={`w-full py-5 rounded-2xl border-none bg-gradient-to-r from-brand-dark to-emerald-900 text-white font-extrabold text-lg flex items-center justify-center gap-3 shadow-[0_8px_30px_rgba(20,69,66,0.25)] tracking-tight ${isGenerating ? 'opacity-70 cursor-wait' : 'cursor-pointer'}`}
                  >
                    {isGenerating ? (
                      <>Generating Questions... <FiLoader className="text-2xl animate-spin" /></>
                    ) : (
                      <>Generate Interview Questions <FiArrowRight className="text-2xl" /></>
                    )}
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
