import React, { useState, useRef, useEffect } from "react";
import { 
  FiClock, FiPlus, FiX, FiCalendar, FiUsers, FiCheckCircle, 
  FiAlertCircle, FiLoader, FiMessageSquare, FiCode, FiActivity,
  FiUser, FiHash, FiTrendingUp, FiCheck, FiLayers, FiInfo, FiSearch
} from "react-icons/fi";

const modules = [
  { name: "AI-interview", cost: 50, time: 20, icon: FiActivity, bgClass: "bg-[#e5f5f6]", textClass: "text-[#1d8989]", key: "interviewModule" },
  { name: "Communication", cost: 50, time: 30, icon: FiMessageSquare, bgClass: "bg-[#e9daff]", textClass: "text-[#6b4ab9]", key: "verbalModule" },
  { name: "Coding Challenge", cost: 50, time: 60, icon: FiCode, bgClass: "bg-[#fdf0d9]", textClass: "text-[#db830f]", key: "codingModule" },
  { name: "Aptitude", cost: 50, time: 30, icon: FiTrendingUp, bgClass: "bg-[#fcdcb6]", textClass: "text-[#c26804]", key: "aptitudeModule" },
];

export const APTITUDE_CATEGORIES = [
  {
    id: "Quantitative Aptitude",
    name: "Quantitative Aptitude",
    description: "Arithmetic, algebra, percentages & mathematical logic",
    subtopics: [
      { key: "Topic_16_Averages", name: "Averages", count: 100 },
      { key: "13_Percentages", name: "Percentages", count: 100 },
      { key: "Topic_15_Profit_Loss_Discounts", name: "Profit, Loss & Discounts", count: 100 },
      { key: "Topic_14_Ratio_Proportion", name: "Ratio & Proportion", count: 89 },
      { key: "Topic_17_Time_and_Work_Pipes_Cisterns", name: "Time, Work, Pipes & Cisterns", count: 100 },
      { key: "11_Number_System", name: "Number System", count: 100 },
      { key: "12_HCF_LCM", name: "HCF & LCM", count: 100 },
      { key: "03_Probability", name: "Probability", count: 95 },
      { key: "04_Permutation_Combination", name: "Permutation & Combination", count: 100 },
    ]
  },
  {
    id: "Logical Reasoning",
    name: "Logical Reasoning",
    description: "Deductive reasoning, puzzles, patterns & relations",
    subtopics: [
      { key: "Topic_04_Blood_Relations", name: "Blood Relations", count: 100 },
      { key: "Topic_02_Coding_Decoding", name: "Coding & Decoding", count: 100 },
      { key: "Topic_01_Direction_Sense", name: "Direction Sense", count: 100 },
      { key: "Topic_03_Number_Series", name: "Number Series", count: 100 },
      { key: "Topic_05_Order_Ranking", name: "Order & Ranking", count: 100 },
      { key: "Topic_06_Syllogism", name: "Syllogism", count: 100 },
      { key: "Topic_08_Inequalities", name: "Inequalities", count: 100 },
      { key: "10_Logical_Puzzles", name: "Logical Puzzles", count: 93 },
      { key: "Q30_Calendar_Clock", name: "Calendar & Clock", count: 100 },
      { key: "Q28_Cube_Dice_Problems", name: "Cube & Dice Problems", count: 100 },
      { key: "Q27_Paper_Folding_Cutting", name: "Paper Folding & Cutting", count: 100 },
      { key: "Q29_Embedded_Figures", name: "Embedded Figures", count: 100 },
      { key: "Q25_Missing_Figure_Image_Completion", name: "Missing Figure & Completion", count: 100 },
      { key: "Q26_Figure_Series_Pattern_Shapes", name: "Figure Series & Shapes", count: 100 },
      { key: "topic22_mirror_image", name: "Mirror Image", count: 100 },
      { key: "topic23_water_image", name: "Water Image", count: 100 },
      { key: "topic24_shadow_light", name: "Shadow & Light", count: 103 },
    ]
  },
  {
    id: "Data Interpretation",
    name: "Data Interpretation",
    description: "Tables, charts, graphs analysis and data sufficiency",
    subtopics: [
      { key: "02_Data_Interpretation", name: "Data Interpretation (Tables & Graphs)", count: 100 },
      { key: "09_Data_Sufficiency", name: "Data Sufficiency", count: 100 },
    ]
  },
  {
    id: "Verbal Ability",
    name: "Verbal Ability",
    description: "Verbal reasoning, reading comprehension & grammar",
    subtopics: [
      { key: "sandy.md", name: "Verbal Reasoning & Comprehension", count: 100 },
      { key: "Q31_TSP", name: "Java MCQs & TSP", count: 30 },
    ]
  },
  {
    id: "Mixed Assessment",
    name: "Mixed Assessment",
    description: "Multi-category blend or all subjects combined",
    subtopics: []
  }
];

