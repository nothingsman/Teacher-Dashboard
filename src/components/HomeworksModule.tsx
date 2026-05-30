"use client";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Calendar,
  Users,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  BookOpen,
  Save,
  CheckCircle2,
  X,
  Clock,
  MoreVertical,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  getHomeworksForContext,
  createAssessment,
  type Assessment,
  type AssessmentCreate,
} from "../services/assessmentsService";
import * as studentsService from "../services/studentsService";
import {
  getResultsByAssessment,
  bulkGrade,
} from "../services/assessmentResultsService";

// --- Shared Types & Data ---

interface Student {
  id: string;
  name: string;
  initials: string;
}

interface DailyEntry {
  id: string;
  date: string; // "YYYY-MM-DD"
  section: string; // e.g. "Grade 7A"
  subject: string;
  type: "Homework";
  title: string;
  description: string;
  maxScore: number;
  scores: Record<string, number | null>; // studentId → score or null
  parentVisible: boolean;
}

interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

function FormField({ label, required, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1A237E]/15 focus:border-[#1A237E]/40 transition-colors";

const HOMEWORK_STATUS_OPTIONS = [
  {
    value: "DRAFT" as const,
    label: "Draft",
    icon: <Clock size={13} />,
    color: "bg-slate-100 text-slate-600",
  },
  {
    value: "PUBLISHED" as const,
    label: "Published",
    icon: <CheckCircle2 size={13} />,
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    value: "CLOSED" as const,
    label: "Closed",
    icon: <AlertCircle size={13} />,
    color: "bg-rose-50 text-rose-600",
  },
];

const SECTIONS = [
  "Grade 7A",
  "Grade 7B",
  "Grade 8A",
  "Grade 8B",
  "Grade 9A",
  "Grade 10A",
]; // --- Helpers ---

function getMonday(date: Date | string) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeeksInMonth(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const weeks: { start: Date; end: Date }[] = [];
  let current = getMonday(firstDay);
  while (current <= lastDay) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weeks.push({ start: weekStart, end: weekEnd });
    current = new Date(current);
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}

function getCurrentWeekIndex(date: Date) {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const weeks = getWeeksInMonth(monthStart);
  return weeks.findIndex((w) => date >= w.start && date <= w.end);
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getEntryTypesForDay(date: Date, allEntries: DailyEntry[]) {
  const types = allEntries
    .filter((e) => isSameDay(new Date(e.date), date))
    .map((e) => e.type);
  return [...new Set(types)].slice(0, 4);
}

const ENTRY_DOT_COLORS: Record<string, string> = {
  Homework: "#f59e0b",
  Exam: "#ef4444",
  Quiz: "#0891b2",
  Project: "#10b981",
};

const getSubjectColor = (subject: string) => {
  switch (subject) {
    case "Mathematics":
      return "#1a237e";
    case "Physics":
      return "#7c3aed";
    case "English":
      return "#0891b2";
    case "Biology":
      return "#059669";
    case "History":
      return "#d97706";
    case "Chemistry":
      return "#dc2626";
    default:
      return "#1a237e";
  }
};

interface HomeworksModuleProps {
  activeSection?: any;
  selectedSubject?: string;
}

const HomeworksModule = ({
  activeSection,
  selectedSubject,
}: HomeworksModuleProps) => {
  const [entries, setEntries] = useState<DailyEntry[]>([]);

  const [sectionStudents, setSectionStudents] = useState<
    import("../services/studentsService").Student[]
  >([]);

  // Build context from activeSection and selectedSubject
  const context = React.useMemo(() => {
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

  // Load homeworks from assessmentsService whenever context changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const assessments = await getHomeworksForContext(context);
        if (!cancelled) {
          setEntries((prev) =>
            assessments.map((a) => {
              const existing = prev.find((e) => e.id === a.id);
              return {
                id: a.id,
                date: a.dueDate ?? new Date().toISOString().split("T")[0],
                section: a.sectionName ?? activeSection?.sectionName ?? "",
                subject: a.subjectName ?? "General",
                type: "Homework" as const,
                title: a.title,
                description: a.description ?? "",
                maxScore: Number(a.totalMarks) || 10,
                scores: existing?.scores ?? {},
                parentVisible: a.status === "PUBLISHED",
              };
            }) as DailyEntry[],
          );
        }
      } catch (e) {
        // keep existing empty state
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [context]);

  // Load section students from service whenever activeSection changes
  useEffect(() => {
    if (!activeSection?.sectionId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await studentsService.getStudentsBySectionId(
          activeSection.sectionId,
        );
        if (!cancelled) setSectionStudents(data);
      } catch {
        // keep existing empty state
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSection?.sectionId]);

  const [typeFilter, setTypeFilter] = useState("All");
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [selectedWeekIndex, setSelectedWeekIndex] = useState(() => {
    return getCurrentWeekIndex(new Date());
  });

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const allHomeworkEntries = entries;

  const weeksInMonth = useMemo(() => getWeeksInMonth(viewMonth), [viewMonth]);

  const currentWeek = weeksInMonth[selectedWeekIndex] ?? weeksInMonth[0];

  const daysInWeek = useMemo(() => {
    if (!currentWeek) return [];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentWeek.start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentWeek]);

  const entriesForSelectedDay = useMemo(
    () =>
      allHomeworkEntries.filter((e) =>
        isSameDay(new Date(e.date), selectedDate),
      ),
    [allHomeworkEntries, selectedDate],
  );

  const handlePrevMonth = () => {
    const prev = new Date(viewMonth);
    prev.setMonth(prev.getMonth() - 1);
    setViewMonth(prev);
    setSelectedWeekIndex(0);
    setSelectedDate(getMonday(prev));
  };

  const handleNextMonth = () => {
    const next = new Date(viewMonth);
    next.setMonth(next.getMonth() + 1);
    setViewMonth(next);
    setSelectedWeekIndex(0);
    setSelectedDate(getMonday(next));
  };

  const handleSelectWeek = (index: number) => {
    setSelectedWeekIndex(index);
    const weekStart = weeksInMonth[index]?.start;
    if (weekStart) {
      const monday = new Date(weekStart);
      const dayOfWeek = monday.getDay();
      const adjustedMonday = new Date(monday);
      if (dayOfWeek === 0) adjustedMonday.setDate(monday.getDate() + 1);
      setSelectedDate(adjustedMonday);
    }
  };

  const handleSelectDay = (date: Date) => {
    const isWeekend = [0, 6].includes(date.getDay());
    if (isWeekend) return;
    setSelectedDate(date);
  };

  const handleToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    setViewMonth(monthStart);
    setSelectedWeekIndex(getCurrentWeekIndex(today));
    setSelectedDate(today);
  };

  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saveConfirm, setSaveConfirm] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [savingHomework, setSavingHomework] = useState(false);

  // New Homework Form State
  const [newHomework, setNewHomework] = useState<AssessmentCreate>({
    title: "",
    taskType: "HOMEWORK",
    description: "",
    totalMarks: "10",
    passingMarks: undefined,
    dueDate: new Date().toISOString().split("T")[0],
    status: "DRAFT",
  });
  const [newHomeworkSubject, setNewHomeworkSubject] = useState(
    selectedSubject || "Mathematics",
  );

  useEffect(() => {
    if (isModalOpen && selectedSubject) {
      setNewHomeworkSubject(selectedSubject);
    }
  }, [isModalOpen, selectedSubject]);

  // Selected Entry & Local Score State
  const selectedEntry = entries.find((e) => e.id === selectedEntryId) || null;
  const [editScores, setEditScores] = useState<Record<string, number | null>>(
    {},
  );
  const [saving, setSaving] = useState(false);

  // Fetch results when the side sheet opens and update entry scores for card display
  useEffect(() => {
    if (!selectedEntryId) {
      setEditScores({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const results = await getResultsByAssessment(selectedEntryId);
        if (!cancelled) {
          const scores = resultsToScores(results);
          setEditScores(scores);
          updateEntryScores(selectedEntryId, scores);
        }
      } catch {
        if (!cancelled) setEditScores({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedEntryId]);

  // Filters
  const filteredEntries = useMemo(() => {
    return entriesForSelectedDay
      .filter((entry) => {
        const isSameType = typeFilter === "All" || entry.type === typeFilter;

        return isSameType;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entriesForSelectedDay, typeFilter]);

  // Grouped Entries
  const groupedEntries = useMemo(() => {
    const groups: Record<string, DailyEntry[]> = {};
    filteredEntries.forEach((entry) => {
      const date = new Date(entry.date);
      const key = date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    });
    return groups;
  }, [filteredEntries]);

  // Metrics
  const metrics = useMemo(() => {
    const totalEntries = filteredEntries.length;
    let totalScore = 0;
    let scoreCount = 0;
    let missingScores = 0;
    let parentVisibleCount = 0;

    filteredEntries.forEach((e) => {
      if (e.parentVisible) parentVisibleCount++;
      Object.values(e.scores).forEach((s) => {
        if (typeof s === "number") {
          totalScore += s;
          scoreCount++;
        } else {
          missingScores++;
        }
      });
    });

    // Correction: mean of all entered scores relative to their max scores
    let weightedSum = 0;
    let weightedCount = 0;
    filteredEntries.forEach((e) => {
      Object.values(e.scores).forEach((s) => {
        if (typeof s === "number") {
          weightedSum += s / e.maxScore;
          weightedCount++;
        }
      });
    });
    const trueAvg = weightedCount > 0 ? (weightedSum / weightedCount) * 100 : 0;

    return {
      entriesCount: totalEntries,
      avg: trueAvg,
      missing: missingScores,
      visible: parentVisibleCount,
    };
  }, [filteredEntries]);

  const resultsToScores = (results: import("../services/assessmentResultsService").AssessmentResult[]) => {
    const scores: Record<string, number | null> = {};
    results.forEach((r) => {
      if (r.student) {
        const marks = r.obtained_marks;
        scores[r.student] = marks !== null && marks !== undefined ? Number(marks) : null;
      }
    });
    return scores;
  };

  const updateEntryScores = (entryId: string, scores: Record<string, number | null>) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, scores } : e)),
    );
  };

  // Handlers
  const handleToggleParentVisible = async (id: string) => {
    const assessments = await getHomeworksForContext(context);
    const existing = entries.find((e) => e.id === id);
    const mapped = assessments.map((a) => ({
      id: a.id,
      date: a.dueDate ?? new Date().toISOString().split("T")[0],
      section: a.sectionName ?? activeSection?.sectionName ?? "",
      subject: a.subjectName ?? "General",
      type: "Homework" as const,
      title: a.title,
      description: a.description ?? "",
      maxScore: Number(a.totalMarks) || 10,
      scores: existing?.id === a.id ? existing.scores : {},
      parentVisible: a.status === "PUBLISHED",
    }));
    setEntries(mapped as any);
  };

  const handleUpdateScore = (studentId: string, value: string) => {
    const num = value === "" ? null : parseFloat(value);
    setEditScores((prev) => ({ ...prev, [studentId]: num }));
  };

  const handleSaveScores = async () => {
    if (!selectedEntryId || !selectedEntry) return;
    setSaving(true);
    try {
      const items = Object.entries(editScores).map(([studentId, score]) => ({
        student: studentId,
        obtained_marks: score,
        submission_status: score !== null ? ("GRADED" as const) : ("MISSING" as const),
      }));

      if (items.length === 0) return;

      await bulkGrade({
        assessment: selectedEntryId,
        results: items,
      });

      const updated = await getResultsByAssessment(selectedEntryId);
      const scores = resultsToScores(updated);
      setEditScores(scores);
      updateEntryScores(selectedEntryId, scores);
      setSaveConfirm(true);
      setTimeout(() => setSaveConfirm(false), 2000);
    } catch (err) {
      console.error("Failed to save scores", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateHomework = async () => {
    try {
      if (!newHomework.title.trim()) {
        setModalError("Title is required.");
        return;
      }

      const subject = activeSection?.subjects?.find(
        (s) => s.subjectName === newHomeworkSubject,
      );
      if (!subject) {
        setModalError("Please select a subject.");
        return;
      }

      setSavingHomework(true);
      setModalError(null);

      // Build context from activeSection and selected subject
      const context = {
        sectionId: activeSection?.sectionId,
        subjectId: subject.subjectId,
        academicYearId: activeSection?.academicYearId,
      };

      const created = await createAssessment(
        newHomework as AssessmentCreate,
        context as any,
      );
      // refresh list, preserving existing scores
      const assessments = await getHomeworksForContext(context as any);
      setEntries((prev) =>
        assessments.map((a) => {
          const existing = prev.find((e) => e.id === a.id);
          return {
            id: a.id,
            date: a.dueDate ?? new Date().toISOString().split("T")[0],
            section: a.sectionName ?? activeSection?.sectionName ?? "",
            subject: a.subjectName ?? "General",
            type: "Homework" as const,
            title: a.title,
            description: a.description ?? "",
            maxScore: Number(a.totalMarks) || 10,
            scores: existing?.scores ?? {},
            parentVisible: a.status === "PUBLISHED",
          };
        }) as DailyEntry[],
      );
      setSelectedEntryId(created.id);
      setIsModalOpen(false);
      // reset
      setNewHomework({
        title: "",
        taskType: "HOMEWORK",
        description: "",
        totalMarks: "10",
        dueDate: new Date().toISOString().split("T")[0],
        status: "DRAFT",
      });
    } catch (err) {
      console.error("Failed to create homework", err);
      setModalError((err as Error).message || "Failed to create homework.");
    } finally {
      setSavingHomework(false);
    }
  };

  const handleBulkAction = (type: "avg" | "clear" | "present") => {
    if (!selectedEntry) return;
    const students = sectionStudents;
    const newScores = { ...editScores };

    if (type === "avg") {
      const currentScores = Object.values(editScores).filter(
        (s) => s !== null,
      ) as number[];
      const avg =
        currentScores.length > 0
          ? Math.round(
              currentScores.reduce((a, b) => a + b, 0) / currentScores.length,
            )
          : selectedEntry.maxScore;
      students.forEach((s) => {
        if (newScores[s.id] === null) newScores[s.id] = avg;
      });
    } else if (type === "clear") {
      students.forEach((s) => (newScores[s.id] = null));
    } else if (type === "present") {
      students.forEach((s) => {
        if (newScores[s.id] === null) newScores[s.id] = selectedEntry.maxScore;
      });
    }

    setEditScores(newScores);
  };

  const currentStudents = sectionStudents;

  return (
    <div className="flex-1 space-y-6">
      {/* TOP CONTROLS BAR */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1a237e]/20"
          >
            {["All", "Homework"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1a237e] text-white px-4 py-2 text-sm font-semibold hover:bg-[#16204f]"
          >
            <Plus size={16} /> New Entry
          </button>
        </div>
      </div>

      {/* IMPROVED DATE NAVIGATION UI */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-4">
        {/* Header row: Month & Year pagination, Week pills, and Today button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 active:scale-95 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-bold text-slate-700 min-w-[100px] text-center capitalize">
              {viewMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </span>
            <button
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 active:scale-95 transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Week pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-1 shrink-0">
              Weeks
            </span>
            {weeksInMonth.map((week, idx) => {
              const isActive = idx === selectedWeekIndex;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectWeek(idx)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center justify-center border ${
                    isActive
                      ? "bg-[#1a237e] border-[#1a237e] text-white shadow-sm shadow-blue-900/20"
                      : "border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleToday}
            className="text-[10px] font-black uppercase tracking-widest text-[#1a237e] hover:bg-blue-50/50 border border-transparent hover:border-blue-100 rounded-lg px-3 py-2 text-center transition-all self-end sm:self-auto shrink-0"
          >
            Today
          </button>
        </div>

        {/* Day strip */}
        <div className="grid grid-cols-7 gap-2">
          {daysInWeek.map((date, idx) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, new Date());
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6

            const dayTypes = getEntryTypesForDay(date, allHomeworkEntries);

            return (
              <button
                key={idx}
                disabled={isWeekend}
                onClick={() => handleSelectDay(date)}
                className={`flex flex-col items-center p-3 rounded-xl transition-all relative select-none ${
                  isWeekend
                    ? "bg-slate-50/40 opacity-40 cursor-not-allowed border border-transparent"
                    : isSelected
                      ? "bg-[#1a237e] text-white scale-[1.03] shadow-md shadow-blue-900/30"
                      : "bg-white border border-slate-100 text-slate-700 hover:border-[#1a237e]/40 hover:bg-blue-50/20 active:scale-98"
                }`}
              >
                {/* Weekday name short */}
                <span
                  className={`text-[10px] font-black tracking-widest uppercase mb-1 ${
                    isSelected ? "text-blue-200" : "text-slate-400"
                  }`}
                >
                  {date.toLocaleDateString("en-US", { weekday: "short" })}
                </span>

                {/* Day of Month */}
                <span
                  className={`text-sm font-bold tracking-tight ${
                    isSelected ? "text-white" : "text-slate-800"
                  } ${isToday && !isSelected ? "text-[#1a237e] underline decoration-2 underline-offset-4" : ""}`}
                >
                  {date.getDate()}
                </span>

                {/* Colored dots represent homework/classwork types */}
                <div className="flex gap-1 justify-center mt-2 h-1.5 w-full">
                  {!isWeekend &&
                    dayTypes.map((type, dIdx) => (
                      <div
                        key={dIdx}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor: ENTRY_DOT_COLORS[type] || "#1a237e",
                        }}
                        title={type}
                      />
                    ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-black tracking-widest text-[#1a237e] uppercase mb-1">
            This Week's Entries
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-slate-800">
              {metrics.entriesCount}
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">
              homework
            </span>
          </div>
          <div className="mt-2 h-1 w-full bg-blue-50 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 w-full" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">
            Avg Score
          </p>
          <div className="flex items-baseline gap-2">
            <h3
              className={`text-2xl font-black ${
                metrics.avg >= 75
                  ? "text-emerald-500"
                  : metrics.avg >= 50
                    ? "text-amber-500"
                    : "text-red-500"
              }`}
            >
              {metrics.avg.toFixed(1)}%
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">
              class average
            </span>
          </div>
          <div className="mt-2 h-1 w-full bg-slate-50 rounded-full overflow-hidden">
            <div
              className={`h-full ${
                metrics.avg >= 75
                  ? "bg-emerald-500"
                  : metrics.avg >= 50
                    ? "bg-amber-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${metrics.avg}%` }}
            />
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-black tracking-widest text-amber-500 uppercase mb-1">
            Missing Scores
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-slate-800">
              {metrics.missing}
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">
              not yet graded
            </span>
          </div>
          <div className="mt-2 h-1 w-full bg-amber-50 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500"
              style={{ width: metrics.missing > 0 ? "60%" : "0%" }}
            />
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-black tracking-widest text-emerald-500 uppercase mb-1">
            Parent Visible
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-slate-800">
              {metrics.visible}
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">
              shared with parents
            </span>
          </div>
          <div className="mt-2 h-1 w-full bg-emerald-50 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500"
              style={{
                width: `${(metrics.visible / (metrics.entriesCount || 1)) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="w-full">
        {/* LEFT: ENTRY LIST */}
        <div className="w-full space-y-8">
          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-dashed border-slate-200">
              <BookOpen size={40} className="text-slate-300 mb-4" />
              <p className="text-sm font-bold text-slate-500 uppercase tracking-tight">
                No entries for this day
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Create one with the New Entry button above
              </p>
            </div>
          ) : (
            Object.entries(groupedEntries).map(([dateLabel, dayEntries]) => (
              <div key={dateLabel} className="space-y-4">
                <div className="flex items-center gap-3 sticky top-0 bg-slate-50/90 backdrop-blur-sm py-2 px-1 z-10">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    {dateLabel}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {dayEntries.length}{" "}
                    {dayEntries.length === 1 ? "entry" : "entries"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(dayEntries as DailyEntry[]).map((entry) => {
                    const gradedCount = Object.values(entry.scores).filter(
                      (s) => s !== null,
                    ).length;
                    const totalCount = Object.keys(entry.scores).length;
                    const gradedPct = (gradedCount / totalCount) * 100;

                    const totalScoreSum = Object.values(entry.scores).reduce(
                      (acc: number, s) => acc + (s || 0),
                      0,
                    );
                    const avg =
                      gradedCount > 0 ? totalScoreSum / gradedCount : 0;
                    const avgPct = (avg / entry.maxScore) * 100;

                    return (
                      <motion.div
                        key={entry.id}
                        layoutId={entry.id}
                        onClick={() => setSelectedEntryId(entry.id)}
                        className={`bg-white rounded-xl border-l-[3px] shadow-sm p-4 space-y-3 cursor-pointer group transition-all relative ${
                          selectedEntryId === entry.id
                            ? "ring-2 ring-[#1a237e]/20 border-slate-200"
                            : "border border-slate-100 hover:border-slate-200"
                        }`}
                        style={{
                          borderLeftColor: getSubjectColor(entry.subject),
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-slate-100`}
                              style={{ color: getSubjectColor(entry.subject) }}
                            >
                              {entry.subject}
                            </span>
                            <span
                              className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-700"
                            >
                              {entry.type}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleParentVisible(entry.id);
                            }}
                            className={`p-1 transition-colors ${entry.parentVisible ? "text-emerald-500" : "text-slate-300"} hover:bg-slate-50 rounded`}
                            title={
                              entry.parentVisible
                                ? "Visible to parents"
                                : "Hidden from parents"
                            }
                          >
                            {entry.parentVisible ? (
                              <Eye size={16} />
                            ) : (
                              <EyeOff size={16} />
                            )}
                          </button>
                        </div>

                        <h4 className="text-sm font-bold text-slate-800 tracking-tight">
                          {entry.title}
                        </h4>
                        <p className="text-xs text-slate-400 line-clamp-1">
                          {entry.description}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Calendar size={12} className="text-slate-300" />
                            <span>
                              {new Date(entry.date).toLocaleDateString(
                                "en-US",
                                { month: "short", day: "numeric" },
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users size={12} className="text-slate-300" />
                            <span>{entry.section}</span>
                          </div>
                          <span className="text-slate-300 font-mono">
                            / {entry.maxScore}
                          </span>
                        </div>

                        <div className="space-y-1.5 mt-2">
                          <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest">
                            <span className="text-slate-400 font-black">
                              Scores
                            </span>
                            <span className="text-slate-500">
                              {gradedCount} / {totalCount} graded
                            </span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${gradedPct}%` }}
                              className={`h-full rounded-full ${
                                avgPct >= 75
                                  ? "bg-emerald-500"
                                  : avgPct >= 50
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                              }`}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-1">
                          <span className="text-xs font-bold text-slate-700">
                            Avg:{" "}
                            <span
                              className={
                                avgPct >= 75
                                  ? "text-emerald-600"
                                  : avgPct >= 50
                                    ? "text-amber-600"
                                    : "text-red-500"
                              }
                            >
                              {avg.toFixed(1)} / {entry.maxScore}
                            </span>
                          </span>
                          <button className="text-xs font-bold text-[#1a237e] border border-[#1a237e]/30 px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors uppercase tracking-widest">
                            Enter Grades
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SIDE SHEET DRAWER FOR GRADE ENTRY */}
      <AnimatePresence>
        {selectedEntry && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEntryId(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80]"
            />

            {/* Slide-out side sheet panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:max-w-xl md:max-w-2xl bg-white shadow-2xl z-[90] flex flex-col h-full border-l border-slate-100"
            >
              {/* Detailed Grade Entry Panel */}
              <div className="h-full flex flex-col overflow-hidden">
                <div className="p-6 space-y-4 border-b border-slate-100 bg-slate-50/20 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-slate-100`}
                        style={{
                          color: getSubjectColor(selectedEntry.subject),
                        }}
                      >
                        {selectedEntry.subject}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-700"
                      >
                        {selectedEntry.type}
                      </span>
                    </div>
                    {/* Close Panel Button */}
                    <button
                      onClick={() => setSelectedEntryId(null)}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                      title="Close Panel"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <h3 className="text-base font-bold text-slate-800 leading-tight">
                    {selectedEntry.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-slate-400" />
                      <span>
                        {new Date(selectedEntry.date).toLocaleDateString(
                          "en-US",
                          { month: "long", day: "numeric", year: "numeric" },
                        )}
                      </span>
                    </div>
                    <span className="text-slate-200">·</span>
                    <div className="flex items-center gap-1.5">
                      <Users size={14} className="text-slate-400" />
                      <span>{selectedEntry.section}</span>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-black text-slate-400">
                        MAX
                      </span>
                      <span className="font-bold text-slate-700">
                        / {selectedEntry.maxScore}
                      </span>
                    </div>
                  </div>

                </div>
                <div className="flex-1 overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar">
                  <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-20">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Student Scores
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400">
                        Sorted by Rank
                      </span>
                      <ChevronDown size={12} className="text-slate-300" />
                    </div>
                  </div>

                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/50 sticky top-[41px] z-10">
                      <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <th className="px-6 py-3 font-black">Student</th>
                        <th className="px-2 py-3 font-black text-center">
                          Score
                        </th>
                        <th className="px-2 py-3 font-black text-center">
                          Outcome
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {currentStudents.map((student) => {
                        const score = editScores[student.id];
                        const scorePct =
                          score !== null
                            ? (score / selectedEntry.maxScore) * 100
                            : null;

                        let borderColor = "border-slate-200";
                        if (score !== null) {
                          if (scorePct! >= 75)
                            borderColor = "border-emerald-300";
                          else if (scorePct! >= 50)
                            borderColor = "border-amber-300";
                          else borderColor = "border-red-300";
                        }

                        return (
                          <tr
                            key={student.id}
                            className="group hover:bg-slate-50/60 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 ${
                                    (student.avatar ?? "").length > 1
                                      ? "bg-[#1a237e]/10 text-[#1a237e]"
                                      : "bg-slate-100 text-slate-400"
                                  }}`}
                                >
                                  {student.avatar ?? ""}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-slate-700 truncate leading-tight">
                                    {student.name}
                                  </p>
                                  <p className="text-[10px] font-mono text-slate-400">
                                    {student.id}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max={selectedEntry.maxScore}
                                  value={
                                    score === null || score === undefined
                                      ? ""
                                      : score
                                  }
                                  onChange={(e) =>
                                    handleUpdateScore(
                                      student.id,
                                      e.target.value,
                                    )
                                  }
                                  placeholder="—"
                                  className={`w-12 h-9 text-center border-2 rounded-xl text-sm font-bold text-slate-800 transition-all focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-[#1a237e] ${borderColor}`}
                                />
                                <span className="text-[10px] font-bold text-slate-300">
                                  / {selectedEntry.maxScore}
                                </span>
                              </div>
                            </td>
                            <td className="px-2 py-4">
                              <div className="flex justify-center">
                                {scorePct !== null ? (
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                                      scorePct >= 90
                                        ? "bg-emerald-100 text-emerald-700"
                                        : scorePct >= 75
                                          ? "bg-blue-100 text-blue-700"
                                          : scorePct >= 50
                                            ? "bg-amber-100 text-amber-700"
                                            : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {scorePct >= 90
                                      ? "A"
                                      : scorePct >= 75
                                        ? "B"
                                        : scorePct >= 50
                                          ? "C"
                                          : "F"}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-300 text-[10px] font-black uppercase tracking-widest">
                                    —
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 sm:px-6 sm:py-4 space-y-3 border-t border-slate-100 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.02)] shrink-0">
                  <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleBulkAction("clear")}
                      className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 hover:bg-red-100 border border-red-100 px-3 py-2.5 sm:py-1.5 rounded-xl transition-all text-center"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-0">
                    <div className="flex flex-row sm:flex-col items-center sm:items-start justify-between sm:justify-start gap-4 sm:gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">
                          Class Avg
                        </span>
                        <span className="text-sm font-black text-slate-800">
                          {(() => {
                            const scores = Object.values(editScores).filter(
                              (s) => s !== null,
                            ) as number[];
                            if (scores.length === 0) return "—";
                            return (
                              scores.reduce((a, b) => a + b, 0) / scores.length
                            ).toFixed(1);
                          })()}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">
                        {
                          Object.values(editScores).filter((s) => s !== null)
                            .length
                        }{" "}
                        graded ·{" "}
                        {
                          Object.values(editScores).filter((s) => s === null)
                            .length
                        }{" "}
                        missing
                      </span>
                    </div>

                    <div className="relative">
                      <button
                        onClick={handleSaveScores}
                        disabled={saving}
                        className="w-full sm:w-auto bg-[#1a237e] text-white rounded-xl px-6 py-3 sm:py-2.5 text-[11px] sm:text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 hover:bg-blue-900 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 transition-all"
                      >
                        {saving ? "Saving…" : "Save Scores"}
                      </button>
                      <AnimatePresence>
                        {saveConfirm && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.5, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: -45 }}
                            exit={{ opacity: 0, scale: 0.5, y: -10 }}
                            className="absolute left-1/2 -translate-x-1/2 p-2 px-4 bg-emerald-600 text-white rounded-full text-xs font-black flex items-center gap-2 whitespace-nowrap shadow-xl z-30"
                          >
                            Saved <CheckCircle size={14} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* NEW ENTRY MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[2px] flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsModalOpen(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 12, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Create New Homework
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Fill in the details to create a new assessment.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form */}
              <form
                id="homework-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateHomework();
                }}
                className="px-8 py-6 space-y-5 max-h-[70vh] overflow-y-auto"
              >
                {modalError && (
                  <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                    <AlertCircle
                      size={15}
                      className="text-rose-500 mt-0.5 shrink-0"
                    />
                    <p className="text-xs text-rose-700">{modalError}</p>
                  </div>
                )}
                <FormField label="Title" required>
                  <input
                    className={inputCls}
                    type="text"
                    placeholder="e.g. Chapter 4 Homework"
                    value={newHomework.title}
                    onChange={(e) =>
                      setNewHomework((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                  />
                </FormField>

                <FormField label="Task Type" required>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border bg-teal-50 text-teal-700 border-teal-200 ring-2 ring-offset-1 ring-current/30"
                      disabled
                    >
                      <BookOpen size={14} /> Homework
                    </button>
                  </div>
                </FormField>

                <FormField label="Subject" required>
                  <select
                    className={inputCls}
                    value={newHomeworkSubject}
                    onChange={(e) => setNewHomeworkSubject(e.target.value)}
                  >
                    {activeSection?.subjects &&
                    activeSection.subjects.length > 0 ? (
                      activeSection.subjects.map((subject) => (
                        <option
                          key={subject.subjectId}
                          value={subject.subjectName}
                        >
                          {subject.subjectName}
                        </option>
                      ))
                    ) : (
                      <option value="">No subjects available</option>
                    )}
                  </select>
                </FormField>

                <FormField label="Description">
                  <textarea
                    className={`${inputCls} resize-none`}
                    rows={3}
                    placeholder="Add instructions or context for this task…"
                    value={newHomework.description}
                    onChange={(e) =>
                      setNewHomework((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField label="Total Marks">
                    <input
                      className={inputCls}
                      type="number"
                      min="0"
                      placeholder="100"
                      value={newHomework.totalMarks}
                      onChange={(e) =>
                        setNewHomework((prev) => ({
                          ...prev,
                          totalMarks: e.target.value,
                        }))
                      }
                    />
                  </FormField>
                  <FormField label="Passing Marks">
                    <input
                      className={inputCls}
                      type="number"
                      min="0"
                      placeholder="50"
                      value={newHomework.passingMarks ?? ""}
                      onChange={(e) =>
                        setNewHomework((prev) => ({
                          ...prev,
                          passingMarks: e.target.value,
                        }))
                      }
                    />
                  </FormField>
                  <FormField label="Due Date">
                    <input
                      className={`${inputCls} text-slate-500`}
                      type="date"
                      value={newHomework.dueDate}
                      onChange={(e) =>
                        setNewHomework((prev) => ({
                          ...prev,
                          dueDate: e.target.value,
                        }))
                      }
                    />
                  </FormField>
                </div>

                <FormField label="Status">
                  <div className="flex gap-2">
                    {HOMEWORK_STATUS_OPTIONS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() =>
                          setNewHomework((prev) => ({
                            ...prev,
                            status: s.value,
                          }))
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          newHomework.status === s.value
                            ? `${s.color} border-current/30 ring-2 ring-offset-1 ring-current/20`
                            : "border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        {s.icon} {s.label}
                      </button>
                    ))}
                  </div>
                </FormField>
              </form>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-8 py-5 border-t border-slate-100 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="homework-form"
                  disabled={savingHomework}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1A237E] text-white text-sm font-semibold px-5 py-2.5 hover:bg-[#1A237E]/90 disabled:opacity-60 transition-colors shadow-sm"
                >
                  <Save size={14} />
                  {savingHomework ? "Saving…" : "Create Homework"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default React.memo(HomeworksModule);
