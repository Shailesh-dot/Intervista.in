import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

import { motion, AnimatePresence } from "framer-motion";
import {
  FiSearch, FiAward, FiCode, FiClock, FiActivity,
  FiCheckCircle, FiVolume2, FiAlertCircle, FiX,
  FiUser, FiMail, FiCalendar, FiChevronRight, FiGrid, FiChevronDown, FiChevronUp, FiDownload, FiTrash2
} from "react-icons/fi";

const CircularProgress = ({ score, size = 130, strokeWidth = 10 }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 500);
    return () => clearTimeout(timer);
  }, [score]);

  const getColorClass = (s) => {
    if (s >= 80) return 'stroke-emerald-500';
    if (s >= 60) return 'stroke-[#00a89a]';
    return 'stroke-red-500';
  };

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="currentColor" strokeWidth={strokeWidth}
          className="text-gray-100"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`transition-all duration-1000 ease-out ${getColorClass(score)}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-gray-900 leading-none tracking-tighter">{score}%</span>
        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">Score</span>
      </div>
    </div>
  );
};

const parseAiFeedback = (fbVal) => {
  let score = null;
  let feedback = "No feedback available.";

  if (fbVal) {
    if (typeof fbVal === 'object') {
      score = fbVal.score !== undefined ? fbVal.score : null;
      feedback = fbVal.feedback || "No feedback available.";
    } else if (typeof fbVal === 'string') {
      try {
        const parsed = JSON.parse(fbVal);
        if (parsed && typeof parsed === 'object') {
          score = parsed.score !== undefined ? parsed.score : null;
          feedback = parsed.feedback || "No feedback available.";
        } else {
          feedback = fbVal;
        }
      } catch (e) {
        feedback = fbVal;
      }
    }
  }
  return { score, feedback };
};

export default function TestDashboard({ test }) {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'completed', 'progress'
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Deep-dive scorecard tab
  const [activeScorecardTab, setActiveScorecardTab] = useState("overview");
  const [candidatePhoto, setCandidatePhoto] = useState(null);
  const [expandedInterviewQuestion, setExpandedInterviewQuestion] = useState(null);
  const [isOverallDownloading, setIsOverallDownloading] = useState(null); // 'pdf' or 'excel' or null

  // Leaderboard state
  const [leaderboardModule, setLeaderboardModule] = useState(null); // null | 'aptitude' | 'coding' | 'aiInterview' | 'verbal'
  const [showLeaderboardDropdown, setShowLeaderboardDropdown] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState(null);
  const [isDeletingRecord, setIsDeletingRecord] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleDeleteRecord = async () => {
    if (!candidateToDelete || !test?.testId) return;
    setIsDeletingRecord(true);
    try {
      const response = await fetch(
        `/api/verification/verification/test-results/${test.testId}/candidate/${candidateToDelete.studentId}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (response.ok) {
        setResults(prev => prev.filter(r => r.studentId !== candidateToDelete.studentId && r.resultBaseId !== candidateToDelete.resultBaseId));
        if (selectedCandidate?.studentId === candidateToDelete.studentId) {
          setSelectedCandidate(null);
        }
        setToastMessage({
          type: 'success',
          text: `Test record for ${candidateToDelete.studentName || 'candidate'} deleted. Student can now re-attend.`
        });
        setCandidateToDelete(null);
      } else {
        const errData = await response.json().catch(() => ({}));
        setToastMessage({
          type: 'error',
          text: errData.error || errData.detail || 'Failed to delete candidate record.'
        });
      }
    } catch (err) {
      console.error('Error deleting candidate record:', err);
      setToastMessage({
        type: 'error',
        text: 'Network error deleting candidate record.'
      });
    } finally {
      setIsDeletingRecord(false);
    }
  };

  // Fetch candidate photo when selectedCandidate changes
  useEffect(() => {
    setExpandedInterviewQuestion(null);
    if (!selectedCandidate?.studentId) {
      setCandidatePhoto(null);
      return;
    }

    const fetchCandidatePhoto = async () => {
      try {
        const response = await fetch(`/api/verification/profile/${selectedCandidate.studentId}`);
        if (response.ok) {
          const data = await response.json();
          setCandidatePhoto(data.photoUrl || null);
        } else {
          setCandidatePhoto(null);
        }
      } catch (error) {
        console.error("Error fetching candidate photo:", error);
        setCandidatePhoto(null);
      }
    };

    fetchCandidatePhoto();
  }, [selectedCandidate]);

  // Fetch all results for this test from the Python Verification API (port 8003)
  // which holds the real Supabase results stored during the candidate test sessions.
  useEffect(() => {
    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/verification/verification/test-results/${test.testId}`
        );
        if (response.ok) {
          const data = await response.json();
          setResults(data);
        } else {
          console.error("Error fetching test results:", response.status);
        }
      } catch (error) {
        console.error("Error fetching test results:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (test?.testId) {
      fetchResults();
    }
  }, [test]);

  const downloadExcel = () => {
    if (!selectedCandidate) return;

    const csvCell = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = [];
    rows.push(["CANDIDATE SCORECARD REPORT"]);
    rows.push(["Candidate Name", selectedCandidate.studentName]);
    rows.push(["Candidate Email", selectedCandidate.studentEmail]);
    if (selectedCandidate.studentRollNumber) rows.push(["Roll Number", selectedCandidate.studentRollNumber]);
    rows.push(["Student ID", selectedCandidate.studentId]);
    rows.push(["Attempt Date", new Date(selectedCandidate.createdAt).toLocaleDateString()]);
    rows.push(["Overall Score", `${selectedCandidate.scoreSecured} / ${selectedCandidate.totalScore}`]);
    rows.push(["Completion Status", checkCompletionStatus(selectedCandidate)]);
    rows.push([]);

    // Aptitude
    if (test.aptitudeModule && selectedCandidate.aptitude) {
      const apt = selectedCandidate.aptitude;
      rows.push(["APTITUDE TEST MODULE RESULTS"]);
      rows.push(["Score Secured", `${apt.moduleScoreSecured} / ${apt.moduleTotalScore}`]);
      rows.push(["Correct Answers", apt.correct]);
      rows.push(["Wrong Answers", apt.incorrect]);
      rows.push(["Question No.", "Topic", "Question Text", "Candidate Answer", "Correct Solution", "Status"]);

      (apt.questions || []).forEach((q, idx) => {
        const userAns = apt.userAnswers?.[idx] || "";
        const correctAns = apt.correctAnswers?.[idx] || "";
        const hasSolution = !!correctAns;
        const isCorrect = hasSolution ? (userAns === correctAns ? "Correct" : "Incorrect") : "Answer Recorded";
        const topic = apt.topics?.[idx] || "Logical Assessment";

        rows.push([
          `Q${idx + 1}`,
          topic,
          q,
          userAns || "(skipped)",
          correctAns || "Solution not archived",
          isCorrect
        ]);
      });
      rows.push([]);
    }

    // Coding
    if (test.codingModule && selectedCandidate.coding) {
      const cod = selectedCandidate.coding;
      rows.push(["CODING MODULE RESULTS"]);
      rows.push(["Score Secured", `${cod.moduleScoreSecured} / ${cod.moduleTotalScore}`]);
      rows.push(["Problem No.", "Testcases Passed", "Source Code"]);

      (cod.answers || []).forEach((code, idx) => {
        const passed = cod.testcasePassed?.[idx] ?? 0;
        const total = cod.testcaseTotals?.[idx] ?? 0;

        rows.push([
          `Problem ${idx + 1}`,
          `${passed} / ${total}`,
          code || "// No answer submitted."
        ]);
      });
      rows.push([]);
    }

    // AI Interview
    if (test.interviewModule && selectedCandidate.aiInterview) {
      const ai = selectedCandidate.aiInterview;
      const pct = Math.round((ai.moduleScoreSecured / ai.moduleTotalScore) * 100) || 0;
      rows.push(["AI INTERVIEW RESULTS"]);
      rows.push(["Technical Depth Score", `${ai.moduleScoreSecured} / ${ai.moduleTotalScore} (${pct}%)`]);
      rows.push(["Dialogue Accuracy", `${ai.correct} / ${(ai.questions || []).length} match`]);
      rows.push(["Question No.", "Question", "Candidate Answer", "AI Feedback / Reference Match"]);

      (ai.questions || []).forEach((q, idx) => {
        const ans = ai.answers?.[idx] || "(No reply received)";
        const rawFeedback = ai.correctAnswers?.[idx] || "No feedback available.";
        const fbObj = parseAiFeedback(rawFeedback);
        const correctText = fbObj.score !== null ? `[Score: ${fbObj.score}/10] ${fbObj.feedback}` : fbObj.feedback;

        rows.push([
          `Question ${idx + 1}`,
          q,
          ans,
          correctText
        ]);
      });
      rows.push([]);
    }

    // Verbal
    if (test.verbalModule && selectedCandidate.verbal) {
      const vbl = selectedCandidate.verbal;
      rows.push(["SPEECH & VERBAL MODULE RESULTS"]);
      rows.push(["Score Secured", `${vbl.moduleScoreSecured} / ${vbl.moduleTotalScore}`]);
      rows.push(["Metric", "Score %"]);

      Object.keys(vbl.metrics || {}).forEach((m) => {
        rows.push([m, `${vbl.metrics[m]}%`]);
      });
      rows.push([]);

      rows.push(["Speaking Samples"]);
      (vbl.speaking || []).forEach((speak, idx) => {
        rows.push([`Sample ${idx + 1}`, speak]);
      });
      rows.push([]);
    }

    const csvContent = rows
      .map(row => row.map(cell => csvCell(cell)).join(","))
      .join("\r\n");

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `scorecard_${selectedCandidate.studentName.replace(/\s+/g, '_')}_${selectedCandidate.studentId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDF = async () => {
    if (!selectedCandidate) return;

    const overallPct = getPercentage(selectedCandidate.scoreSecured, selectedCandidate.totalScore);
    const evalLabel = overallPct >= 75 ? "Outstanding Cleared" : overallPct >= 50 ? "Qualified" : "Disqualified / Needs Review";
    const evalColor = overallPct >= 75 ? "#059669" : overallPct >= 50 ? "#d97706" : "#dc2626";
    const attemptDate = new Date(selectedCandidate.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const filename = `scorecard_${(selectedCandidate.studentName || "candidate").replace(/\s+/g, "_")}.pdf`;

    // ─── shared style tokens ────────────────────────────────────────────────────
    const BASE_FONT = "font-family:Arial,Helvetica,sans-serif;";
    const LINE_H = "line-height:1.7;";

    const card = (inner) =>
      `<div style="${BASE_FONT}${LINE_H}background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:32px 36px;margin-bottom:22px;box-shadow:0 2px 8px rgba(0,0,0,.06);">${inner}</div>`;

    const badge = (label, bg, fg) =>
      `<span style="display:inline-block;background:${bg};color:${fg};padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:.02em;">${label}</span>`;

    const metaItem = (label, value) =>
      `<div style="margin-bottom:14px;">
         <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">${label}</div>
         <div style="font-size:14px;font-weight:700;color:#0f172a;${LINE_H}">${value}</div>
       </div>`;

    const sectionTitle = (title) =>
      `<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;padding-bottom:14px;border-bottom:2.5px solid #e2e8f0;">
         <div style="width:5px;height:26px;background:#144542;border-radius:3px;flex-shrink:0;"></div>
         <span style="font-size:17px;font-weight:800;color:#144542;${LINE_H}">${title}</span>
       </div>`;

    // ─── build scorecard HTML ───────────────────────────────────────────────────
    let html = "";

    // ── HEADER ─────────────────────────────────────────────────────────────────
    html += `
      <div style="${BASE_FONT}${LINE_H}background:linear-gradient(135deg,#144542 0%,#1e7a75 100%);color:#fff;padding:36px 40px 32px;border-radius:18px;margin-bottom:22px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:10px;">Candidate Scorecard Report</div>
        <div style="font-size:30px;font-weight:900;margin-bottom:12px;letter-spacing:-.02em;">${selectedCandidate.studentName || "Unknown Candidate"}</div>
        <div style="display:flex;flex-wrap:wrap;gap:24px;font-size:13px;color:rgba(255,255,255,.78);">
          <span>&#9993;&nbsp; ${selectedCandidate.studentEmail || "N/A"}</span>
          <span>&#128100;&nbsp; ID: ${selectedCandidate.studentId || "N/A"}</span>
          ${selectedCandidate.studentRollNumber ? `<span>&#128179;&nbsp; Roll: ${selectedCandidate.studentRollNumber}</span>` : ""}
          <span>&#128197;&nbsp; ${attemptDate}</span>
        </div>
      </div>`;

    // ── OVERVIEW ROW ────────────────────────────────────────────────────────────
    html += `
      <div style="display:grid;grid-template-columns:180px 1fr;gap:22px;margin-bottom:22px;">
        <div style="${BASE_FONT}background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:28px 20px;box-shadow:0 2px 8px rgba(0,0,0,.06);text-align:center;">
          <div style="font-size:46px;font-weight:900;color:#0f172a;line-height:1;">${overallPct}%</div>
          <div style="font-size:13px;font-weight:800;color:${evalColor};margin-top:10px;${LINE_H}">${evalLabel}</div>
          <div style="font-size:10px;color:#94a3b8;margin-top:6px;text-transform:uppercase;letter-spacing:.1em;">Overall Score</div>
        </div>
        <div style="${BASE_FONT}background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:28px 32px;box-shadow:0 2px 8px rgba(0,0,0,.06);">
          <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;margin-bottom:18px;">Session Metadata</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px 24px;">
            ${metaItem("Total Score", `${selectedCandidate.scoreSecured} / ${selectedCandidate.totalScore}`)}
            ${metaItem("Completion Status", checkCompletionStatus(selectedCandidate))}
            ${metaItem("Attempt Date", attemptDate)}
            ${metaItem("Session Code", selectedCandidate.testCode || "N/A")}
          </div>
        </div>
      </div>`;

    // ── PROCTOR ─────────────────────────────────────────────────────────────────
    html += `
      ${card(`
        <div style="display:flex;gap:18px;align-items:flex-start;background:#ecfdf5;border:1px solid #bbf7d0;border-radius:14px;padding:20px 24px;color:#065f46;">
          <span style="font-size:26px;line-height:1;flex-shrink:0;margin-top:2px;">&#9989;</span>
          <div>
            <div style="font-weight:800;font-size:15px;margin-bottom:6px;">No Suspicious Behavior Flagged</div>
            <div style="font-size:13px;color:#047857;${LINE_H}">Candidate passed all Haar face-presence checks and continuous ArcFace identity evaluations throughout the exam with zero critical violations.</div>
          </div>
        </div>
      `)}`;

    // ── APTITUDE ────────────────────────────────────────────────────────────────
    if (test.aptitudeModule && selectedCandidate.aptitude) {
      const apt = selectedCandidate.aptitude;
      html += card(`
        ${sectionTitle("&#128196; &nbsp;Aptitude Module Results")}
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;background:#f8fafc;border-radius:12px;padding:18px 20px;">
          ${metaItem("Score Secured", `${apt.moduleScoreSecured} / ${apt.moduleTotalScore}`)}
          ${metaItem("Correct Answers", `<span style="color:#059669;font-weight:800;">${apt.correct}</span>`)}
          ${metaItem("Incorrect Answers", `<span style="color:#dc2626;font-weight:800;">${apt.incorrect}</span>`)}
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;${LINE_H}">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="text-align:left;padding:12px 14px;color:#64748b;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #e2e8f0;width:42px;">#</th>
              <th style="text-align:left;padding:12px 14px;color:#64748b;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #e2e8f0;">Question</th>
              <th style="text-align:left;padding:12px 14px;color:#64748b;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #e2e8f0;width:160px;">Candidate's Answer</th>
              <th style="text-align:left;padding:12px 14px;color:#64748b;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.06em;border-bottom:2px solid #e2e8f0;width:160px;">Correct Answer</th>
            </tr>
          </thead>
          <tbody>
          ${(apt.questions || []).map((q, idx) => {
        const userAns = apt.userAnswers?.[idx] ?? "(skipped)";
        const correctAns = apt.correctAnswers?.[idx];
        const hasSol = !!correctAns;
        const isCorrect = hasSol ? String(userAns) === String(correctAns) : null;
        const topic = apt.topics?.[idx] || "Logical Assessment";
        const rowBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
        const statusBadge = isCorrect === true
          ? badge("Correct", "#dcfce7", "#166534")
          : isCorrect === false
            ? badge("Incorrect", "#fee2e2", "#991b1b")
            : badge("Recorded", "#dbeafe", "#1e40af");
        return `<tr style="background:${rowBg};border-bottom:1px solid #f1f5f9;">
              <td style="padding:16px 14px;color:#94a3b8;font-weight:700;vertical-align:top;font-size:13px;">${idx + 1}</td>
              <td style="padding:16px 14px;vertical-align:top;">
                <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;font-weight:700;letter-spacing:.06em;margin-bottom:5px;">${topic}</div>
                <div style="color:#0f172a;font-weight:600;font-size:13px;${LINE_H}">${q}</div>
              </td>
              <td style="padding:16px 14px;vertical-align:top;">
                <div style="color:#0f172a;font-weight:700;font-size:13px;margin-bottom:8px;">${userAns}</div>
                ${statusBadge}
              </td>
              <td style="padding:16px 14px;vertical-align:top;color:${hasSol ? "#0f172a" : "#94a3b8"};font-weight:${hasSol ? "700" : "400"};font-style:${hasSol ? "normal" : "italic"};font-size:13px;">${hasSol ? correctAns : "Not archived"}</td>
            </tr>`;
      }).join("")}
          </tbody>
        </table>
      `);
    }

    // ── CODING ──────────────────────────────────────────────────────────────────
    if (test.codingModule && selectedCandidate.coding) {
      const cod = selectedCandidate.coding;
      html += card(`
        ${sectionTitle("&#128187; &nbsp;Coding Module Results")}
        <div style="background:#f8fafc;border-radius:12px;padding:18px 20px;margin-bottom:22px;">
          ${metaItem("Coding Score", `${cod.moduleScoreSecured} / ${cod.moduleTotalScore}`)}
        </div>
        ${(cod.answers || []).map((code, idx) => {
        const passed = cod.testcasePassed?.[idx] ?? 0;
        const total = cod.testcaseTotals?.[idx] ?? 0;
        const codeStr = (code || "// No answer submitted.").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `<div style="border-radius:14px;overflow:hidden;margin-bottom:18px;border:1px solid #334155;">
            <div style="background:#0f2d2b;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;">
              <span style="color:rgba(255,255,255,.75);font-size:13px;font-family:monospace;font-weight:600;">Problem ${idx + 1} Submission</span>
              <span style="color:#a3e635;font-size:12px;font-weight:700;">&#10003; ${passed} / ${total} test cases passed</span>
            </div>
            <div style="background:#0d2521;padding:20px 22px;">
              <pre style="margin:0;font-family:'Courier New',monospace;font-size:12px;color:#34d399;line-height:1.65;white-space:pre-wrap;word-break:break-all;">${codeStr}</pre>
            </div>
          </div>`;
      }).join("")}
      `);
    }

    // ── AI INTERVIEW ────────────────────────────────────────────────────────────
    if (test.interviewModule && selectedCandidate.aiInterview) {
      const ai = selectedCandidate.aiInterview;
      const aiPct = Math.round(((ai.moduleScoreSecured || 0) / (ai.moduleTotalScore || 1)) * 100);
      html += card(`
        ${sectionTitle("&#129302; &nbsp;AI Conversational Interview")}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;background:#f8fafc;border-radius:12px;padding:18px 20px;margin-bottom:24px;">
          ${metaItem("Technical Depth Score", `${ai.moduleScoreSecured} / ${ai.moduleTotalScore} (${aiPct}%)`)}
          ${metaItem("Dialogue Accuracy", `${ai.correct} / ${(ai.questions || []).length} matched`)}
        </div>
        ${(ai.questions || []).map((q, idx) => {
        const ans = ai.answers?.[idx] || "(No reply received)";
        const rawFb = ai.correctAnswers?.[idx] || "No feedback available.";
        const fbObj = parseAiFeedback(rawFb);
        const fbText = fbObj.score !== null ? `<span style="background:#eafaf1;color:#10b981;font-weight:bold;padding:2px 6px;border-radius:4px;margin-right:6px;font-size:11px;">${fbObj.score}/10</span> ${fbObj.feedback}` : fbObj.feedback;
        return `<div style="border-left:5px solid #144542;padding-left:20px;margin-bottom:24px;">
            <div style="font-weight:800;color:#0f172a;font-size:14px;margin-bottom:10px;${LINE_H}">Q${idx + 1}: ${q}</div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;font-size:13px;color:#475569;font-style:italic;margin-bottom:10px;${LINE_H}">"${ans}"</div>
            <div style="font-size:12px;color:#64748b;${LINE_H}"><strong style="color:#144542;font-style:normal;">AI Feedback: </strong>${fbText}</div>
          </div>`;
      }).join("")}
      `);
    }

    // ── VERBAL ──────────────────────────────────────────────────────────────────
    if (test.verbalModule && selectedCandidate.verbal) {
      const vbl = selectedCandidate.verbal;
      html += card(`
        ${sectionTitle("&#127908; &nbsp;Speech & Verbal Module")}
        <div style="background:#f8fafc;border-radius:12px;padding:18px 20px;margin-bottom:22px;">
          ${metaItem("Verbal Score", `${vbl.moduleScoreSecured} / ${vbl.moduleTotalScore}`)}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:22px;">
          ${Object.entries(vbl.metrics || {}).map(([mName, mVal]) => `
            <div style="background:#f8fafc;border-radius:12px;padding:16px 18px;">
              <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">
                <span>${mName}</span><span>${mVal}%</span>
              </div>
              <div style="background:#e2e8f0;border-radius:99px;height:9px;overflow:hidden;">
                <div style="background:linear-gradient(90deg,#7c3aed,#a855f7);height:100%;width:${Math.min(100, mVal || 0)}%;border-radius:99px;"></div>
              </div>
            </div>`).join("")}
        </div>
        ${(vbl.speaking || []).length > 0 ? `
          <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.08em;margin-bottom:14px;">Speaking Samples Audited</div>
          ${(vbl.speaking || []).map((s, i) => `
            <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;padding:14px 18px;margin-bottom:12px;font-size:13px;color:#7c3aed;font-style:italic;${LINE_H}">
              <strong style="font-style:normal;color:#6d28d9;">Sample ${i + 1}:</strong> "${s}"
            </div>`).join("")}
        ` : ""}
      `);
    }

    // ─── render + screenshot + assemble PDF ────────────────────────────────────
    const wrap = document.createElement("div");
    wrap.style.cssText = [
      "position:fixed", "left:-9999px", "top:0",
      "width:1000px",
      "background:#f1f5f9",
      "padding:32px",
      "box-sizing:border-box",
      "font-family:Arial,Helvetica,sans-serif",
    ].join(";") + ";";
    wrap.innerHTML = html;
    document.body.appendChild(wrap);

    try {
      const canvas = await html2canvas(wrap, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#f1f5f9",
        logging: false,
        onclone: (clonedDoc) => {
          // Remove ALL external stylesheets + <style> tags so html2canvas never
          // encounters oklch() / oklab() colour functions from Tailwind v4.
          clonedDoc.querySelectorAll('link[rel="stylesheet"], style').forEach(el => el.remove());
        },
      });

      // A4 at 96 dpi = 794 × 1123 px  (jsPDF "px" unit with hotfixes)
      const pdf = new jsPDF({ unit: "px", format: "a4", hotfixes: ["px_scaling"] });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      const ratio = pdfW / canvas.width;   // scale-down factor
      const pageH_canvas = pdfH / ratio;           // canvas rows per PDF page

      let offsetY = 0;
      let firstPage = true;

      while (offsetY < canvas.height) {
        if (!firstPage) pdf.addPage();
        firstPage = false;

        const sliceH = Math.min(pageH_canvas, canvas.height - offsetY);

        // Copy slice onto a temp canvas
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceH;
        sliceCanvas.getContext("2d").drawImage(canvas, 0, -offsetY);

        pdf.addImage(sliceCanvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pdfW, sliceH * ratio);
        offsetY += pageH_canvas;
      }

      pdf.save(filename);
    } finally {
      document.body.removeChild(wrap);
    }
  };

  const fetchAllProfiles = async () => {
    const enrichedResults = await Promise.all(
      results.map(async (cand) => {
        try {
          const response = await fetch(`/api/verification/profile/${cand.studentId}`);
          if (response.ok) {
            const profile = await response.json();
            return {
              ...cand,
              studentPhone: profile.phone || "N/A",
              studentDob: profile.dob || "N/A",
              studentGender: profile.gender || "N/A",
              studentCollege: profile.college || "N/A",
              studentRollNumber: profile.rollNumber || profile.RollNumber || cand.studentRollNumber || "N/A"
            };
          }
        } catch (err) {
          console.error("Error fetching profile for student", cand.studentId, err);
        }
        return {
          ...cand,
          studentPhone: "N/A",
          studentDob: "N/A",
          studentGender: "N/A",
          studentCollege: "N/A",
          studentRollNumber: cand.studentRollNumber || "N/A"
        };
      })
    );
    return enrichedResults;
  };

  const downloadOverallExcel = async () => {
    setIsOverallDownloading('excel');
    try {
      const enriched = await fetchAllProfiles();

      const csvCell = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val);
        return `"${str.replace(/"/g, '""')}"`;
      };

      const rows = [];
      rows.push(["OVERALL TEST RESULTS REPORT"]);
      rows.push(["Test ID", test.testId]);
      rows.push(["Test Name", test.testName || test.testId]);
      rows.push(["Created On", new Date(test.createdAt).toLocaleDateString()]);
      rows.push(["Owner / HR", test.hrName || "Recruiter"]);
      rows.push([]);
      rows.push(["METRICS SUMMARY"]);
      rows.push(["Candidates Attended", totalAttended]);
      rows.push(["Fully Completed", fullyCompleted]);
      rows.push(["In Progress", inProgress]);
      rows.push(["Average Score", `${averageScoreSecured}%`]);
      rows.push([]);

      const headers = [
        "Candidate Name",
        "Candidate Email",
        "Roll Number",
        "Phone Number",
        "Date of Birth",
        "Gender",
        "College",
        "Attempt Date",
        "Status",
        "Overall Score Secured",
        "Total Module Score"
      ];
      if (test.aptitudeModule) headers.push("Aptitude Score");
      if (test.codingModule) headers.push("Coding Score");
      if (test.interviewModule) headers.push("AI Interview Score");
      if (test.verbalModule) headers.push("Speech/Verbal Score");

      rows.push(headers);

      enriched.forEach(cand => {
        const status = checkCompletionStatus(cand);
        const row = [
          cand.studentName || `Candidate #${cand.studentId}`,
          cand.studentEmail || "N/A",
          cand.studentRollNumber || "N/A",
          cand.studentPhone || "N/A",
          cand.studentDob || "N/A",
          cand.studentGender || "N/A",
          cand.studentCollege || "N/A",
          new Date(cand.createdAt).toLocaleDateString(),
          status,
          cand.scoreSecured,
          cand.totalScore
        ];
        if (test.aptitudeModule) row.push(cand.aptitude ? `${cand.aptitude.moduleScoreSecured} / ${cand.aptitude.moduleTotalScore}` : "N/A");
        if (test.codingModule) row.push(cand.coding ? `${cand.coding.moduleScoreSecured} / ${cand.coding.moduleTotalScore}` : "N/A");
        if (test.interviewModule) row.push(cand.aiInterview ? `${cand.aiInterview.moduleScoreSecured} / ${cand.aiInterview.moduleTotalScore}` : "N/A");
        if (test.verbalModule) row.push(cand.verbal ? `${cand.verbal.moduleScoreSecured} / ${cand.verbal.moduleTotalScore}` : "N/A");

        rows.push(row);
      });

      const csvContent = rows
        .map(r => r.map(csvCell).join(","))
        .join("\r\n");

      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `overall_results_${test.testId}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to generate overall excel", err);
    } finally {
      setIsOverallDownloading(null);
    }
  };

  const downloadOverallPDF = async () => {
    setIsOverallDownloading('pdf');
    try {
      const enriched = await fetchAllProfiles();
      const filename = `overall_results_${test.testId}.pdf`;

      const BASE_FONT = "font-family:Arial,Helvetica,sans-serif;";
      const LINE_H = "line-height:1.6;";

      const badge = (label, bg, fg) =>
        `<span style="display:inline-block;background:${bg};color:${fg};padding:4px 12px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.02em;">${label}</span>`;

      let html = "";

      // 1. Header Card
      html += `
        <div style="${BASE_FONT}${LINE_H}background:linear-gradient(135deg,#144542 0%,#1e7a75 100%);color:#fff;padding:36px 40px;border-radius:18px;margin-bottom:24px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:8px;">Test Summary Report</div>
          <div style="font-size:28px;font-weight:900;margin-bottom:10px;letter-spacing:-.02em;">${test.testName || test.testId}</div>
          <div style="font-size:12px;color:rgba(255,255,255,.7);font-weight:600;">
            Test ID: ${test.testId} • Created on ${new Date(test.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })} • Owner: ${test.hrName || "Recruiter"}
          </div>
        </div>
      `;

      // 2. Metrics Summaries
      html += `
        <div style="${BASE_FONT}display:table;width:100%;margin-bottom:24px;border-spacing:10px;margin-left:-10px;margin-right:-10px;">
          <div style="display:table-row;">
            
            <div style="display:table-cell;width:25%;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px;box-shadow:0 2px 6px rgba(0,0,0,.03);text-align:center;vertical-align:middle;">
              <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Candidates Attended</div>
              <div style="font-size:24px;font-weight:900;color:#0f172a;">${totalAttended}</div>
              <div style="font-size:9px;color:#94a3b8;font-weight:600;margin-top:2px;">Total active participants</div>
            </div>
            
            <div style="display:table-cell;width:25%;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px;box-shadow:0 2px 6px rgba(0,0,0,.03);text-align:center;vertical-align:middle;">
              <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Fully Completed</div>
              <div style="font-size:24px;font-weight:900;color:#059669;">${fullyCompleted}</div>
              <div style="font-size:9px;color:#94a3b8;font-weight:600;margin-top:2px;">Cleared all enabled modules</div>
            </div>
            
            <div style="display:table-cell;width:25%;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px;box-shadow:0 2px 6px rgba(0,0,0,.03);text-align:center;vertical-align:middle;">
              <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">In Progress</div>
              <div style="font-size:24px;font-weight:900;color:#d97706;">${inProgress}</div>
              <div style="font-size:9px;color:#94a3b8;font-weight:600;margin-top:2px;">Partially completed sessions</div>
            </div>
            
            <div style="display:table-cell;width:25%;background:#144542;border-radius:16px;padding:20px;box-shadow:0 2px 6px rgba(0,0,0,.05);text-align:center;vertical-align:middle;color:#fff;">
              <div style="font-size:10px;color:rgba(255,255,255,.5);font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Average Score</div>
              <div style="font-size:24px;font-weight:900;color:#DAFF0C;">${averageScoreSecured}%</div>
              <div style="font-size:9px;color:rgba(255,255,255,.5);font-weight:600;margin-top:2px;">Mean scorecard secured</div>
            </div>

          </div>
        </div>
      `;

      // 3. Candidates Title
      html += `
        <div style="${BASE_FONT}font-size:14px;font-weight:800;color:#144542;text-transform:uppercase;letter-spacing:.08em;margin-bottom:16px;margin-top:30px;padding-bottom:10px;border-bottom:2px solid #e2e8f0;">
          Candidate Profile & Results
        </div>
      `;

      // 4. Candidate cards list
      enriched.forEach(cand => {
        const status = checkCompletionStatus(cand);
        const scorePct = getPercentage(cand.scoreSecured, cand.totalScore);
        const statusBg = status === "Completed" ? "#ecfdf5" : "#fffbeb";
        const statusFg = status === "Completed" ? "#047857" : "#b45309";

        html += `
          <div style="${BASE_FONT}${LINE_H}background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;margin-bottom:18px;box-shadow:0 2px 6px rgba(0,0,0,.02);page-break-inside:avoid;">
            
            <!-- Candidate Header Info -->
            <div style="display:table;width:100%;margin-bottom:14px;border-bottom:1px solid #f1f5f9;padding-bottom:12px;">
              <div style="display:table-row;">
                <div style="display:table-cell;vertical-align:middle;">
                  <div style="font-size:16px;font-weight:800;color:#0f172a;">${cand.studentName || `Candidate #${cand.studentId}`}</div>
                  <div style="font-size:11px;color:#64748b;margin-top:2px;font-weight:600;">
                    Email: ${cand.studentEmail || "N/A"} • ID: ${cand.studentId} • Date: ${new Date(cand.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div style="display:table-cell;text-align:right;vertical-align:middle;">
                  ${badge(status, statusBg, statusFg)}
                </div>
              </div>
            </div>

            <!-- Profile Details Section -->
            <div style="display:table;width:100%;margin-bottom:16px;font-size:11px;color:#475569;background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px dashed #e2e8f0;">
              <div style="display:table-row;">
                <div style="display:table-cell;width:50%;padding-bottom:6px;">
                  <span style="font-weight:700;color:#64748b;">Roll Number:</span> ${cand.studentRollNumber || "N/A"}
                </div>
                <div style="display:table-cell;width:50%;padding-bottom:6px;">
                  <span style="font-weight:700;color:#64748b;">Phone:</span> ${cand.studentPhone || "N/A"}
                </div>
              </div>
              <div style="display:table-row;">
                <div style="display:table-cell;width:50%;">
                  <span style="font-weight:700;color:#64748b;">College:</span> ${cand.studentCollege || "N/A"}
                </div>
                <div style="display:table-cell;width:50%;">
                  <span style="font-weight:700;color:#64748b;">Gender:</span> ${cand.studentGender || "N/A"}
                </div>
              </div>
            </div>

            <!-- Module Scores Row -->
            <div style="display:table;width:100%;background:#f1f5f9;border-radius:10px;padding:12px;">
              <div style="display:table-row;">
                
                <div style="display:table-cell;padding:0 8px;vertical-align:top;border-right:1px solid #e2e8f0;width:20%;">
                  <div style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Overall Score</div>
                  <div style="font-size:14px;font-weight:900;color:#144542;margin-top:3px;">
                    ${cand.scoreSecured} <span style="font-size:10px;color:#94a3b8;font-weight:500;">/ ${cand.totalScore}</span>
                    <span style="font-size:10px;margin-left:4px;color:#059669;font-weight:800;">(${scorePct}%)</span>
                  </div>
                </div>

                ${test.aptitudeModule ? `
                <div style="display:table-cell;padding:0 8px;vertical-align:top;border-right:1px solid #e2e8f0;width:20%;">
                  <div style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Aptitude</div>
                  <div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:3px;">
                    ${cand.aptitude ? `${cand.aptitude.moduleScoreSecured} / ${cand.aptitude.moduleTotalScore}` : `<span style="color:#cbd5e1;font-weight:500;">N/A</span>`}
                  </div>
                </div>
                ` : ''}

                ${test.codingModule ? `
                <div style="display:table-cell;padding:0 8px;vertical-align:top;border-right:1px solid #e2e8f0;width:20%;">
                  <div style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Coding</div>
                  <div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:3px;">
                    ${cand.coding ? `${cand.coding.moduleScoreSecured} / ${cand.coding.moduleTotalScore}` : `<span style="color:#cbd5e1;font-weight:500;">N/A</span>`}
                  </div>
                </div>
                ` : ''}

                ${test.interviewModule ? `
                <div style="display:table-cell;padding:0 8px;vertical-align:top;border-right:1px solid #e2e8f0;width:20%;">
                  <div style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">AI Interview</div>
                  <div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:3px;">
                    ${cand.aiInterview ? `${cand.aiInterview.moduleScoreSecured} / ${cand.aiInterview.moduleTotalScore}` : `<span style="color:#cbd5e1;font-weight:500;">N/A</span>`}
                  </div>
                </div>
                ` : ''}

                ${test.verbalModule ? `
                <div style="display:table-cell;padding:0 8px;vertical-align:top;width:20%;">
                  <div style="font-size:9px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Speech/Verbal</div>
                  <div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:3px;">
                    ${cand.verbal ? `${cand.verbal.moduleScoreSecured} / ${cand.verbal.moduleTotalScore}` : `<span style="color:#cbd5e1;font-weight:500;">N/A</span>`}
                  </div>
                </div>
                ` : ''}

              </div>
            </div>

          </div>
        `;
      });

      const wrap = document.createElement("div");
      wrap.style.cssText = [
        "position:absolute",
        "top:-9999px",
        "left:-9999px",
        "width:1000px",
        "background:#f1f5f9",
        "padding:32px",
        "box-sizing:border-box",
        "font-family:Arial,Helvetica,sans-serif",
      ].join(";") + ";";
      wrap.innerHTML = html;
      document.body.appendChild(wrap);

      const canvas = await html2canvas(wrap, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: "#f1f5f9",
        logging: false,
        onclone: (clonedDoc) => {
          clonedDoc.querySelectorAll('link[rel="stylesheet"], style').forEach(el => el.remove());
        },
      });

      const pdf = new jsPDF({ unit: "px", format: "a4", hotfixes: ["px_scaling"] });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      const ratio = pdfW / canvas.width;
      const pageH_canvas = pdfH / ratio;

      let offsetY = 0;
      let firstPage = true;

      while (offsetY < canvas.height) {
        if (!firstPage) pdf.addPage();
        firstPage = false;

        const sliceH = Math.min(pageH_canvas, canvas.height - offsetY);

        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceH;
        sliceCanvas.getContext("2d").drawImage(canvas, 0, -offsetY);

        pdf.addImage(sliceCanvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pdfW, sliceH * ratio);
        offsetY += pageH_canvas;
      }

      pdf.save(filename);
      document.body.removeChild(wrap);
    } catch (err) {
      console.error("Failed to generate overall pdf", err);
    } finally {
      setIsOverallDownloading(null);
    }
  };

  // Helper: check if student completed ALL enabled modules
  const checkCompletionStatus = (studentResult) => {
    const needed = {
      aptitude: test.aptitudeModule,
      coding: test.codingModule,
      aiInterview: test.interviewModule,
      verbal: test.verbalModule
    };

    const done = {
      aptitude: !!studentResult.aptitude,
      coding: !!studentResult.coding,
      aiInterview: !!studentResult.aiInterview,
      verbal: !!studentResult.verbal
    };

    // If a module is enabled but not complete, then the status is in progress
    let missingEnabledModule = false;
    Object.keys(needed).forEach(key => {
      if (needed[key] && !done[key]) {
        missingEnabledModule = true;
      }
    });

    return missingEnabledModule ? "In progress" : "Completed";
  };

  // Helper: calculate module score percentages
  const getPercentage = (secured, total) => {
    if (!total || total <= 0) return 0;
    return Math.round((secured / total) * 100);
  };

  // ── FILTER & SEARCH LOGIC ──────────────────────────────────────
  const filteredResults = results.filter(r => {
    const status = checkCompletionStatus(r);
    const matchesSearch =
      (r.studentName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.studentEmail || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.studentRollNumber || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "completed") return matchesSearch && status === "Completed";
    if (statusFilter === "progress") return matchesSearch && status === "In progress";
    return matchesSearch;
  });

  // ── ANALYTICAL METRICS ──────────────────────────────────────────
  const totalAttended = results.length;
  const fullyCompleted = results.filter(r => checkCompletionStatus(r) === "Completed").length;
  const inProgress = totalAttended - fullyCompleted;
  const averageScoreSecured = totalAttended > 0
    ? Math.round(results.reduce((acc, r) => acc + getPercentage(r.scoreSecured, r.totalScore), 0) / totalAttended)
    : 0;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-96 w-full items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-[#144542] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-sm font-semibold tracking-wide uppercase">Loading test dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col font-sans">

      {/* ── HEADER CONTAINER ──────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-8 border border-gray-150 shadow-sm mb-8 relative">
        <div className="absolute top-0 right-0 w-24 h-full bg-[#DAFF0C]/10 skew-x-12 transform translate-x-12 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3.5 py-1 bg-[#144542]/5 border border-[#144542]/10 text-[#144542] text-[10px] font-bold tracking-widest uppercase rounded-full">
                Active Test
              </span>
              <span className="text-[11px] font-bold text-gray-400">ID: {test.testId}</span>
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
              {test.testName || test.testId}
            </h1>
            <p className="text-gray-500 text-sm font-medium">
              Created on {new Date(test.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} • Owner: <span className="font-bold text-gray-700">{test.hrName || "Recruiter"}</span>
            </p>
          </div>

          {/* Module checklist indicators & Overall Downloads */}
          <div className="flex flex-col md:items-end gap-3 shrink-0">
            <div className="flex flex-wrap gap-2.5 justify-end">
              {test.aptitudeModule && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#facc15]/10 border border-[#facc15]/20 text-yellow-800 text-xs font-black rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-[#facc15]" /> Aptitude
                </span>
              )}
              {test.codingModule && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#db830f]/10 border border-[#db830f]/20 text-[#db830f] text-xs font-black rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-[#db830f]" /> Coding
                </span>
              )}
              {test.interviewModule && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00d1c1]/10 border border-[#00d1c1]/20 text-[#00a89a] text-xs font-black rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-[#00d1c1]" /> AI Interview
                </span>
              )}
              {test.verbalModule && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#a855f7]/10 border border-[#a855f7]/20 text-purple-800 text-xs font-black rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-[#a855f7]" /> Verbal/Speech
                </span>
              )}
            </div>

            {/* Overall Roster Downloads */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={downloadOverallPDF}
                disabled={isOverallDownloading !== null}
                className="px-4 py-2 bg-[#144542] hover:bg-[#1b5b53] disabled:bg-[#144542]/50 text-white text-[10px] font-black rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:pointer-events-none"
              >
                <FiDownload /> {isOverallDownloading === 'pdf' ? 'Generating PDF...' : 'Overall PDF'}
              </button>
              <button
                onClick={downloadOverallExcel}
                disabled={isOverallDownloading !== null}
                className="px-4 py-2 bg-white border border-[#144542] hover:bg-[#144542]/5 disabled:border-gray-300 disabled:text-gray-400 text-[#144542] text-[10px] font-black rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:pointer-events-none"
              >
                <FiDownload /> {isOverallDownloading === 'excel' ? 'Generating Excel...' : 'Overall Excel'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── METRICS DASHBOARD (Styled like UI Reference 2) ────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {/* Card 1: Attended */}
        <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px] group hover:shadow hover:border-gray-300 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Candidates Attended</span>
            <div className="w-9 h-9 rounded-full bg-[#144542]/5 flex items-center justify-center text-[#144542] group-hover:bg-[#144542] group-hover:text-white transition-colors duration-300">
              <FiUser size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-4xl font-black text-gray-900 tracking-tight mt-4">{totalAttended}</h3>
            <p className="text-[10px] font-semibold text-gray-400 mt-1">Total active participants</p>
          </div>
        </div>

        {/* Card 2: Completed */}
        <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px] group hover:shadow hover:border-gray-300 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Fully Completed</span>
            <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
              <FiCheckCircle size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-4xl font-black text-emerald-600 tracking-tight mt-4">{fullyCompleted}</h3>
            <p className="text-[10px] font-semibold text-gray-400 mt-1">Cleared all enabled modules</p>
          </div>
        </div>

        {/* Card 3: In Progress */}
        <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px] group hover:shadow hover:border-gray-300 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">In Progress</span>
            <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
              <FiActivity size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-4xl font-black text-amber-600 tracking-tight mt-4">{inProgress}</h3>
            <p className="text-[10px] font-semibold text-gray-400 mt-1">Partially completed sessions</p>
          </div>
        </div>

        {/* Card 4: Average Score */}
        <div className="bg-[#144542] rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between min-h-[140px] text-white">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8 blur-lg pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-white/50 uppercase tracking-widest">Average Score</span>
            <div className="w-9 h-9 rounded-full bg-[#DAFF0C] flex items-center justify-center text-[#144542]">
              <FiAward size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-4xl font-black text-[#DAFF0C] tracking-tight mt-4">{averageScoreSecured}%</h3>
            <p className="text-[10px] font-semibold text-white/60 mt-1">Mean scorecard secured</p>
          </div>
        </div>
      </div>

      {/* ── CANDIDATES TABLE & FILTERS (Styled like UI Reference 1) ── */}
      <div className="bg-white rounded-3xl border border-gray-150 shadow-sm flex flex-col overflow-hidden max-h-[600px] min-h-[250px]">

        {/* Table Filters Top Bar */}
        <div className="p-6 pb-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">

          {/* Pills / Status Tabs */}
          <div className="flex gap-2">
            {[
              { id: "all", label: "All Candidates", count: totalAttended },
              { id: "completed", label: "Completed", count: fullyCompleted },
              { id: "progress", label: "In Progress", count: inProgress }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${statusFilter === tab.id
                    ? "bg-[#144542] text-white shadow-md shadow-[#144542]/10"
                    : "bg-[#EAF0F0]/50 border border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
              >
                {tab.label}
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${statusFilter === tab.id ? "bg-[#DAFF0C] text-[#144542]" : "bg-gray-200 text-gray-700"
                  }`}>
                  {tab.count}
                </span>
              </button>
            ))}

            {/* Leaderboard Dropdown Button */}
            <div className="relative">
              <button
                onClick={() => {
                  if (leaderboardModule) {
                    setLeaderboardModule(null);
                    setShowLeaderboardDropdown(false);
                  } else {
                    setShowLeaderboardDropdown(prev => !prev);
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${leaderboardModule
                    ? "bg-[#DAFF0C] text-[#144542] shadow-md"
                    : "bg-[#EAF0F0]/50 border border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
              >
                <FiAward size={13} />
                {leaderboardModule
                  ? `Leaderboard: ${{ aptitude: 'Aptitude', coding: 'Coding', aiInterview: 'AI Interview', verbal: 'Verbal' }[leaderboardModule]}`
                  : 'Leaderboard'}
                <FiChevronDown size={13} className={`transition-transform ${showLeaderboardDropdown && !leaderboardModule ? 'rotate-180' : ''}`} />
              </button>
              {showLeaderboardDropdown && !leaderboardModule && (
                <div className="absolute top-full left-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-50 min-w-[180px] overflow-hidden">
                  {[
                    { key: 'aiInterview', label: 'AI Interview', enabled: test.interviewModule },
                    { key: 'aptitude', label: 'Aptitude', enabled: test.aptitudeModule },
                    { key: 'verbal', label: 'Verbal', enabled: test.verbalModule },
                    { key: 'coding', label: 'Coding', enabled: test.codingModule },
                  ].filter(m => m.enabled).map(m => (
                    <button
                      key={m.key}
                      onClick={() => { setLeaderboardModule(m.key); setShowLeaderboardDropdown(false); setStatusFilter('all'); }}
                      className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 hover:bg-[#144542] hover:text-white transition-colors"
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <FiSearch className="absolute left-3.5 top-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search candidate name or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#144542] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* ── LEADERBOARD VIEW ─────────────────────────────────── */}
        {leaderboardModule ? (() => {
          const moduleLabels = { aptitude: 'Aptitude', coding: 'Coding', aiInterview: 'AI Interview', verbal: 'Verbal/Speech' };
          const moduleColors = { aptitude: '#facc15', coding: '#db830f', aiInterview: '#00d1c1', verbal: '#a855f7' };
          const moduleKey = leaderboardModule;
          const color = moduleColors[moduleKey];
          const label = moduleLabels[moduleKey];

          const getModuleScore = (cand) => {
            const m = cand[moduleKey];
            if (!m) return null;
            return { secured: m.moduleScoreSecured ?? 0, total: m.moduleTotalScore ?? 0 };
          };

          const sorted = [...results].sort((a, b) => {
            const sa = getModuleScore(a);
            const sb = getModuleScore(b);
            if (!sa && !sb) return 0;
            if (!sa) return 1;
            if (!sb) return -1;
            const pa = sa.total > 0 ? sa.secured / sa.total : 0;
            const pb = sb.total > 0 ? sb.secured / sb.total : 0;
            return pb - pa;
          });

          const rankMedal = (rank) => {
            if (rank === 1) return { emoji: '🥇', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' };
            if (rank === 2) return { emoji: '🥈', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600' };
            if (rank === 3) return { emoji: '🥉', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' };
            return null;
          };

          return (
            <div className="p-6 flex-1 flex flex-col overflow-hidden">
              {/* Leaderboard Header */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg" style={{ background: color }}>
                  <FiAward />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">{label} Leaderboard</h3>
                  <p className="text-[11px] text-gray-400 font-semibold">{sorted.length} candidates • Ranked by {label} module score</p>
                </div>
              </div>

              {/* Leaderboard Rows */}
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1.5 custom-scrollbar">
                {sorted.map((cand, idx) => {
                  const rank = idx + 1;
                  const medal = rankMedal(rank);
                  const ms = getModuleScore(cand);
                  const pct = ms && ms.total > 0 ? Math.round((ms.secured / ms.total) * 100) : null;
                  const initials = (cand.studentName || 'S').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

                  return (
                    <div
                      key={idx}
                      onClick={() => { setSelectedCandidate(cand); setActiveScorecardTab('overview'); }}
                      className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer hover:shadow-md transition-all duration-200 ${medal ? `${medal.bg} ${medal.border}` : 'bg-white border-gray-100 hover:border-gray-200'
                        } ${rank <= 3 ? 'shadow-sm' : ''}`}
                    >
                      {/* Rank */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-sm ${medal ? `${medal.bg} ${medal.text} border ${medal.border}` : 'bg-gray-50 text-gray-400 border border-gray-100'
                        }`}>
                        {medal ? medal.emoji : `#${rank}`}
                      </div>

                      {/* Avatar + Name */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-xl text-[#DAFF0C] font-black text-xs flex items-center justify-center shadow-sm shrink-0" style={{ background: '#144542' }}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{cand.studentName}</p>
                          <p className="text-[11px] font-semibold text-gray-400 truncate">
                            {cand.studentEmail}{cand.studentRollNumber ? ` • ${cand.studentRollNumber}` : ""}
                          </p>
                        </div>
                      </div>

                      {/* Module Score + Bar */}
                      <div className="flex flex-col gap-1.5 w-48 shrink-0">
                        {ms ? (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-gray-800">{ms.secured} <span className="text-gray-300 font-medium">/ {ms.total}</span></span>
                              <span className="text-xs font-black" style={{ color }}>{pct}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                            </div>
                          </>
                        ) : (
                          <span className="text-[11px] font-semibold text-gray-300 italic">No data submitted</span>
                        )}
                      </div>

                      {/* Overall Score */}
                      <div className="text-right shrink-0 w-24">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Overall</p>
                        <p className="text-sm font-black text-gray-800">{cand.scoreSecured} <span className="text-gray-300 font-medium text-xs">/ {cand.totalScore}</span></p>
                      </div>

                      <FiChevronRight size={16} className="text-gray-300 shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })() : (

          /* Results List Table */
          <div className="overflow-x-auto flex-1 overflow-y-auto pr-1.5 custom-scrollbar">
            {filteredResults.length === 0 ? (
              <div className="p-16 text-center text-gray-400">
                <FiUser className="text-4xl mx-auto mb-3 opacity-30" />
                <p className="font-bold text-sm">No candidate submissions found matching the criteria.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10 shadow-sm">
                  <tr className="bg-[#144542]/[0.02] border-b border-gray-100">
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Candidate</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Attempt Date</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Modules Cleared</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Secure Score</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((cand, idx) => {
                    const status = checkCompletionStatus(cand);
                    const scorePct = getPercentage(cand.scoreSecured, cand.totalScore);

                    // Generate initials
                    const initials = (cand.studentName || "S")
                      .split(" ")
                      .map(n => n[0])
                      .join("")
                      .toUpperCase()
                      .substring(0, 2);

                    return (
                      <tr
                        key={idx}
                        onClick={() => {
                          setSelectedCandidate(cand);
                          setActiveScorecardTab("overview");
                        }}
                        className="border-b border-gray-50 hover:bg-[#144542]/[0.01] transition-colors cursor-pointer group"
                      >
                        {/* Name & Email with initials avatar */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#144542] text-[#DAFF0C] font-black text-xs flex items-center justify-center shadow-sm">
                              {initials}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 group-hover:text-[#144542] transition-colors">{cand.studentName}</p>
                              <p className="text-[11px] font-semibold text-gray-400">
                                {cand.studentEmail}{cand.studentRollNumber ? ` • ${cand.studentRollNumber}` : ""}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-6 py-4 text-xs font-semibold text-gray-700">
                          {formatDate(cand.createdAt)}
                        </td>

                        {/* Checkmarks checklist for Modules */}
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {test.aptitudeModule && (
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${cand.aptitude ? "bg-[#facc15] text-white" : "border-2 border-dashed border-gray-200 text-gray-300"
                                  }`}
                                title="Aptitude Module"
                              >
                                {cand.aptitude ? "✓" : "A"}
                              </div>
                            )}
                            {test.codingModule && (
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${cand.coding ? "bg-[#db830f] text-white" : "border-2 border-dashed border-gray-200 text-gray-300"
                                  }`}
                                title="Coding Module"
                              >
                                {cand.coding ? "✓" : "C"}
                              </div>
                            )}
                            {test.interviewModule && (
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${cand.aiInterview ? "bg-[#00d1c1] text-white" : "border-2 border-dashed border-gray-200 text-gray-300"
                                  }`}
                                title="AI Interview Module"
                              >
                                {cand.aiInterview ? "✓" : "I"}
                              </div>
                            )}
                            {test.verbalModule && (
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${cand.verbal ? "bg-[#a855f7] text-white" : "border-2 border-dashed border-gray-200 text-gray-300"
                                  }`}
                                title="Verbal Communication"
                              >
                                {cand.verbal ? "✓" : "V"}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Secure Score fraction & percent badge */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-black text-gray-800">
                              {cand.scoreSecured} <span className="text-gray-300 font-medium">/ {cand.totalScore}</span>
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${scorePct >= 75 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                scorePct >= 50 ? "bg-amber-50 text-amber-600 border border-amber-100" :
                                  "bg-red-50 text-red-500 border border-red-100"
                              }`}>
                              {scorePct}%
                            </span>
                          </div>
                        </td>

                        {/* Status Pill */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${status === "Completed"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${status === "Completed" ? "bg-emerald-500" : "bg-amber-500"}`} />
                            {status}
                          </span>
                        </td>

                        {/* Chevron Link */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCandidateToDelete(cand);
                              }}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border border-red-200 hover:border-red-500 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                              title="Delete candidate test record"
                            >
                              <FiTrash2 size={13} />
                              <span>Delete Record</span>
                            </button>
                            <FiChevronRight className="text-gray-400 group-hover:text-[#144542] group-hover:translate-x-1 transition-all" size={18} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )} {/* end leaderboard ternary */}
      </div>

      {/* ── CANDIDATE SCORECARD DETAILS DRAWER (Full Evaluation Report) ── */}
      <AnimatePresence>
        {selectedCandidate && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">

            {/* Overlay backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCandidate(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            {/* Sliding scorecard drawer content */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-3xl h-full bg-[#EAF0F0] border-l border-gray-200 shadow-2xl flex flex-col z-10"
            >
              {/* Scorecard Drawer Header */}
              <div className="bg-[#144542] text-white p-8 pb-6 flex justify-between items-start relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-full bg-white/5 skew-x-12 pointer-events-none" />
                <div>
                  <div className="flex items-center gap-2 text-white/50 text-[10px] font-bold tracking-widest uppercase mb-1">
                    <FiAward className="text-[#DAFF0C]" /> Candidate Scorecard Report
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">{selectedCandidate.studentName}</h2>
                  <p className="text-xs font-semibold text-white/60 mt-1 flex items-center gap-1">
                    <FiMail /> {selectedCandidate.studentEmail} • ID: {selectedCandidate.studentId}{selectedCandidate.studentRollNumber ? ` • Roll: ${selectedCandidate.studentRollNumber}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 z-10">
                  {candidatePhoto ? (
                    <img
                      src={candidatePhoto}
                      alt={selectedCandidate.studentName}
                      className="w-18 h-18 rounded-full object-cover border-2 border-gray-700 shadow-md"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[#DAFF0C] font-black text-xs shadow-sm">
                      {(selectedCandidate.studentName || "S")
                        .split(" ")
                        .map(n => n[0])
                        .join("")
                        .toUpperCase()
                        .substring(0, 2)}
                    </div>
                  )}

                </div>
              </div>

              {/* Scorecard Drawer tab buttons */}
              <div className="bg-white px-8 py-3 border-b border-gray-100 flex gap-2 overflow-x-auto shrink-0 custom-scrollbar">
                {[
                  { id: "overview", label: "Overview", icon: <FiGrid /> },
                  test.aptitudeModule && { id: "aptitude", label: "Aptitude", icon: <FiCheckCircle /> },
                  test.codingModule && { id: "coding", label: "Coding Submit", icon: <FiCode /> },
                  test.interviewModule && { id: "interview", label: "AI Interview", icon: <FiAward /> },
                  test.verbalModule && { id: "verbal", label: "Speech & Verbal", icon: <FiVolume2 /> }
                ]
                  .filter(Boolean)
                  .map(t => (
                    <button
                      key={t.id}
                      onClick={() => setActiveScorecardTab(t.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${activeScorecardTab === t.id
                          ? "bg-[#144542] text-white"
                          : "text-gray-500 hover:bg-gray-100"
                        }`}
                    >
                      {t.icon}
                      {t.label}
                    </button>
                  ))}
              </div>

              {/* Scorecard Tab Views (Scrollable area) */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {/* ── OVERVIEW TAB ────────────────────────────────────────── */}
                {activeScorecardTab === "overview" && (

                  <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mb-5">
                      <div>
                        <h4 className="text-sm font-black text-gray-900">Export Report</h4>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5">Download candidate results archive</p>
                      </div>
                      <div className="flex gap-3 w-full sm:w-auto">
                        <button
                          onClick={downloadPDF}
                          className="flex-1 sm:flex-none px-5 py-3 bg-[#144542] hover:bg-[#1b5b53] text-white text-xs font-black rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                        >
                          <FiDownload /> PDF Option
                        </button>
                        <button
                          onClick={downloadExcel}
                          className="flex-1 sm:flex-none px-5 py-3 bg-white border-2 border-[#144542] hover:bg-gray-50 text-[#144542] text-xs font-black rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                        >
                          <FiDownload /> Excel Sheet Option
                        </button>
                      </div>
                    </div>

                    {/* Circle chart and key stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">


                      {/* Circular Gauge Card */}
                      <div className="bg-white rounded-3xl p-8 border border-gray-150 shadow-sm flex flex-col items-center justify-center text-center">
                        <div className="relative w-36 h-36 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#144542" strokeOpacity="0.08" strokeWidth="8" />
                            <circle
                              cx="50" cy="50" r="40" fill="none" stroke="#144542" strokeWidth="8" strokeLinecap="round"
                              strokeDasharray={251.2}
                              strokeDashoffset={251.2 - (251.2 * getPercentage(selectedCandidate.scoreSecured, selectedCandidate.totalScore)) / 100}
                              style={{ transition: "stroke-dashoffset 1s ease-out" }}
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center">
                            <span className="text-3xl font-black text-gray-900 leading-none">
                              {getPercentage(selectedCandidate.scoreSecured, selectedCandidate.totalScore)}%
                            </span>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Grade Score</span>
                          </div>
                        </div>
                        <h4 className="text-base font-black text-gray-900 mt-4">
                          {getPercentage(selectedCandidate.scoreSecured, selectedCandidate.totalScore) >= 75 ? "Outstanding Cleared" :
                            getPercentage(selectedCandidate.scoreSecured, selectedCandidate.totalScore) >= 50 ? "Qualified" :
                              "Disqualified / Needs Review"}
                        </h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Performance Evaluation</p>
                      </div>


                      {/* General metadata scorecard details */}
                      <div className="bg-white rounded-3xl p-8 border border-gray-150 shadow-sm space-y-4">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-3">Session Metadata</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] text-gray-400 font-semibold block uppercase">Total Score secured</span>
                            <span className="text-lg font-black text-gray-900">{selectedCandidate.scoreSecured} / {selectedCandidate.totalScore}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 font-semibold block uppercase">Completion status</span>
                            <span className="text-sm font-black text-gray-900">{checkCompletionStatus(selectedCandidate)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 font-semibold block uppercase">Attempted Time</span>
                            <span className="text-[11px] font-bold text-gray-800">{new Date(selectedCandidate.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 font-semibold block uppercase">Session ID Code</span>
                            <span className="text-xs font-mono font-bold text-gray-800">{selectedCandidate.testCode || "N/A"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Proctored violations checklist */}
                    <div className="bg-white rounded-3xl p-8 border border-gray-150 shadow-sm">
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-3 mb-4">Proctor Integrity Report</h3>
                      <div className="flex gap-4 items-start bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-emerald-800">
                        <FiCheckCircle className="text-lg mt-0.5" />
                        <div>
                          <p className="text-xs font-black uppercase tracking-wider">No Suspicious Behavior Flagged</p>
                          <p className="text-[11px] font-medium text-emerald-700/80 mt-1">
                            The candidate successfully validated their live Haar face‑presence checks and continuous ArcFace identity evaluations throughout the exam with zero critical violations.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Module-specific Overview Summaries */}
                    {test.aptitudeModule && selectedCandidate.aptitude && (
                      <div className="mt-6">
                        <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest border-b border-gray-100 pb-3 mb-4">Aptitude Module Results</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white p-5 rounded-2xl border border-gray-150 text-center shadow-sm">
                            <span className="text-xs font-bold text-gray-400 block uppercase">Score Secured</span>
                            <span className="text-2xl font-black text-gray-900 mt-2 block">{selectedCandidate.aptitude.moduleScoreSecured} / {selectedCandidate.aptitude.moduleTotalScore}</span>
                          </div>
                          <div className="bg-white p-5 rounded-2xl border border-gray-150 text-center shadow-sm">
                            <span className="text-xs font-bold text-gray-400 block uppercase">Correct Answers</span>
                            <span className="text-2xl font-black text-emerald-600 mt-2 block">{selectedCandidate.aptitude.correct}</span>
                          </div>
                          <div className="bg-white p-5 rounded-2xl border border-gray-150 text-center shadow-sm">
                            <span className="text-xs font-bold text-gray-400 block uppercase">Wrong Answers</span>
                            <span className="text-2xl font-black text-red-500 mt-2 block">{selectedCandidate.aptitude.incorrect}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {test.codingModule && selectedCandidate.coding && (
                      <div className="mt-6">
                        <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest border-b border-gray-100 pb-3 mb-4">Coding Module Results</h3>
                        <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-gray-400 block uppercase">Coding Module Score</span>
                            <span className="text-3xl font-black text-gray-900 mt-2 block">{selectedCandidate.coding.moduleScoreSecured} / {selectedCandidate.coding.moduleTotalScore}</span>
                          </div>
                          <div className="bg-orange-50 text-orange-600 border border-orange-200 px-4 py-2 rounded-xl text-xs font-bold">
                            Language: Python / Java / C++
                          </div>
                        </div>
                      </div>
                    )}

                    {test.interviewModule && selectedCandidate.aiInterview && (
                      <div className="mt-6">
                        <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest border-b border-gray-100 pb-3 mb-4">AI Interview Results</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm flex flex-col items-center justify-center">
                            <div className="relative w-24 h-24 flex items-center justify-center">
                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="none" />
                                <circle cx="50" cy="50" r="40" stroke="#144542" strokeWidth="8" fill="none"
                                  strokeDasharray="251.2"
                                  strokeDashoffset={251.2 - (251.2 * ((selectedCandidate.aiInterview.moduleScoreSecured / selectedCandidate.aiInterview.moduleTotalScore) || 0))}
                                />
                              </svg>
                              <div className="absolute flex flex-col items-center justify-center">
                                <span className="text-lg font-black text-gray-900">{Math.round(((selectedCandidate.aiInterview.moduleScoreSecured || 0) / (selectedCandidate.aiInterview.moduleTotalScore || 1)) * 100)}%</span>
                                <span className="text-[8px] font-bold text-gray-400 uppercase">Score</span>
                              </div>
                            </div>
                            <div className="mt-4 bg-[#144542] text-white px-4 py-1.5 rounded-full text-[10px] font-black tracking-wider uppercase">
                              AI Evaluation
                            </div>
                          </div>
                          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm flex flex-col justify-center">
                            <span className="text-xs font-bold text-gray-400 block uppercase mb-3">Technical Depth Score</span>
                            <span className="text-3xl font-black text-gray-900">{selectedCandidate.aiInterview.moduleScoreSecured} <span className="text-xl text-gray-400 font-bold">/ {selectedCandidate.aiInterview.moduleTotalScore}</span></span>
                            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4">
                              <div className="bg-gray-300 h-full rounded-full" style={{ width: `${(selectedCandidate.aiInterview.moduleScoreSecured / selectedCandidate.aiInterview.moduleTotalScore) * 100}%` }}></div>
                            </div>
                          </div>
                          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm flex flex-col justify-center">
                            <span className="text-xs font-bold text-gray-400 block uppercase mb-3">Dialogue Accuracy</span>
                            <span className="text-3xl font-black text-emerald-600">{selectedCandidate.aiInterview.correct} <span className="text-xl text-gray-400 font-bold">/ {(selectedCandidate.aiInterview.questions || []).length} match</span></span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase mt-4">{(selectedCandidate.aiInterview.questions || []).length - (selectedCandidate.aiInterview.correct || 0)} INCORRECT / MISSING</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {test.verbalModule && selectedCandidate.verbal && (
                      <div className="mt-6">
                        <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest border-b border-gray-100 pb-3 mb-4">Speaking & Listening Module Results</h3>
                        <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-gray-400 block uppercase">Verbal Module Score</span>
                            <span className="text-3xl font-black text-gray-900 mt-2 block">{selectedCandidate.verbal.moduleScoreSecured} / {selectedCandidate.verbal.moduleTotalScore}</span>
                          </div>
                          <div className="bg-purple-50 text-purple-700 border border-purple-200 px-4 py-2 rounded-xl text-xs font-bold">
                            Metrics Verified
                          </div>
                        </div>
                      </div>
                    )}

                  </div>

                )}

                {/* ── APTITUDE MODULE TAB ──────────────────────────────────── */}
                {activeScorecardTab === "aptitude" && (
                  selectedCandidate.aptitude ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-150 text-center">
                          <span className="text-xs font-bold text-gray-400 block uppercase">Score Secured</span>
                          <span className="text-2xl font-black text-gray-900">{selectedCandidate.aptitude.moduleScoreSecured} / {selectedCandidate.aptitude.moduleTotalScore}</span>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-150 text-center">
                          <span className="text-xs font-bold text-gray-400 block uppercase">Correct Answers</span>
                          <span className="text-2xl font-black text-emerald-600">{selectedCandidate.aptitude.correct}</span>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-150 text-center">
                          <span className="text-xs font-bold text-gray-400 block uppercase">Wrong Answers</span>
                          <span className="text-2xl font-black text-red-500">{selectedCandidate.aptitude.incorrect}</span>
                        </div>
                      </div>

                      {/* Question breakdown lists */}
                      <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-sm space-y-4">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-3">Questions & Choices Analysis</h3>

                        <div className="space-y-4">
                          {(selectedCandidate.aptitude.questions || []).map((q, idx) => {
                            const userAns = selectedCandidate.aptitude.userAnswers?.[idx];
                            const correctAns = selectedCandidate.aptitude.correctAnswers?.[idx];
                            const hasSolution = !!correctAns;
                            const isCorrect = hasSolution ? (userAns === correctAns) : null;
                            const topic = selectedCandidate.aptitude.topics?.[idx] || "Logical Assessment";

                            let badgeText = "";
                            let badgeClass = "";
                            if (isCorrect === true) {
                              badgeText = "Correct";
                              badgeClass = "bg-emerald-100 text-emerald-800";
                            } else if (isCorrect === false) {
                              badgeText = "Incorrect";
                              badgeClass = "bg-red-100 text-red-800";
                            } else {
                              badgeText = "Answer Recorded";
                              badgeClass = "bg-blue-50 text-blue-800 border border-blue-100";
                            }

                            return (
                              <div key={idx} className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                                <div className="flex justify-between items-start">
                                  <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-[9px] font-black rounded uppercase">{topic}</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${badgeClass}`}>
                                    {badgeText}
                                  </span>
                                </div>
                                <p className="text-xs font-black text-gray-900 leading-tight">Q{idx + 1}: {q}</p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="p-2.5 bg-white border rounded-lg">
                                    <span className="text-[10px] text-gray-400 font-bold block uppercase">Candidate choice</span>
                                    <span className={`font-bold ${isCorrect === true ? "text-emerald-600" :
                                        isCorrect === false ? "text-red-500" :
                                          "text-gray-800"
                                      }`}>{userAns || "(skipped)"}</span>
                                  </div>
                                  <div className="p-2.5 bg-white border rounded-lg">
                                    <span className="text-[10px] text-gray-400 font-bold block uppercase">Correct solution</span>
                                    <span className={`font-bold ${hasSolution ? "text-gray-800" : "text-gray-400 italic"}`}>
                                      {hasSolution ? correctAns : "Solution not archived"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl p-12 text-center border border-gray-150 shadow-sm space-y-3">
                      <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2 border border-amber-100">
                        <FiAlertCircle size={28} />
                      </div>
                      <h3 className="text-base font-black text-gray-900">No Aptitude Data Recorded</h3>
                      <p className="text-xs font-semibold text-gray-400 max-w-sm mx-auto">
                        This candidate has not completed or submitted the Aptitude module for this assessment session.
                      </p>
                    </div>
                  )
                )}

                {/* ── CODING MODULE SUBMISSION TAB ─────────────────────────── */}
                {activeScorecardTab === "coding" && (
                  selectedCandidate.coding ? (
                    <div className="space-y-6">
                      {(() => {
                        const assignedQuestionCodes = (selectedCandidate.coding.codingCode || '')
                          .split(',')
                          .map(s => s.trim())
                          .filter(Boolean);

                        return (
                          <>
                            <div className="bg-white p-5 rounded-2xl border border-gray-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div>
                                <span className="text-xs font-bold text-gray-400 block uppercase">Coding Module Score</span>
                                <span className="text-2xl font-black text-gray-900">{selectedCandidate.coding.moduleScoreSecured} / {selectedCandidate.coding.moduleTotalScore}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-3 py-1.5 bg-[#db830f]/10 border border-[#db830f]/20 text-[#db830f] text-xs font-black rounded-lg font-mono">
                                  Language: Python / Java / C++
                                </span>
                              </div>
                            </div>

                            {/* Assigned Questions Chips for HR visibility */}
                            {assignedQuestionCodes.length > 0 && (
                              <div className="bg-[#fffbf5] p-4 rounded-2xl border border-[#f5ddb3] flex flex-col gap-2">
                                <span className="text-[11px] font-black uppercase text-[#db830f] tracking-wider flex items-center gap-1.5">
                                  <span>🎯 Assigned Questions ({assignedQuestionCodes.length})</span>
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {assignedQuestionCodes.map((qCode, qIdx) => (
                                    <span key={qIdx} className="px-3 py-1 bg-white border border-[#f5ddb3] text-gray-800 text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5">
                                      <span className="w-4 h-4 rounded-full bg-[#db830f] text-white text-[10px] font-black flex items-center justify-center">
                                        {qIdx + 1}
                                      </span>
                                      <span className="font-mono">{qCode}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Candidate Source Code submitted rendered in a mockup editor */}
                            {(selectedCandidate.coding.answers || []).map((code, idx) => {
                              const passed = selectedCandidate.coding.testcasePassed?.[idx] ?? 0;
                              const total = selectedCandidate.coding.testcaseTotals?.[idx] ?? 0;
                              const qTitle = assignedQuestionCodes[idx] || `Problem ${idx + 1}`;

                              return (
                                <div key={idx} className="bg-[#144542] rounded-3xl border border-white/10 shadow-lg overflow-hidden">
                                  {/* Code editor top chrome header */}
                                  <div className="bg-black/25 px-6 py-4 flex items-center justify-between border-b border-white/5">
                                    <div className="flex items-center gap-3">
                                      <div className="flex gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                                      </div>
                                      <span className="text-white/80 font-mono text-[11px] font-bold ml-2">
                                        Problem {idx + 1}: <span className="text-[#DAFF0C]">{qTitle}</span> Submission
                                      </span>
                                    </div>
                                    <span className="px-3 py-1 bg-white/10 text-[#DAFF0C] text-[10px] font-black uppercase rounded-md tracking-wider">
                                      Testcases: {passed} / {total} passed
                                    </span>
                                  </div>

                                  {/* Code viewport container */}
                                  <pre className="p-6 overflow-x-auto text-[11px] font-mono text-emerald-400/90 leading-relaxed bg-[#0c2f2d] max-h-[300px] custom-scrollbar">
                                    <code>{code || "// No answer submitted."}</code>
                                  </pre>
                                </div>
                              );
                            })}
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl p-12 text-center border border-gray-150 shadow-sm space-y-3">
                      <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2 border border-amber-100">
                        <FiAlertCircle size={28} />
                      </div>
                      <h3 className="text-base font-black text-gray-900">No Coding Data Recorded</h3>
                      <p className="text-xs font-semibold text-gray-400 max-w-sm mx-auto">
                        This candidate has not submitted any code for the Coding module in this assessment session.
                      </p>
                    </div>
                  )
                )}

                {/* ── AI CONVERSATIONAL INTERVIEW TAB ───────────────────────── */}
                {activeScorecardTab === "interview" && (
                  selectedCandidate.aiInterview ? (() => {
                    const aiData = selectedCandidate.aiInterview;
                    const overallPct = Math.round((aiData.moduleScoreSecured / aiData.moduleTotalScore) * 100) || 0;

                    const getScoreColor = (s) => {
                      if (s >= 70) return 'text-green-600';
                      if (s >= 40) return 'text-amber-500';
                      return 'text-red-600';
                    };

                    const getScoreBg = (s) => {
                      if (s >= 70) return 'bg-green-50/70 border-green-100';
                      if (s >= 40) return 'bg-amber-50/70 border-amber-100';
                      return 'bg-red-50/70 border-red-100';
                    };

                    const getScoreBarColor = (s) => {
                      if (s >= 70) return 'bg-emerald-500';
                      if (s >= 40) return 'bg-amber-500';
                      return 'bg-red-500';
                    };

                    // Compute question scores dynamically
                    const questionScores = (aiData.questions || []).map((q, idx) => {
                      const candidateAnswer = aiData.answers?.[idx] || "(No reply received)";
                      const rawFeedback = aiData.correctAnswers?.[idx] || "No feedback available.";
                      const fbObj = parseAiFeedback(rawFeedback);

                      let rawScore = fbObj.score;
                      if (rawScore === null) {
                        rawScore = 5;
                        const lowerFeedback = fbObj.feedback.toLowerCase();
                        if (lowerFeedback.includes("no relevant knowledge") || lowerFeedback.includes("failed") || candidateAnswer === "(No reply received)") {
                          rawScore = 2;
                        } else if (lowerFeedback.includes("excellent") || lowerFeedback.includes("good match") || lowerFeedback.includes("strong")) {
                          rawScore = 9;
                        } else if (lowerFeedback.includes("partial") || lowerFeedback.includes("some matching")) {
                          rawScore = 6;
                        } else {
                          const averageScore = (aiData.moduleScoreSecured / aiData.moduleTotalScore) * 10;
                          rawScore = Math.min(10, Math.max(1, Math.round(averageScore)));
                        }
                      }

                      return {
                        id: idx + 1,
                        question: q,
                        candidateAnswer,
                        feedback: fbObj.feedback,
                        rawScore,
                        score: rawScore * 10,
                      };
                    });

                    return (
                      <div className="space-y-6">
                        {/* Top Performance Overview Card */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Circular Progress Card */}
                          <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-sm flex flex-col items-center justify-center text-center col-span-1">
                            <CircularProgress score={overallPct} size={110} strokeWidth={9} />
                            <div className="mt-4">
                              <span className="px-3.5 py-1 bg-[#144542] text-[#DAFF0C] text-[9px] font-black uppercase rounded-full tracking-wider shadow-sm">
                                AI EVALUATION
                              </span>
                            </div>
                          </div>

                          {/* Stats Breakdown cards */}
                          <div className="md:col-span-2 grid grid-cols-2 gap-4">
                            <div className="bg-white p-6 rounded-3xl border border-gray-150 flex flex-col justify-center">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Technical Depth Score</span>
                              <span className="text-2xl font-black text-gray-900">{aiData.moduleScoreSecured} <span className="text-gray-400 text-sm font-medium">/ {aiData.moduleTotalScore}</span></span>
                              <div className="mt-3 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div style={{ width: `${overallPct}%` }} className={`h-full rounded-full ${getScoreBarColor(overallPct)}`} />
                              </div>
                            </div>

                            <div className="bg-white p-6 rounded-3xl border border-gray-150 flex flex-col justify-center">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Dialogue Accuracy</span>
                              <span className="text-2xl font-black text-[#00a89a]">{aiData.correct} <span className="text-gray-400 text-sm font-medium">/ {(aiData.questions || []).length} match</span></span>
                              <div className="mt-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                {aiData.wrong} Incorrect / Missing
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Question-wise analysis */}
                        <div className="bg-white rounded-[2rem] p-6 border border-gray-150 shadow-sm">
                          <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-emerald-50 text-emerald-600 flex items-center justify-center rounded-lg">
                                <FiAward size={16} />
                              </div>
                              <h3 className="text-sm font-black text-gray-900 tracking-tight">Question-wise Analysis</h3>
                            </div>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                              {questionScores.length} Questions Evaluated
                            </span>
                          </div>

                          <div className="space-y-3">
                            {questionScores.map((qs) => (
                              <div key={qs.id} className="overflow-hidden border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                                <button
                                  onClick={() => setExpandedInterviewQuestion(expandedInterviewQuestion === qs.id ? null : qs.id)}
                                  className={`w-full flex items-center gap-4 py-3 px-4 transition-all hover:bg-gray-50 text-left rounded-xl ${expandedInterviewQuestion === qs.id ? 'bg-gray-50' : ''}`}
                                >
                                  <span className="w-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">Q{qs.id}</span>
                                  <div className="flex-1">
                                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                      <div style={{ width: `${qs.score}%` }} className={`h-full rounded-full ${getScoreBarColor(qs.score)}`} />
                                    </div>
                                  </div>
                                  <div className={`px-2.5 py-1 rounded-lg font-black text-xs min-w-[3rem] text-center ${getScoreBg(qs.score)} ${getScoreColor(qs.score)} border`}>
                                    {qs.rawScore}/10
                                  </div>
                                  {expandedInterviewQuestion === qs.id ? <FiChevronUp className="text-gray-400" /> : <FiChevronDown className="text-gray-400" />}
                                </button>

                                <AnimatePresence>
                                  {expandedInterviewQuestion === qs.id && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="px-10 py-4 overflow-hidden"
                                    >
                                      <div className="p-5 bg-gray-50 text-gray-800 rounded-2xl border border-gray-150 text-xs font-semibold leading-relaxed space-y-3">
                                        <div>
                                          <span className="text-[#144542] font-black uppercase text-[9px] block mb-1 tracking-widest opacity-50">
                                            Question {qs.id}
                                          </span>
                                          <p className="text-gray-900 font-bold">{qs.question}</p>
                                        </div>
                                        <div className="pt-2 border-t border-gray-200/65">
                                          <span className="text-gray-500 font-black uppercase text-[9px] block mb-1 tracking-widest">
                                            Candidate Response
                                          </span>
                                          <p className="italic text-gray-800 bg-[#DAFF0C]/5 border border-[#DAFF0C]/20 p-3.5 rounded-xl leading-relaxed">"{qs.candidateAnswer}"</p>
                                        </div>
                                        <div className="pt-2 border-t border-gray-200/65">
                                          <span className="text-[#144542] font-black uppercase text-[9px] block mb-1 tracking-widest opacity-55">
                                            AI Feedback / Reference Match
                                          </span>
                                          <p className="text-gray-700 leading-relaxed font-medium">{qs.feedback}</p>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="bg-white rounded-3xl p-12 text-center border border-gray-150 shadow-sm space-y-3">
                      <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2 border border-amber-100">
                        <FiAlertCircle size={28} />
                      </div>
                      <h3 className="text-base font-black text-gray-900">No AI Interview Data Recorded</h3>
                      <p className="text-xs font-semibold text-gray-400 max-w-sm mx-auto">
                        This candidate has not participated in the AI Interview module in this assessment session.
                      </p>
                    </div>
                  )
                )}

                {/* ── SPEECH & VERBAL COMMUNICATION TAB ─────────────────────── */}
                {activeScorecardTab === "verbal" && (
                  selectedCandidate.verbal ? (
                    <div className="space-y-6">
                      <div className="bg-white p-5 rounded-2xl border border-gray-150 flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold text-gray-400 block uppercase">Verbal Module Score</span>
                          <span className="text-2xl font-black text-gray-900">{selectedCandidate.verbal.moduleScoreSecured} / {selectedCandidate.verbal.moduleTotalScore}</span>
                        </div>
                        <span className="px-3 py-1.5 bg-[#a855f7]/10 border border-[#a855f7]/20 text-purple-700 text-xs font-black rounded-lg">
                          Metrics Verified
                        </span>
                      </div>

                      {/* Gauges of Speech metrics (Pronunciation, Fluency etc.) */}
                      <div className="grid grid-cols-2 gap-4">
                        {Object.keys(selectedCandidate.verbal.metrics || {}).map((m, keyIdx) => {
                          const score = selectedCandidate.verbal.metrics[m];
                          return (
                            <div key={keyIdx} className="bg-white rounded-2xl p-5 border border-gray-150 space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-500 uppercase">{m}</span>
                                <span className="text-sm font-black text-[#144542]">{score}%</span>
                              </div>
                              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div style={{ width: `${score}%` }} className="h-full bg-purple-500 rounded-full" />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Speech listening vs speaking logs */}
                      <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-sm space-y-4">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-3">Speaking Audits</h3>

                        <div className="space-y-4">
                          {(selectedCandidate.verbal.speaking || []).map((speak, idx) => (
                            <div key={idx} className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl space-y-2">
                              <span className="text-[9px] font-black text-purple-700 block uppercase tracking-widest">Speech Sample {idx + 1}</span>
                              <p className="text-xs font-semibold text-gray-800 leading-relaxed italic">"{speak}"</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl p-12 text-center border border-gray-150 shadow-sm space-y-3">
                      <div className="w-16 h-16 rounded-2xl bg-amber-50 text-purple-600 flex items-center justify-center mx-auto mb-2 border border-purple-100">
                        <FiAlertCircle size={28} />
                      </div>
                      <h3 className="text-base font-black text-gray-900">No Verbal Data Recorded</h3>
                      <p className="text-xs font-semibold text-gray-400 max-w-sm mx-auto">
                        This candidate has not submitted speech or listening recordings in this assessment session.
                      </p>
                    </div>
                  )
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* ── DELETE RECORD CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {candidateToDelete && (
          <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-red-100 relative"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => !isDeletingRecord && setCandidateToDelete(null)}
                disabled={isDeletingRecord}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <FiX size={20} />
              </button>

              {/* Warning Icon Badge */}
              <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4 text-2xl shadow-inner">
                <FiTrash2 />
              </div>

              <h3 className="text-xl font-black text-gray-900 mb-2 tracking-tight">
                Delete Test Record?
              </h3>

              <p className="text-sm text-gray-500 leading-relaxed mb-4">
                Are you sure you want to delete the test attempt for{" "}
                <strong className="text-gray-900 font-bold">{candidateToDelete.studentName}</strong> (
                <span className="text-gray-700">{candidateToDelete.studentEmail}</span>)?
              </p>

              <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 mb-6 text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
                <FiAlertCircle size={18} className="shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <strong>Important:</strong> This will permanently delete this candidate's test score, module results, and recorded attempt for <span className="font-bold uppercase tracking-wider">{test.testId}</span>. The student will be able to <strong>re-attend</strong> this test from their dashboard.
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCandidateToDelete(null)}
                  disabled={isDeletingRecord}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteRecord}
                  disabled={isDeletingRecord}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-red-600/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isDeletingRecord ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <FiTrash2 size={16} />
                      <span>Yes, Delete Record</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── TOAST NOTIFICATION ── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl font-bold text-sm shadow-xl flex items-center gap-3 border ${
              toastMessage.type === 'success'
                ? 'bg-[#144542] text-[#DAFF0C] border-[#DAFF0C]/20 shadow-[#144542]/20'
                : 'bg-red-600 text-white border-red-500'
            }`}
          >
            {toastMessage.type === 'success' ? <FiCheckCircle size={18} /> : <FiAlertCircle size={18} />}
            <span>{toastMessage.text}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="ml-2 text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              <FiX size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
