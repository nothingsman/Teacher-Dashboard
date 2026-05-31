"use client";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Download, Edit, ClipboardList, Check, X, Table2 } from "lucide-react";
import {
  getAssessmentsForContext,
  type Assessment,
} from "../services/assessmentsService";
import {
  getResultsByAssessment,
  bulkGrade,
  type AssessmentResult,
} from "../services/assessmentResultsService";
import { getStudentsBySectionId, type Student } from "../services/studentsService";
import type { TeacherSection } from "../services/teacherSectionsService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const escapeCSV = (val: string | number): string => {
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const getGradePill = (pct: number) => {
  if (pct >= 90) return { label: "A", bg: "bg-emerald-50", text: "text-emerald-800" };
  if (pct >= 75) return { label: "B", bg: "bg-blue-50", text: "text-blue-800" };
  if (pct >= 50) return { label: "C", bg: "bg-amber-50", text: "text-amber-700" };
  return { label: "F", bg: "bg-red-50", text: "text-red-700" };
};

const getScoreColor = (pct: number) => {
  if (pct >= 90) return "text-green-700";
  if (pct >= 75) return "text-blue-700";
  if (pct >= 50) return "text-amber-700";
  return "text-red-600";
};

const getBarColor = (pct: number) => {
  if (pct >= 90) return "bg-emerald-500";
  if (pct >= 75) return "bg-blue-600";
  if (pct >= 50) return "bg-amber-400";
  return "bg-red-500";
};

const getNameColor = (name: string) => {
  const colors = [
    ["bg-blue-100", "text-blue-700"],
    ["bg-purple-100", "text-purple-700"],
    ["bg-amber-100", "text-amber-700"],
    ["bg-red-100", "text-red-700"],
    ["bg-emerald-100", "text-emerald-700"],
    ["bg-rose-100", "text-rose-700"],
  ];
  const hash = name.split("").reduce((a, c) => c.charCodeAt(0) + a, 0);
  return colors[hash % colors.length];
};

const MetricCard = ({
  label,
  value,
  subtitle,
  colorClass,
}: {
  label: string;
  value: string | number;
  subtitle: string;
  colorClass: string;
}) => (
  <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
      {label}
    </p>
    <h3 className={`text-2xl font-mono font-bold ${colorClass} mt-1`}>{value}</h3>
    <p className="text-[10px] font-medium text-slate-400 mt-1">{subtitle}</p>
  </div>
);