export default function CreateTest({ onCancel }) {
  const [selectedModules, setSelectedModules] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Form State
  const [formData, setFormData] = useState({
    testId: "",
    testName: "",
    hrId: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    approxStudentCount: "",
    aptitudeCategories: ["Quantitative Aptitude"],
    aptitudeSubtopics: [
      "Topic_16_Averages",
      "13_Percentages",
      "Topic_15_Profit_Loss_Discounts",
      "Topic_14_Ratio_Proportion",
      "Topic_17_Time_and_Work_Pipes_Cisterns",
      "11_Number_System",
      "12_HCF_LCM",
      "03_Probability",
      "04_Permutation_Combination"
    ],
    selectedCodingQuestions: [],
    codingSelectionMode: "fixed",
    // New flexible random config: a single pool drawn from selected questions,
    // a total pick per candidate, and a per-difficulty distribution.
    codingRandomConfig: { totalPick: 3, distribution: { easy: 1, medium: 1, hard: 1 } },
    interviewQuestionCount: 15
  });
  const [hrList, setHrList] = useState([]);

  // Coding Questions State
  const [codingQuestionsList, setCodingQuestionsList] = useState([]);
  const [isCodingQuestionsLoading, setIsCodingQuestionsLoading] = useState(false);
  const [codingDifficultyTab, setCodingDifficultyTab] = useState("All");
  const [codingSearchQuery, setCodingSearchQuery] = useState("");

  const [testIdStatus, setTestIdStatus] = useState("idle"); // idle, checking, available, taken
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Real-time Test ID check
  useEffect(() => {
    if (!formData.testId) {
      setTestIdStatus("idle");
      return;
    }

    setTestIdStatus("checking");

    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem("companyToken");
        const response = await fetch(`/api/company/test/exists/${encodeURIComponent(formData.testId)}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setTestIdStatus(data.registered ? "taken" : "available");
        } else {
          console.warn("Test ID check endpoint failed, defaulting to available");
          setTestIdStatus("available");
        }
      } catch (error) {
        console.error("Error checking test ID:", error);
        setTestIdStatus("available");
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [formData.testId]);

  // Fetch HR List
  useEffect(() => {
    const fetchHRs = async () => {
      try {
        const token = localStorage.getItem("companyToken");
        const response = await fetch("/api/company/hr/list", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setHrList(data);
          if (data.length > 0) {
            setFormData(prev => ({ ...prev, hrId: data[0].hrId }));
          }
        }
      } catch (error) {
        console.error("Error fetching HRs:", error);
      }
    };
    fetchHRs();
  }, []);

  // Fetch Coding Questions
  useEffect(() => {
    const fetchCodingQuestions = async () => {
      setIsCodingQuestionsLoading(true);
      try {
        const response = await fetch("/api/coding/question/");
        if (response.ok) {
          const resJson = await response.json();
          const list = resJson.data || [];
          setCodingQuestionsList(list);
        }
      } catch (err) {
        console.error("Failed to load coding questions:", err);
      } finally {
        setIsCodingQuestionsLoading(false);
      }
    };
    fetchCodingQuestions();
  }, []);

  const totalCredits = selectedModules.reduce((sum, mod) => sum + mod.cost, 0);
  const totalTime = selectedModules.reduce((sum, mod) => sum + mod.time, 0);

  const availableModules = modules.filter(m => !selectedModules.some(sm => sm.key === m.key));

  const addModule = (mod) => {
    setSelectedModules([...selectedModules, mod]);
    setIsDropdownOpen(false);
  };

  const removeModule = (modKey) => {
    setSelectedModules(selectedModules.filter(m => m.key !== modKey));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleCategory = (categoryName) => {
    if (categoryName === "Mixed Assessment") {
      const allStandardCats = APTITUDE_CATEGORIES.filter(c => c.id !== "Mixed Assessment").map(c => c.id);
      const isAllSelected = allStandardCats.every(id => formData.aptitudeCategories.includes(id));

      if (isAllSelected) {
        // Deselect all
        setFormData(prev => ({
          ...prev,
          aptitudeCategories: [],
          aptitudeSubtopics: []
        }));
      } else {
        // Select all categories and all subtopics
        const allSub = APTITUDE_CATEGORIES.flatMap(c => c.subtopics.map(s => s.key));
        setFormData(prev => ({
          ...prev,
          aptitudeCategories: allStandardCats,
          aptitudeSubtopics: allSub
        }));
      }
      return;
    }

    const cat = APTITUDE_CATEGORIES.find(c => c.id === categoryName);
    if (!cat) return;

    const isSelected = formData.aptitudeCategories.includes(categoryName);
    const catSubKeys = cat.subtopics.map(s => s.key);

    if (isSelected) {
      // Remove this category and its subtopics
      setFormData(prev => ({
        ...prev,
        aptitudeCategories: prev.aptitudeCategories.filter(c => c !== categoryName),
        aptitudeSubtopics: prev.aptitudeSubtopics.filter(k => !catSubKeys.includes(k))
      }));
    } else {
      // Add this category and pre-select its subtopics
      setFormData(prev => ({
        ...prev,
        aptitudeCategories: [...prev.aptitudeCategories, categoryName],
        aptitudeSubtopics: Array.from(new Set([...prev.aptitudeSubtopics, ...catSubKeys]))
      }));
    }
  };

  const toggleSubtopic = (subtopicKey) => {
    setFormData(prev => {
      const exists = prev.aptitudeSubtopics.includes(subtopicKey);
      let updated;
      if (exists) {
        updated = prev.aptitudeSubtopics.filter(k => k !== subtopicKey);
      } else {
        updated = [...prev.aptitudeSubtopics, subtopicKey];
      }
      return { ...prev, aptitudeSubtopics: updated };
    });
  };

  const selectAllSubtopics = (categoryName = null) => {
    if (categoryName) {
      const cat = APTITUDE_CATEGORIES.find(c => c.id === categoryName);
      if (cat) {
        const catKeys = cat.subtopics.map(s => s.key);
        setFormData(prev => ({
          ...prev,
          aptitudeSubtopics: Array.from(new Set([...prev.aptitudeSubtopics, ...catKeys]))
        }));
      }
    } else {
      // Select all subtopics for all currently active categories
      const activeCats = APTITUDE_CATEGORIES.filter(c => formData.aptitudeCategories.includes(c.id));
      const activeSubKeys = activeCats.flatMap(c => c.subtopics.map(s => s.key));
      setFormData(prev => ({
        ...prev,
        aptitudeSubtopics: activeSubKeys
      }));
    }
  };

  const clearSubtopics = (categoryName = null) => {
    if (categoryName) {
      const cat = APTITUDE_CATEGORIES.find(c => c.id === categoryName);
      if (cat) {
        const catKeys = new Set(cat.subtopics.map(s => s.key));
        setFormData(prev => ({
          ...prev,
          aptitudeSubtopics: prev.aptitudeSubtopics.filter(k => !catKeys.has(k))
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        aptitudeSubtopics: []
      }));
    }
  };

  // ── Coding Question Selection Handlers ─────────────────────────────────────
  const toggleCodingQuestion = (questionId) => {
    setFormData(prev => {
      const current = prev.selectedCodingQuestions || [];
      const exists = current.includes(questionId);
      const updated = exists ? current.filter(id => id !== questionId) : [...current, questionId];
      return { ...prev, selectedCodingQuestions: updated };
    });
  };

  const selectAllCodingQuestions = (filterDiff = null) => {
    let targets = codingQuestionsList;
    if (filterDiff && filterDiff !== "All") {
      targets = targets.filter(q => q.difficulty?.toLowerCase() === filterDiff.toLowerCase());
    }
    const targetIds = targets.map(q => q.id);
    setFormData(prev => ({
      ...prev,
      selectedCodingQuestions: Array.from(new Set([...(prev.selectedCodingQuestions || []), ...targetIds]))
    }));
  };

  const clearCodingQuestions = (filterDiff = null) => {
    if (filterDiff && filterDiff !== "All") {
      const diffIds = new Set(
        codingQuestionsList
          .filter(q => q.difficulty?.toLowerCase() === filterDiff.toLowerCase())
          .map(q => q.id)
      );
      setFormData(prev => ({
        ...prev,
        selectedCodingQuestions: (prev.selectedCodingQuestions || []).filter(id => !diffIds.has(id))
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        selectedCodingQuestions: []
      }));
    }
  };

  const codingPoolByDifficulty = {
    easy: codingQuestionsList.filter(q => (q.difficulty || '').toLowerCase() === 'easy' && formData.selectedCodingQuestions?.includes(q.id)),
    medium: codingQuestionsList.filter(q => (q.difficulty || '').toLowerCase() === 'medium' && formData.selectedCodingQuestions?.includes(q.id)),
    hard: codingQuestionsList.filter(q => (q.difficulty || '').toLowerCase() === 'hard' && formData.selectedCodingQuestions?.includes(q.id)),
  };

  const allQuestionsByDifficulty = {
    easy: codingQuestionsList.filter(q => (q.difficulty || '').toLowerCase() === 'easy'),
    medium: codingQuestionsList.filter(q => (q.difficulty || '').toLowerCase() === 'medium'),
    hard: codingQuestionsList.filter(q => (q.difficulty || '').toLowerCase() === 'hard'),
  };

  // ── Random mode helpers ────────────────────────────────────────────────

  // Update a single difficulty's distribution count, clamped to its pool size.
  const setDistributionCount = (difficulty, count) => {
    const poolSize = codingPoolByDifficulty[difficulty]?.length || 0;
    const maxAllowed = poolSize > 0 ? poolSize : (allQuestionsByDifficulty[difficulty]?.length || 50);
    const clamped = Math.max(0, Math.min(count, maxAllowed));
    setFormData(prev => {
      const prevDist = prev.codingRandomConfig?.distribution || { easy: 0, medium: 0, hard: 0 };
      const newDist = { ...prevDist, [difficulty]: clamped };
      const newTotal = newDist.easy + newDist.medium + newDist.hard;
      return {
        ...prev,
        codingRandomConfig: {
          ...prev.codingRandomConfig,
          distribution: newDist,
          totalPick: newTotal,
        }
      };
    });
  };

  // Derived shorthand for readability in the render.
  const rDist = formData.codingRandomConfig?.distribution || { easy: 1, medium: 1, hard: 1 };
  const rTotalPick = formData.codingRandomConfig?.totalPick || (rDist.easy + rDist.medium + rDist.hard);

  const handleCreateTest = async () => {
    if (testIdStatus === "taken") {
      setSubmissionStatus({ type: "error", message: "Please enter a unique Test ID" });
      return;
    }

    const isMissingFields = !formData.testId || 
                            !formData.startDate || 
                            !formData.endDate || 
                            !formData.startTime || 
                            !formData.endTime || 
                            !formData.approxStudentCount ||
                            parseInt(formData.approxStudentCount) <= 0;

    if (isMissingFields) {
      setSubmissionStatus({ type: "error", message: "Please fill all required fields, including dates, times, and student count." });
      return;
    }

    if (selectedModules.length === 0) {
      setSubmissionStatus({ type: "error", message: "Please add at least one module to the test." });
      return;
    }

    const hasAptitude = selectedModules.some(m => m.key === "aptitudeModule");
    const hasCoding = selectedModules.some(m => m.key === "codingModule");
    if (hasAptitude && (!formData.aptitudeSubtopics || formData.aptitudeSubtopics.length === 0)) {
      setSubmissionStatus({ type: "error", message: "Please select at least one subtopic for the Aptitude module." });
      return;
    }

    if (hasCoding && formData.codingSelectionMode === 'random') {
      const dist = formData.codingRandomConfig?.distribution || { easy: 0, medium: 0, hard: 0 };
      const totalPick = (dist.easy || 0) + (dist.medium || 0) + (dist.hard || 0);

      if (totalPick <= 0) {
        setSubmissionStatus({ type: "error", message: "Please configure at least 1 question to be assigned per candidate in random mode." });
        return;
      }

      // Validate that each difficulty's pick count does not exceed its available pool.
      const poolSizes = {
        easy:   codingPoolByDifficulty.easy.length   || allQuestionsByDifficulty.easy.length,
        medium: codingPoolByDifficulty.medium.length || allQuestionsByDifficulty.medium.length,
        hard:   codingPoolByDifficulty.hard.length   || allQuestionsByDifficulty.hard.length,
      };

      for (const diff of ['easy', 'medium', 'hard']) {
        const pickN = dist[diff] || 0;
        if (pickN > 0 && poolSizes[diff] < pickN) {
          setSubmissionStatus({
            type: "error",
            message: `Cannot assign ${pickN} ${diff.charAt(0).toUpperCase() + diff.slice(1)} questions — only ${poolSizes[diff]} available in the pool.`
          });
          return;
        }
      }
    }

    setIsSubmitting(true);
    setSubmissionStatus({ type: "", message: "" });

    const hrId = formData.hrId || localStorage.getItem("hrId") || localStorage.getItem("companyId");

    const moduleFlags = {
      aptitudeModule: selectedModules.some(m => m.key === "aptitudeModule"),
      verbalModule: selectedModules.some(m => m.key === "verbalModule"),
      interviewModule: selectedModules.some(m => m.key === "interviewModule"),
      codingModule: hasCoding,
    };

    const payload = {
      testId: formData.testId,
      testName: formData.testName,
      hrId: hrId,
      ...moduleFlags,
      aptitudeTopic: JSON.stringify(formData.aptitudeSubtopics),
      aptitudeTopics: formData.aptitudeSubtopics,
      // The flat pool always contains the full admin selection (used by fixed mode AND as the
      // backing store for random mode — unchanged from the existing contract).
      codingProblemCodes: hasCoding ? (
        formData.codingSelectionMode === "random" && (!formData.selectedCodingQuestions || formData.selectedCodingQuestions.length === 0)
          ? codingQuestionsList.map(q => q.id)
          : (formData.selectedCodingQuestions || [])
      ) : [],
      codingSelectionMode: hasCoding ? formData.codingSelectionMode : "fixed",
      // New flexible random config schema:
      //   pool        — flat array of all selected question IDs (same as codingProblemCodes)
      //   totalPick   — total questions every candidate receives
      //   distribution — { easy, medium, hard } — how many to pick per difficulty from the pool
      codingRandomConfig: (hasCoding && formData.codingSelectionMode === "random") ? {
        pool: (!formData.selectedCodingQuestions || formData.selectedCodingQuestions.length === 0)
          ? codingQuestionsList.map(q => q.id)
          : (formData.selectedCodingQuestions || []),
        totalPick:   (rDist.easy + rDist.medium + rDist.hard),
        distribution: {
          easy:   rDist.easy   || 0,
          medium: rDist.medium || 0,
          hard:   rDist.hard   || 0,
        }
      } : null,
      interviewQuestionCount: parseInt(formData.interviewQuestionCount) || 15,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString(),
      startTime: formData.startTime ? formData.startTime + ":00" : "00:00:00",
      endTime: formData.endTime ? formData.endTime + ":00" : "00:00:00",
      approxStudentCount: parseInt(formData.approxStudentCount) || 0
    };

    try {
      const token = localStorage.getItem("companyToken");
      const response = await fetch("/api/company/test/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSubmissionStatus({ type: "success", message: "Test created successfully! Redirecting..." });
        setTimeout(() => window.location.href = "/company/dashboard", 1500);
      } else {
        const errorData = await response.json();
        setSubmissionStatus({ type: "error", message: errorData.message || "Failed to create test" });
      }
    } catch (error) {
      setSubmissionStatus({ type: "error", message: "Network error. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white custom-scrollbar rounded-xl flex justify-center py-12 px-6">
      <div className="w-full max-w-[850px]">
        
        {/* Header Section */}
        <div className="mb-10">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Configure New Test</h1>
          <p className="text-gray-500 mt-2 font-medium">Design your assessment by selecting modules and scheduling details.</p>
        </div>

        {/* Assessment Modules Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[17px] font-bold text-gray-900">Assessment Modules</h2>
              <p className="text-sm text-gray-500 mt-0.5">Select the skills you want to evaluate</p>
            </div>
            
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                disabled={availableModules.length === 0}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <FiPlus size={16} /> Add Module
              </button>

              {isDropdownOpen && availableModules.length > 0 && (
                <div className="absolute top-full right-0 mt-2 w-[240px] bg-white border border-gray-100 shadow-xl rounded-xl p-2 z-50 flex flex-col gap-1">
                  {availableModules.map((mod) => (
                    <button
                      key={mod.key}
                      onClick={() => addModule(mod)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 text-left transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <mod.icon size={14} className="text-gray-500" />
                        <span className="font-bold text-sm text-gray-800">{mod.name}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-400">+{mod.time}m</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Module Grid */}
          {selectedModules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedModules.map((mod) => (
                <div key={mod.key} className="relative border border-[#e5e7eb] rounded-xl p-5 bg-white shadow-sm flex flex-col">
                  <button 
                    onClick={() => removeModule(mod.key)}
                    className="absolute top-4 right-4 text-gray-300 hover:text-gray-600 transition-colors"
                  >
                    <FiX size={16} />
                  </button>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${mod.bgClass}`}>
                    <mod.icon size={18} className={mod.textClass} />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-4">{mod.name}</h3>
                  <div className="flex items-center gap-6 mt-auto">
                    <div className="flex items-center gap-2 text-gray-500">
                      <img src="/Point.svg" className="w-4 h-4 opacity-60 grayscale" alt="credits" />
                      <span className="text-xs font-bold">{mod.cost} Credits</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                      <FiClock size={14} className="opacity-70" />
                      <span className="text-xs font-bold">{mod.time} min</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3 text-gray-400">
                <FiPlus size={24} />
              </div>
              <p className="text-sm font-bold text-gray-700">No modules selected</p>
              <p className="text-xs text-gray-500 mt-1">Click 'Add Module' to build your assessment.</p>
            </div>
          )}

          {/* Totals Summary */}
          <div className="mt-6 flex bg-[#fafafa] rounded-xl p-6 border border-gray-100">
            <div className="flex-1 flex flex-col justify-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Duration</span>
              <div className="flex items-center gap-2 text-[#144542]">
                <FiClock size={16} strokeWidth={2.5} />
                <span className="text-xl font-black">{totalTime > 0 ? `${totalTime} min` : "0 min"}</span>
              </div>
            </div>
            <div className="w-px bg-gray-200 mx-6"></div>
            <div className="flex-1 flex flex-col justify-center items-end text-right">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Credits</span>
              <div className="flex items-center gap-2 text-[#144542]">
                <img src="/Point.svg" className="w-5 h-5 object-contain" alt="credits" style={{ filter: "brightness(0) saturate(100%) invert(20%) sepia(16%) saturate(2371%) hue-rotate(124deg) brightness(97%) contrast(93%)" }} />
                <span className="text-xl font-black">{totalCredits > 0 ? totalCredits : "0"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Logistics & Scheduling */}
        <div className="mb-10">
          <div className="mb-6">
            <h2 className="text-[17px] font-bold text-gray-900">Logistics & Scheduling</h2>
            <p className="text-sm text-gray-500 mt-0.5">Assign responsibility and set the timeline</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Test ID */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Test ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <FiHash size={15} />
                </div>
                <input 
                  type="text" 
                  name="testId"
                  value={formData.testId}
                  onChange={handleInputChange}
                  placeholder="e.g. SUMMER-2026" 
                  className={`w-full pl-10 pr-10 py-3.5 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 font-medium placeholder:text-gray-400 focus:ring-2 transition-all ${
                    testIdStatus === "taken" ? "ring-2 ring-red-400 bg-red-50/50" : 
                    testIdStatus === "available" ? "ring-2 ring-green-400 bg-green-50/50" : 
                    "focus:ring-[#144542]"
                  }`}
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                  {testIdStatus === "checking" && <FiLoader className="animate-spin text-gray-400" />}
                  {testIdStatus === "available" && <FiCheckCircle className="text-green-500" />}
                  {testIdStatus === "taken" && <FiAlertCircle className="text-red-500" />}
                </div>
              </div>
              {testIdStatus === "taken" && <p className="text-red-500 text-[10px] font-bold mt-1.5 ml-1">Test ID already exists.</p>}
            </div>

            {/* Test Name */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Test Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <FiHash size={15} />
                </div>
                <input 
                  type="text" 
                  name="testName"
                  value={formData.testName}
                  onChange={handleInputChange}
                  placeholder="e.g. Software Engineer Intern" 
                  className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 font-medium placeholder:text-gray-400 focus:ring-2 focus:ring-[#144542] transition-all"
                />
              </div>
            </div>

            {/* Aptitude Module Topic & Subtopics Configuration (Conditional) */}
            {selectedModules.some(m => m.key === "aptitudeModule") && (
              <div className="col-span-1 md:col-span-2 bg-white border border-gray-300 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[#fcdcb6]/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#fcdcb6] text-[#c26804] flex items-center justify-center font-bold text-sm">
                      <FiTrendingUp size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900">Aptitude Topic & Subtopic Selection</h3>
                      <p className="text-xs text-gray-500">Pick specific subtopics to target in the 15-question evaluation</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-white border border-[#fcdcb6] text-[#c26804] text-xs font-black rounded-full shadow-sm">
                      {formData.aptitudeSubtopics?.length || 0} subtopics chosen
                    </span>
                  </div>
                </div>

                {/* Main Category Multi-Select Selector */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2 ml-1">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      1. Select Primary Categories (Multi-Select)
                    </label>
                    <span className="text-[11px] font-bold text-[#144542]">
                      {formData.aptitudeCategories?.length || 0} categories active
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {APTITUDE_CATEGORIES.map(cat => {
                      const isMixed = cat.id === "Mixed Assessment";
                      const allStandardCats = APTITUDE_CATEGORIES.filter(c => c.id !== "Mixed Assessment").map(c => c.id);
                      const isSelected = isMixed
                        ? allStandardCats.every(id => formData.aptitudeCategories?.includes(id)) && allStandardCats.length > 0
                        : formData.aptitudeCategories?.includes(cat.id);

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleCategory(cat.id)}
                          className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border text-center transition-all ${
                            isSelected
                              ? "bg-[#144542] text-white border-[#144542] shadow-sm font-bold"
                              : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 font-medium hover:bg-gray-50"
                          }`}
                        >
                          {isSelected && <FiCheck className="text-white text-sm shrink-0" strokeWidth={3} />}
                          <span className="text-xs leading-tight font-bold">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subtopic Checkboxes / Badges Grid */}
                <div>
                  <div className="flex items-center justify-between mb-3 ml-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                      <span>2. Select Specific Subtopics</span>
                      <span className="text-black font-black">• Questions will come ONLY from checked subtopics</span>
                    </label>
                    {formData.aptitudeCategories?.length > 0 && (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => selectAllSubtopics()}
                          className="text-xs font-bold text-[#144542] hover:underline"
                        >
                          Select All
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={() => clearSubtopics()}
                          className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors"
                        >
                          Clear All
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Render subtopics grouped by selected categories */}
                  {!formData.aptitudeCategories || formData.aptitudeCategories.length === 0 ? (
                    <div className="p-6 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-center text-gray-500 text-xs font-medium">
                      No categories selected. Please select at least one primary category above to choose subtopics.
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                      {APTITUDE_CATEGORIES.filter(cat => formData.aptitudeCategories.includes(cat.id)).map(cat => {
                        const selectedInCat = cat.subtopics.filter(s => formData.aptitudeSubtopics?.includes(s.key)).length;
                        return (
                          <div key={cat.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-gray-900">{cat.name}</span>
                                <span className="px-2 py-0.5 bg-[#144542]/10 text-[#144542] text-[10px] font-black rounded-full">
                                  {selectedInCat} / {cat.subtopics.length} selected
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <button
                                  type="button"
                                  onClick={() => selectAllSubtopics(cat.id)}
                                  className="font-bold text-[#144542] hover:underline"
                                >
                                  Select All
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                  type="button"
                                  onClick={() => clearSubtopics(cat.id)}
                                  className="font-bold text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {cat.subtopics.map(sub => {
                                const checked = formData.aptitudeSubtopics?.includes(sub.key);
                                return (
                                  <button
                                    key={sub.key}
                                    type="button"
                                    onClick={() => toggleSubtopic(sub.key)}
                                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left text-xs transition-all ${
                                      checked
                                        ? "bg-[#144542]/10 border-[#144542] text-[#144542] font-bold shadow-sm"
                                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50/50"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] transition-colors ${
                                        checked ? "bg-[#144542] text-white" : "border border-gray-300 bg-white"
                                      }`}>
                                        {checked && <FiCheck strokeWidth={3} />}
                                      </div>
                                      <span className="truncate">{sub.name}</span>
                                    </div>
                                    <span className="text-[10px] font-bold opacity-60 ml-2 whitespace-nowrap bg-white/80 px-1.5 py-0.5 rounded border border-gray-100">{sub.count} Qs</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {formData.aptitudeCategories?.length > 0 && (!formData.aptitudeSubtopics || formData.aptitudeSubtopics.length === 0) && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
                      <FiAlertCircle size={15} />
                      <span>Please select at least one subtopic for the aptitude test.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Coding Challenge Question Selection (Conditional) */}
            {selectedModules.some(m => m.key === "codingModule") && (
              <div className="col-span-1 md:col-span-2 bg-white border border-gray-300 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[#fdf0d9]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#fdf0d9] text-[#db830f] flex items-center justify-center font-bold text-sm">
                      <FiCode size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900">Coding Question Selection</h3>
                      <p className="text-xs text-gray-500">
                        {formData.codingSelectionMode === "random"
                          ? "Build a question pool from any difficulty, then set the distribution each candidate receives"
                          : "Pick specific problems to assign, or leave unselected to provide all questions"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-[#fdf0d9]/60 border border-[#fdf0d9] text-[#db830f] text-xs font-black rounded-full shadow-sm">
                      {formData.codingSelectionMode === "random"
                        ? `Pool: ${formData.selectedCodingQuestions?.length || 0} questions · ${rTotalPick} per candidate`
                        : `${formData.selectedCodingQuestions?.length || 0} questions chosen`}
                    </span>
                  </div>
                </div>

                {/* Assignment Mode Toggle */}
                <div className="mb-4 p-1.5 bg-gray-100 rounded-xl flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, codingSelectionMode: "fixed" }))}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      formData.codingSelectionMode !== "random"
                        ? "bg-white text-gray-900 shadow-sm font-black"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <span>📋 Same questions for everyone</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, codingSelectionMode: "random" }))}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      formData.codingSelectionMode === "random"
                        ? "bg-[#db830f] text-white shadow-sm font-black"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <span>🎲 Randomize per candidate</span>
                  </button>
                </div>

                {/* ── Random Mode: Flexible Distribution Panel ──────────────────── */}
                {formData.codingSelectionMode === "random" && (
                  <div className="mb-5 p-4 bg-[#fffbf5] border border-[#f5ddb3] rounded-2xl space-y-3">

                    {/* Header row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#f5ddb3]">
                      <div>
                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                          <span>🎯 Difficulty Distribution Per Candidate</span>
                        </h4>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Select questions from the bank below to form the pool, then set how many of each difficulty level every candidate receives.
                        </p>
                      </div>
                      <div className="px-3 py-1 bg-[#db830f] text-white rounded-full text-xs font-black self-start sm:self-auto shadow-xs whitespace-nowrap">
                        {rTotalPick} per candidate
                      </div>
                    </div>

                    {/* Pool summary row */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { label: 'Easy',   key: 'easy',   color: 'emerald', poolCount: codingPoolByDifficulty.easy.length,   bankCount: allQuestionsByDifficulty.easy.length },
                        { label: 'Medium', key: 'medium', color: 'amber',   poolCount: codingPoolByDifficulty.medium.length, bankCount: allQuestionsByDifficulty.medium.length },
                        { label: 'Hard',   key: 'hard',   color: 'red',     poolCount: codingPoolByDifficulty.hard.length,   bankCount: allQuestionsByDifficulty.hard.length },
                      ].map(({ label, key, color, poolCount, bankCount }) => {
                        const pickN = rDist[key] || 0;
                        const effectivePool = poolCount > 0 ? poolCount : bankCount;
                        const overLimit = pickN > effectivePool;
                        return (
                          <div key={key}
                            className={`p-3 bg-white rounded-xl border shadow-xs ${
                              overLimit ? 'border-red-400' :
                              color === 'emerald' ? 'border-emerald-200/80' :
                              color === 'amber'   ? 'border-amber-200/80'   : 'border-red-200/80'
                            }`}
                          >
                            {/* Difficulty badge + pool info */}
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded border ${
                                color === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                color === 'amber'   ? 'bg-amber-50 text-amber-700 border-amber-200'       :
                                                     'bg-red-50 text-red-700 border-red-200'
                              }`}>{label}</span>
                              <span className="text-[10px] text-gray-400 font-medium">
                                {poolCount > 0 ? `${poolCount} in pool` : `${bankCount} in bank`}
                              </span>
                            </div>

                            {/* Assign stepper */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <span className="text-xs font-bold text-gray-600">Assign:</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setDistributionCount(key, pickN - 1)}
                                  className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs flex items-center justify-center cursor-pointer transition-colors"
                                >-</button>
                                <span className={`text-sm font-black w-4 text-center ${
                                  overLimit ? 'text-red-600' :
                                  color === 'emerald' ? 'text-emerald-700' :
                                  color === 'amber'   ? 'text-amber-700'   : 'text-red-700'
                                }`}>{pickN}</span>
                                <button
                                  type="button"
                                  onClick={() => setDistributionCount(key, pickN + 1)}
                                  className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs flex items-center justify-center cursor-pointer transition-colors"
                                >+</button>
                              </div>
                            </div>

                            {/* Warning if pick > pool */}
                            {overLimit && (
                              <p className="text-[10px] text-red-500 font-bold mt-1.5 text-center">
                                ⚠ exceeds pool ({effectivePool})
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Summary line */}
                    <div className="text-[11px] text-gray-600 font-medium bg-white/70 p-2.5 rounded-xl border border-[#f5ddb3]/60 flex items-center gap-2">
                      <span>💡</span>
                      <span>
                        Each candidate receives <strong>{rTotalPick} randomized questions</strong> — {rDist.easy} Easy · {rDist.medium} Medium · {rDist.hard} Hard — drawn at random from your selected pool of <strong>{formData.selectedCodingQuestions?.length || 0} questions</strong>.
                      </span>
                    </div>
                  </div>
                )}

                {/* Difficulty filter tabs & Quick actions */}
                <div className="mb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    {/* Tabs */}
                    <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl">
                      {['All', 'Easy', 'Medium', 'Hard'].map((tab) => {
                        const count = tab === 'All'
                          ? codingQuestionsList.length
                          : codingQuestionsList.filter(q => q.difficulty?.toLowerCase() === tab.toLowerCase()).length;
                        const isTabActive = codingDifficultyTab === tab;
                        return (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setCodingDifficultyTab(tab)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              isTabActive
                                ? "bg-white text-gray-900 shadow-sm font-black"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            {tab} <span className={`text-[10px] ml-1 px-1.5 py-0.5 rounded-full ${
                              isTabActive ? "bg-gray-100 text-gray-900 font-bold" : "bg-gray-200/60 text-gray-500"
                            }`}>{count}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Quick Action buttons */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => selectAllCodingQuestions(codingDifficultyTab)}
                        className="text-xs font-bold text-[#db830f] hover:underline cursor-pointer"
                      >
                        Select All ({codingDifficultyTab})
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={() => clearCodingQuestions(codingDifficultyTab)}
                        className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        Clear All ({codingDifficultyTab})
                      </button>
                    </div>
                  </div>

                  {/* Search box */}
                  <div className="relative mb-3">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <FiSearch size={14} />
                    </div>
                    <input
                      type="text"
                      value={codingSearchQuery}
                      onChange={(e) => setCodingSearchQuery(e.target.value)}
                      placeholder="Search coding problems by title or description..."
                      className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 font-medium placeholder:text-gray-400 focus:ring-2 focus:ring-[#db830f] focus:bg-white transition-all"
                    />
                    {codingSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setCodingSearchQuery("")}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Question Cards Grid */}
                {isCodingQuestionsLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
                    <FiLoader className="animate-spin text-2xl text-[#db830f]" />
                    <span className="text-xs font-medium">Loading coding challenges...</span>
                  </div>
                ) : (
                  (() => {
                    const filteredQuestions = codingQuestionsList.filter(q => {
                      const matchesDiff = codingDifficultyTab === 'All' || q.difficulty?.toLowerCase() === codingDifficultyTab.toLowerCase();
                      const matchesSearch = !codingSearchQuery ||
                        q.title?.toLowerCase().includes(codingSearchQuery.toLowerCase()) ||
                        q.id?.toLowerCase().includes(codingSearchQuery.toLowerCase()) ||
                        q.description?.toLowerCase().includes(codingSearchQuery.toLowerCase());
                      return matchesDiff && matchesSearch;
                    });

                    if (filteredQuestions.length === 0) {
                      return (
                        <div className="p-8 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-center text-gray-500 text-xs font-medium">
                          No coding questions match your current filter or search criteria.
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                        {filteredQuestions.map((q) => {
                          const isChecked = formData.selectedCodingQuestions?.includes(q.id);
                          const diff = (q.difficulty || 'Medium').toLowerCase();
                          const diffBadgeStyle = diff === 'easy'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : diff === 'hard'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200';

                          return (
                            <button
                              key={q.id}
                              type="button"
                              onClick={() => toggleCodingQuestion(q.id)}
                              className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                                isChecked
                                  ? "bg-[#fffbf5] border-[#db830f] shadow-xs"
                                  : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              <div className={`mt-0.5 w-4 h-4 rounded shrink-0 flex items-center justify-center text-[10px] transition-colors ${
                                isChecked ? "bg-[#db830f] text-white" : "border border-gray-300 bg-white"
                              }`}>
                                {isChecked && <FiCheck strokeWidth={3} />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <h4 className={`text-xs font-bold truncate ${isChecked ? "text-[#db830f]" : "text-gray-900"}`}>
                                    {q.title}
                                  </h4>
                                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border shrink-0 uppercase tracking-wider ${diffBadgeStyle}`}>
                                    {q.difficulty}
                                  </span>
                                </div>
                                <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                                  {q.description}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()
                )}

                {/* Helpful note at bottom */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                  <span>
                    💡 <strong>Tip:</strong> {formData.codingSelectionMode === "random"
                      ? "Select questions below to define the pool, then use the distribution panel above to control how many of each difficulty each candidate receives."
                      : "If you leave questions unselected (0 chosen), all available coding challenges will be accessible to candidates."}
                  </span>
                  {formData.selectedCodingQuestions?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => clearCodingQuestions()}
                      className="text-[#db830f] font-bold hover:underline cursor-pointer"
                    >
                      Reset selection
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* AI Interview Question Count (Conditional) */}
            {selectedModules.some(m => m.key === "interviewModule") && (
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">AI Interview Questions (5 - 15)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <FiActivity size={15} />
                  </div>
                  <input 
                    type="number" 
                    name="interviewQuestionCount"
                    min={5}
                    max={15}
                    value={formData.interviewQuestionCount}
                    onChange={handleInputChange}
                    placeholder="15 (Default)" 
                    className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 font-medium focus:ring-2 focus:ring-[#144542] transition-all"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1 ml-1">Number of questions generated for each candidate (Default: 15).</p>
              </div>
            )}

            {/* Assigned HR */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Assigned HR</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <FiUser size={15} />
                </div>
                <select 
                  name="hrId"
                  value={formData.hrId}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-10 py-3.5 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 font-medium appearance-none cursor-pointer focus:ring-2 focus:ring-[#144542] transition-all"
                >
                  <option value="" disabled>Select an HR person</option>
                  {hrList.map((hr) => (
                    <option key={hr.hrId} value={hr.hrId}>
                      {hr.name} ({hr.designation || "HR"})
                    </option>
                  ))}
                  {hrList.length === 0 && <option value="">No HRs found</option>}
                </select>
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Start Date</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <FiCalendar size={15} />
                </div>
                <input 
                  type="date" 
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 font-medium focus:ring-2 focus:ring-[#144542] transition-all"
                />
              </div>
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Start Time</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <FiClock size={15} />
                </div>
                <input 
                  type="time" 
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 font-medium focus:ring-2 focus:ring-[#144542] transition-all"
                />
              </div>
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">End Date</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <FiCalendar size={15} />
                </div>
                <input 
                  type="date" 
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 font-medium focus:ring-2 focus:ring-[#144542] transition-all"
                />
              </div>
            </div>

            {/* End Time */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">End Time</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <FiClock size={15} />
                </div>
                <input 
                  type="time" 
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 font-medium focus:ring-2 focus:ring-[#144542] transition-all"
                />
              </div>
            </div>

            {/* Approx Student Count */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Approx Student Count</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <FiUsers size={15} />
                </div>
                <input 
                  type="number" 
                  name="approxStudentCount"
                  value={formData.approxStudentCount}
                  onChange={handleInputChange}
                  placeholder="e.g. 50"
                  min="0"
                  className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border-0 rounded-xl text-sm text-gray-900 font-medium placeholder:text-gray-400 focus:ring-2 focus:ring-[#144542] transition-all"
                />
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end gap-6 mt-2">
              <button 
                onClick={onCancel}
                className="px-10 py-4 bg-white border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-4"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateTest}
                disabled={isSubmitting || testIdStatus === "taken" || selectedModules.length === 0}
                className="flex-1 max-w-[250px] py-3.5 bg-[#144542] text-white text-sm font-bold rounded-xl shadow-md hover:bg-[#144542]/90 transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <><FiLoader className="animate-spin" /> Creating...</>
                ) : (
                  "Create Assessment"
                )}
              </button>
            </div>
          </div>
          
          {submissionStatus.message && (
            <div className={`mt-4 p-4 rounded-xl text-sm font-bold flex items-center gap-2 ${
              submissionStatus.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}>
              {submissionStatus.type === "success" ? <FiCheckCircle /> : <FiAlertCircle />}
              {submissionStatus.message}
            </div>
          )}
        </div>
      </div> </div>
  );
}