const statusLabel: Record<string, { label: string; bg: string; text: string }> = {
  GRADED: { label: "Graded", bg: "bg-emerald-50", text: "text-emerald-700" },
  SUBMITTED: { label: "Submitted", bg: "bg-blue-50", text: "text-blue-700" },
  LATE: { label: "Late", bg: "bg-amber-50", text: "text-amber-700" },
  MISSING: { label: "Missing", bg: "bg-red-50", text: "text-red-600" },
  PENDING: { label: "Pending", bg: "bg-slate-100", text: "text-slate-500" },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface GradebookModuleProps {
  defaultGrade?: string;
  defaultSection?: string;
  activeSection?: TeacherSection;
  selectedSubject?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const GradebookModule: React.FC<GradebookModuleProps> = ({
  activeSection,
  selectedSubject,
}) => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [dirtyScores, setDirtyScores] = useState<Record<string, number | null>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"per-assessment" | "summary">("per-assessment");
  const [summaryResults, setSummaryResults] = useState<Record<string, AssessmentResult[]>>({});
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Build context from props (same pattern as TasksModule)
  const context = useMemo(() => {
    if (!activeSection) return undefined;
    const subject = activeSection.subjects.find(
      (s) => s.subjectName === selectedSubject,
    );
    if (!subject) return undefined;
    return {
      sectionId: activeSection.sectionId,
      subjectId: subject.subjectId,
      academicYearId: activeSection.academicYearId,
    };
  }, [activeSection, selectedSubject]);

  // Reset state when section or subject changes
  useEffect(() => {
    setSelectedAssessmentId(null);
    setResults([]);
    setDirtyScores({});
    setIsEditMode(false);
    setEditingStudentId(null);
  }, [activeSection?.sectionId, selectedSubject]);

  // Fetch assessments for this section/subject
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        if (!context) {
          if (!cancelled) setAssessments([]);
          return;
        }
        const data = await getAssessmentsForContext(context);
        // Only PUBLISHED assessments appear in gradebook — no DRAFT or CLOSED
        const filtered = data.filter(
          (a) => a.status === "PUBLISHED" && a.taskType !== "HOMEWORK",
        );
        if (!cancelled) setAssessments(filtered);
      } catch {
        // keep empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [context]);

  // Fetch section students
  useEffect(() => {
    if (!activeSection) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getStudentsBySectionId(
          activeSection.sectionId,
          activeSection.academicYearId,
        );
        if (!cancelled) setStudents(data);
      } catch {
        // keep empty
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSection]);

  // Fetch results when assessment changes
  useEffect(() => {
    if (!selectedAssessmentId) {
      setResults([]);
      setDirtyScores({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await getResultsByAssessment(selectedAssessmentId);
        if (!cancelled) {
          setResults(data);
          setDirtyScores({});
        }
      } catch {
        if (!cancelled) setResults([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedAssessmentId]);

  // Fetch results for ALL assessments when in summary mode
  useEffect(() => {
    if (viewMode !== "summary" || assessments.length === 0) return;
    let cancelled = false;
    setSummaryLoading(true);
    (async () => {
      const map: Record<string, AssessmentResult[]> = {};
      for (const a of assessments) {
        if (cancelled) return;
        try {
          const data = await getResultsByAssessment(a.id);
          map[a.id] = data;
        } catch {
          map[a.id] = [];
        }
      }
      if (!cancelled) {
        setSummaryResults(map);
        setSummaryLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [viewMode, assessments]);

  // Auto-select first assessment on load
  useEffect(() => {
    if (!selectedAssessmentId && assessments.length > 0) {
      setSelectedAssessmentId(assessments[0].id);
    }
  }, [assessments, selectedAssessmentId]);

  const selectedAssessment = useMemo(
    () => assessments.find((a) => a.id === selectedAssessmentId),
    [assessments, selectedAssessmentId],
  );

  const maxScore = selectedAssessment
    ? Number(selectedAssessment.totalMarks) || 100
    : 100;

  // Build student rows merging students + results
  const studentRows = useMemo(() => {
    if (!selectedAssessment || students.length === 0) return [];

    return students.map((student) => {
      const result = results.find((r) => r.student === student.id);
      const apiResult = results.find((r) => r.student_name === student.name);
      const match = result || apiResult;

      const obtainedMarks = match?.obtained_marks;
      const submissionStatus = match?.submission_status;

      const dirtyScore =
        student.id in dirtyScores ? dirtyScores[student.id] : undefined;
      const score =
        dirtyScore !== undefined
          ? dirtyScore
          : obtainedMarks !== null && obtainedMarks !== undefined
            ? Number(obtainedMarks)
            : null;

      const submitted = submissionStatus === "GRADED" || submissionStatus === "SUBMITTED" || submissionStatus === "LATE";
      const pct = score !== null && maxScore > 0 ? Math.round((score / maxScore) * 100) : null;
      const grade = pct !== null ? getGradePill(pct) : null;
      const status = submissionStatus || (score !== null ? "GRADED" : "PENDING");

      return {
        id: student.id,
        name: student.name,
        rollNo: student.rollNo || match?.student_roll_no || "",
        score,
        max: maxScore,
        pct,
        grade,
        submitted,
        status,
      };
    });
  }, [students, results, selectedAssessment, dirtyScores, maxScore]);

  // Class stats
  const classStats = useMemo(() => {
    if (!selectedAssessment) return null;
    const scored = studentRows.filter((s) => s.score !== null);
    const avg =
      scored.length > 0
        ? scored.reduce((a, s) => a + (s.pct ?? 0), 0) / scored.length
        : 0;
    const avgRaw =
      scored.length > 0
        ? scored.reduce((a, s) => a + (s.score ?? 0), 0) / scored.length
        : 0;
    const top = scored.reduce(
      (best: (typeof studentRows)[number] | null, s) =>
        s.score !== null && (best === null || s.score > (best.score ?? 0)) ? s : best,
      null,
    );
    const below50 = scored.filter((s) => (s.pct ?? 0) < 50).length;
    const missing = studentRows.filter((s) => !s.submitted).length;
    return { avg, avgRaw, top, below50, missing, gradedCount: scored.length };
  }, [studentRows, selectedAssessment]);

  // Score edit handler
  const handleScoreChange = useCallback(
    (studentId: string, value: string) => {
      const num = value === "" ? null : Math.max(0, Math.min(maxScore, parseFloat(value)));
      setDirtyScores((prev) => ({ ...prev, [studentId]: num }));
    },
    [maxScore],
  );

  // Save all dirty grades
  const handleSaveGrades = async () => {
    if (!selectedAssessment) return;
    setSaving(true);
    try {
      const items = Object.entries(dirtyScores).map(([studentId, score]) => ({
        student: studentId,
        obtained_marks: score,
        submission_status: score !== null ? ("GRADED" as const) : ("MISSING" as const),
      }));
      if (items.length === 0) return;
      await bulkGrade({
        assessment: selectedAssessment.id,
        results: items,
      });
      const updated = await getResultsByAssessment(selectedAssessment.id);
      setResults(updated);
      setDirtyScores({});
      setIsEditMode(false);
      setEditingStudentId(null);
    } catch {
      // handle error silently
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setDirtyScores({});
    setIsEditMode(false);
    setEditingStudentId(null);
  };

  // Summary matrix: students x assessments
  const summaryRows = useMemo(() => {
    if (viewMode !== "summary" || students.length === 0 || assessments.length === 0) return [];

    return students.map((student) => {
      const cols = assessments.map((a) => {
        const results = summaryResults[a.id] || [];
        const match = results.find(
          (r) => r.student === student.id || r.student_name === student.name,
        );
        const score = match?.obtained_marks !== null && match?.obtained_marks !== undefined
          ? Number(match.obtained_marks)
          : null;
        const max = Number(a.totalMarks) || 100;
        return { score, max, assessmentId: a.id };
      });

      let totalScore = 0;
      let totalMax = 0;
      let scoredCount = 0;
      cols.forEach((c) => {
        if (c.score !== null) {
          totalScore += c.score;
          totalMax += c.max;
          scoredCount++;
        }
      });

      const pct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : null;

      return {
        id: student.id,
        name: student.name,
        rollNo: student.rollNo || "",
        cols,
        totalScore: scoredCount > 0 ? totalScore : null,
        totalMax,
        pct,
        grade: pct !== null ? getGradePill(pct) : null,
      };
    });
  }, [viewMode, students, assessments, summaryResults]);

  // Summary-level analytics
  const summaryStats = useMemo(() => {
    if (summaryRows.length === 0) return null;
    const scored = summaryRows.filter((s) => s.pct !== null);
    const avg =
      scored.length > 0
        ? scored.reduce((a, s) => a + (s.pct ?? 0), 0) / scored.length
        : 0;
    const top = scored.reduce(
      (best: (typeof summaryRows)[number] | null, s) =>
        s.pct !== null && (best === null || (s.pct ?? 0) > (best.pct ?? 0)) ? s : best,
      null,
    );
    const below50 = scored.filter((s) => (s.pct ?? 0) < 50).length;
    const noScores = summaryRows.filter((s) => s.totalScore === null).length;
    return { avg, top, below50, noScores, gradedCount: scored.length };
  }, [summaryRows]);

  // Submission % for activity card
  const taskSubmissionPct = (actId: string) => {
    const actResults = results.filter((r) => r.assessment === actId);
    if (actResults.length === 0) return 0;
    const scored = actResults.filter(
      (r) =>
        r.submission_status === "GRADED" ||
        (r.obtained_marks !== null && r.obtained_marks !== undefined),
    ).length;
    return Math.round((scored / Math.max(actResults.length, 1)) * 100);
  };

  const handleExportCSV = () => {
    const rows: string[][] = [];

    if (viewMode === "summary" && summaryRows.length > 0) {
      const headers = ["Student Name", "Roll No", ...assessments.map((a) => a.title), "Total", "Percentage", "Grade"];
      rows.push(headers);

      summaryRows.forEach((s) => {
        const scores = s.cols.map((c) => (c.score !== null ? String(c.score) : "—"));
        rows.push([
          s.name,
          s.rollNo || "—",
          ...scores,
          s.totalScore !== null ? `${s.totalScore}/${s.totalMax}` : "—",
          s.pct !== null ? `${s.pct}%` : "—",
          s.grade?.label || "—",
        ]);
      });

      const BOM = "\uFEFF";
      const csvContent = rows.map((row) => row.map(escapeCSV).join(",")).join("\r\n");
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `gradebook-summary.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    if (!selectedAssessment || studentRows.length === 0) return;

    rows.push([
      "Student Name",
      "Roll No",
      `Score /${maxScore}`,
      "Percentage",
      "Grade",
      "Status",
    ]);

    studentRows.forEach((s) => {
      rows.push([
        s.name,
        s.rollNo || "—",
        s.score !== null ? String(s.score) : "—",
        s.pct !== null ? `${s.pct}%` : "—",
        s.grade?.label || "—",
        statusLabel[s.status]?.label || s.status,
      ]);
    });

    rows.push([
      "Class Average",
      "",
      classStats ? classStats.avgRaw.toFixed(1) : "—",
      classStats ? `${Math.round(classStats.avg)}%` : "—",
      classStats ? getGradePill(Math.round(classStats.avg)).label : "—",
      "",
    ]);

    const BOM = "\uFEFF";
    const csvContent = rows
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const label = selectedAssessment.title.replace(/\s+/g, "-").toLowerCase();
    link.download = `gradebook-${label}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-5 animate-pulse">
        <div className="h-10 bg-slate-100 rounded-xl w-1/3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-slate-50 rounded-xl" />
          ))}
        </div>
        <div className="h-32 bg-slate-50 rounded-xl" />
        <div className="h-64 bg-slate-50 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-5">
      {/* ── TOP CONTROLS ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 bg-white hover:bg-slate-50 transition-colors"
          >
            <Download size={15} /> Export CSV
          </button>
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("per-assessment")}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-md transition-all ${
                viewMode === "per-assessment"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Per Assessment
            </button>
            <button
              onClick={() => setViewMode("summary")}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-md transition-all ${
                viewMode === "summary"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Table2 size={13} className="inline mr-1" />
              Summary
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditMode && (
            <button
              onClick={handleCancelEdit}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all"
            >
              <X size={15} /> Cancel
            </button>
          )}
          <button
            onClick={isEditMode ? handleSaveGrades : () => setIsEditMode(true)}
            disabled={saving}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-all ${
              isEditMode
                ? "bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
                : "bg-[#1a237e] hover:bg-blue-900"
            }`}
          >
            {isEditMode ? (
              <>
                <Check size={15} /> {saving ? "Saving…" : "Save Grades"}
              </>
            ) : (
              <>
                <Edit size={15} /> Enter Grades
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── METRIC CARDS ── */}
      {viewMode === "per-assessment" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricCard
            label="Students"
            value={students.length}
            subtitle="in section"
            colorClass="text-blue-600"
          />
          <MetricCard
            label="Task Avg"
            value={classStats ? `${Math.round(classStats.avg)}%` : "—"}
            subtitle={selectedAssessment?.title || "this activity"}
            colorClass={
              classStats
                ? classStats.avg >= 75
                  ? "text-emerald-600"
                  : classStats.avg >= 50
                    ? "text-amber-500"
                    : "text-red-500"
                : "text-slate-400"
            }
          />
          <MetricCard
            label="Top Score"
            value={
              classStats?.top
                ? `${classStats.top.score}/${maxScore}`
                : "—"
            }
            subtitle={classStats?.top?.name ?? "—"}
            colorClass="text-emerald-600"
          />
          <MetricCard
            label="Below 50%"
            value={classStats?.below50 ?? "—"}
            subtitle="need attention"
            colorClass="text-red-500"
          />
          <MetricCard
            label="Missing"
            value={classStats?.missing ?? "—"}
            subtitle="not submitted"
            colorClass="text-amber-500"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricCard
            label="Students"
            value={students.length}
            subtitle="in section"
            colorClass="text-blue-600"
          />
          <MetricCard
            label="Overall Avg"
            value={summaryStats ? `${Math.round(summaryStats.avg)}%` : "—"}
            subtitle={`across ${assessments.length} activities`}
            colorClass={
              summaryStats
                ? summaryStats.avg >= 75
                  ? "text-emerald-600"
                  : summaryStats.avg >= 50
                    ? "text-amber-500"
                    : "text-red-500"
                : "text-slate-400"
            }
          />
          <MetricCard
            label="Top Student"
            value={summaryStats?.top?.name ?? "—"}
            subtitle={summaryStats?.top ? `${summaryStats.top.pct}%` : "—"}
            colorClass="text-emerald-600"
          />
          <MetricCard
            label="Below 50%"
            value={summaryStats?.below50 ?? "—"}
            subtitle="need attention"
            colorClass="text-red-500"
          />
          <MetricCard
            label="No Scores"
            value={summaryStats?.noScores ?? "—"}
            subtitle="not yet graded"
            colorClass="text-amber-500"
          />
        </div>
      )}

      {/* ── ACTIVITY SELECTOR STRIP ── */}
      {viewMode === "per-assessment" && (
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Select Activity
          </span>
          <span className="text-[10px] text-slate-400">
            {assessments.length} activities
          </span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {assessments.map((act) => {
              const isActive = act.id === selectedAssessmentId;
              const subPct = taskSubmissionPct(act.id);
              return (
                <button
                  key={act.id}
                  onClick={() => {
                    setSelectedAssessmentId(act.id);
                    setIsEditMode(false);
                    setDirtyScores({});
                  }}
                  className={`flex flex-col gap-1.5 p-3 rounded-xl border flex-shrink-0 min-w-[140px] text-left transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#1a237e] border-[#1a237e] shadow-md shadow-blue-900/20"
                      : "bg-white border-slate-200 hover:border-[#1a237e] hover:bg-blue-50/20"
                  }`}
                >
                  <span
                    className={`self-start text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      isActive
                        ? "bg-white/15 text-white/70"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {act.taskTypeDisplay || act.taskType}
                  </span>
                  <span
                    className={`text-xs font-medium leading-tight ${
                      isActive ? "text-white" : "text-slate-800"
                    }`}
                  >
                    {act.title}
                  </span>
                  <span
                    className={`text-[10px] ${
                      isActive ? "text-white/50" : "text-slate-400"
                    }`}
                  >
                    Max {act.totalMarks || maxScore} pts ·{" "}
                    {
                      results.filter((r) => {
                        if (r.assessment !== act.id) return false;
                        return (
                          r.submission_status === "GRADED" ||
                          (r.obtained_marks !== null && r.obtained_marks !== undefined)
                        );
                      }).length
                    }
                    /{students.length} graded
                  </span>
                  <div
                    className={`h-1 rounded-full overflow-hidden ${
                      isActive ? "bg-white/20" : "bg-slate-100"
                    }`}
                  >
                    <div
                      className={`h-full rounded-full transition-all ${
                        isActive
                          ? "bg-white/60"
                          : subPct === 100
                            ? "bg-emerald-500"
                            : subPct >= 50
                              ? "bg-amber-400"
                              : "bg-red-400"
                      }`}
                      style={{ width: `${subPct}%` }}
                    />
                  </div>
                </button>
              );
            })}
        </div>
      </div>
      )}

      {/* ── SUMMARY TABLE ── */}
      {viewMode === "summary" && (
        <>
          {summaryLoading ? (
            <div className="bg-white border border-slate-100 rounded-xl flex flex-col items-center justify-center py-16 shadow-sm animate-pulse">
              <div className="h-6 w-48 bg-slate-100 rounded mb-3" />
              <div className="h-4 w-64 bg-slate-50 rounded" />
            </div>
          ) : assessments.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-xl flex flex-col items-center justify-center py-16 shadow-sm">
              <ClipboardList size={36} className="text-slate-300 mb-3" />
              <p className="text-sm text-slate-400">
                No published assessments to summarise
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-3 min-w-[160px] sticky left-0 bg-slate-50">
                        Student
                      </th>
                      {assessments.map((a) => (
                        <th
                          key={a.id}
                          className="text-center text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 py-3 min-w-[80px] max-w-[100px]"
                        >
                          <span className="truncate block">{a.title}</span>
                          <span className="text-[8px] text-slate-300 font-medium">
                            /{a.totalMarks || 100}
                          </span>
                        </th>
                      ))}
                      <th className="text-center text-[10px] font-black uppercase tracking-widest text-slate-700 px-3 py-3 min-w-[90px] bg-slate-100/50">
                        Total
                      </th>
                      <th className="text-center text-[10px] font-black uppercase tracking-widest text-slate-700 px-3 py-3 min-w-[80px] bg-slate-100/50">
                        %
                      </th>
                      <th className="text-center text-[10px] font-black uppercase tracking-widest text-slate-700 px-3 py-3 min-w-[60px] bg-slate-100/50">
                        Grade
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.map((s) => {
                      const [avatarBg, avatarText] = getNameColor(s.name);
                      return (
                        <tr
                          key={s.id}
                          className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                        >
                          <td className="px-3 py-2.5 sticky left-0 bg-white">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 shadow-sm ${avatarBg} ${avatarText}`}
                              >
                                {s.name.split(" ").map((n) => n[0]).join("")}
                              </div>
                              <div className="truncate">
                                <div className="text-xs font-medium text-slate-800 truncate">
                                  {s.name}
                                </div>
                                <div className="text-[9px] font-mono text-slate-400">
                                  {s.rollNo || s.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          {s.cols.map((c, i) => (
                            <td
                              key={i}
                              className="text-center px-2 py-2.5"
                            >
                              {c.score !== null ? (
                                <span className="text-xs font-mono font-semibold text-slate-700">
                                  {c.score}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>
                          ))}
                          <td className="text-center px-3 py-2.5 bg-slate-50/30">
                            <span className="text-xs font-mono font-bold text-slate-800">
                              {s.totalScore !== null
                                ? `${s.totalScore}/${s.totalMax}`
                                : "—"}
                            </span>
                          </td>
                          <td className="text-center px-3 py-2.5 bg-slate-50/30">
                            {s.pct !== null ? (
                              <span className={`text-xs font-mono font-bold ${getScoreColor(s.pct)}`}>
                                {s.pct}%
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                          <td className="text-center px-3 py-2.5 bg-slate-50/30">
                            {s.grade ? (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black ${s.grade.bg} ${s.grade.text}`}
                              >
                                {s.grade.label}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── PER-ASSESSMENT RESULTS TABLE ── */}
      {viewMode === "per-assessment" && (
        !selectedAssessment ? (
          <div className="bg-white border border-slate-100 rounded-xl flex flex-col items-center justify-center py-16 shadow-sm">
            <ClipboardList size={36} className="text-slate-300 mb-3" />
            <p className="text-sm text-slate-400">
              Select an activity above to view results
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-xl overflow-x-auto shadow-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-3 min-w-[200px]">
                    Student
                  </th>
                  <th className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-3">
                    Score /{maxScore}
                  </th>
                  <th className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-3 min-w-[120px]">
                    Percentage
                  </th>
                  <th className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-3">
                    Grade
                  </th>
                  <th className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {studentRows.map((student) => {
                  const [avatarBg, avatarText] = getNameColor(student.name);
                  const st = statusLabel[student.status] || statusLabel.PENDING;
                  return (
                    <tr
                      key={student.id}
                      className={`border-b border-slate-50 transition-colors ${
                        !student.submitted
                          ? "bg-red-50/30 hover:bg-red-50/50"
                          : "hover:bg-slate-50/60"
                      }`}
                    >
                      {/* Student name + ID */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 shadow-sm ${avatarBg} ${avatarText}`}
                          >
                            {student.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-800">
                              {student.name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {student.rollNo || student.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3 text-center">
                        {isEditMode || editingStudentId === student.id ? (
                          <input
                            type="number"
                            min="0"
                            max={maxScore}
                            step="0.5"
                            autoFocus={editingStudentId === student.id}
                            placeholder={String(maxScore)}
                            value={
                              student.id in dirtyScores
                                ? (dirtyScores[student.id] ?? "")
                                : student.score ?? ""
                            }
                            onChange={(e) =>
                              handleScoreChange(student.id, e.target.value)
                            }
                            onBlur={() => setEditingStudentId(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") setEditingStudentId(null);
                            }}
                            className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-sm text-center font-medium outline-none focus:ring-2 focus:ring-[#1a237e]/15 focus:border-[#1a237e]/40 transition-all bg-white"
                          />
                        ) : (
                          <span
                            onClick={() => {
                              if (isEditMode) setEditingStudentId(student.id);
                            }}
                            className={`text-sm font-medium cursor-pointer hover:bg-slate-100 px-2 py-1 rounded transition-colors ${
                              student.pct !== null
                                ? getScoreColor(student.pct)
                                : "text-slate-300 italic hover:text-slate-500"
                            }`}
                            title="Click to edit grade inline"
                          >
                            {student.score !== null
                              ? `${student.score}`
                              : "—"}
                          </span>
                        )}
                      </td>

                      {/* Percentage + mini bar */}
                      <td className="px-4 py-3">
                        {student.pct !== null ? (
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`text-sm font-medium ${getScoreColor(student.pct)}`}
                            >
                              {student.pct}%
                            </span>
                            <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${getBarColor(student.pct)}`}
                                style={{ width: `${student.pct}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-sm text-center block">
                            —
                          </span>
                        )}
                      </td>

                      {/* Grade pill */}
                      <td className="px-4 py-3 text-center">
                        {student.grade ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black ${student.grade.bg} ${student.grade.text}`}
                          >
                            {student.grade.label}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Status pill */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${st.bg} ${st.text}`}
                        >
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {/* Class average footer row */}
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">
                      Class Average
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-medium text-slate-700">
                      {classStats ? `${classStats.avgRaw.toFixed(1)}` : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-sm font-bold ${
                        classStats
                          ? getScoreColor(Math.round(classStats.avg))
                          : "text-slate-400"
                      }`}
                    >
                      {classStats ? `${Math.round(classStats.avg)}%` : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {classStats &&
                      (() => {
                        const g = getGradePill(Math.round(classStats.avg));
                        return (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black ${g.bg} ${g.text}`}
                          >
                            {g.label}
                          </span>
                        );
                      })()}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── GRADE LEGEND ── */}
      <div className="flex items-center gap-3 justify-center flex-wrap py-1">
        {[
          { label: "A", range: "90–100%", bg: "bg-emerald-50", text: "text-emerald-800" },
          { label: "B", range: "75–89%", bg: "bg-blue-50", text: "text-blue-800" },
          { label: "C", range: "50–74%", bg: "bg-amber-50", text: "text-amber-700" },
          { label: "F", range: "<50%", bg: "bg-red-50", text: "text-red-700" },
        ].map(({ label, range, bg, text }, i, arr) => (
          <React.Fragment key={label}>
            <div className="flex items-center gap-1.5">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${bg} ${text}`}>
                {label}
              </span>
              <span className="text-[10px] text-slate-400">{range}</span>
            </div>
            {i < arr.length - 1 && <span className="text-slate-200">·</span>}
          </React.Fragment>
        ))}
        <span className="text-slate-200">·</span>
        <span className="text-[10px] text-slate-400 italic">— not submitted</span>
      </div>
    </div>
  );
};

export default React.memo(GradebookModule);
