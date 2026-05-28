"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  X,
  Save,
  Pencil,
  Trash2,
  ClipboardList,
  BookOpen,
  FlaskConical,
  FileText,
  Brain,
  Layers,
  ChevronDown,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  getAssessmentsForContext,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  type Assessment,
  type AssessmentCreate,
  type TaskType,
  type TaskStatus,
} from "../services/assessmentsService";
import type { TeacherSection } from "../services/teacherSectionsService";

// ─── Config ────────────────────────────────────────────────────────────────────

const TASK_TYPES: {
  value: TaskType;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: "ASSIGNMENT",
    label: "Assignment",
    icon: <ClipboardList size={14} />,
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    value: "EXAM",
    label: "Exam",
    icon: <BookOpen size={14} />,
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    value: "QUIZ",
    label: "Quiz",
    icon: <Brain size={14} />,
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    value: "HOMEWORK",
    label: "Homework",
    icon: <FileText size={14} />,
    color: "bg-teal-50 text-teal-700 border-teal-200",
  },
  {
    value: "PROJECT",
    label: "Project",
    icon: <Layers size={14} />,
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    value: "LAB",
    label: "Lab",
    icon: <FlaskConical size={14} />,
    color: "bg-rose-50 text-rose-700 border-rose-200",
  },
];

const STATUS_OPTIONS: {
  value: TaskStatus;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: "DRAFT",
    label: "Draft",
    icon: <Clock size={13} />,
    color: "bg-slate-100 text-slate-600",
  },
  {
    value: "PUBLISHED",
    label: "Published",
    icon: <CheckCircle2 size={13} />,
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    value: "CLOSED",
    label: "Closed",
    icon: <AlertCircle size={13} />,
    color: "bg-rose-50 text-rose-600",
  },
];

const EMPTY_FORM: AssessmentCreate = {
  title: "",
  taskType: "ASSIGNMENT",
  description: "",
  totalMarks: "",
  passingMarks: "",
  dueDate: "",
  status: "DRAFT",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function taskTypeMeta(type: TaskType) {
  return TASK_TYPES.find((t) => t.value === type) ?? TASK_TYPES[0];
}

function statusMeta(status: TaskStatus) {
  return STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Badge({ type }: { type: TaskType }) {
  const meta = taskTypeMeta(type);
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.color}`}
    >
      {meta.icon} {meta.label}
    </span>
  );
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const meta = statusMeta(status);
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.color}`}
    >
      {meta.icon} {meta.label}
    </span>
  );
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

// ─── Create / Edit Modal ───────────────────────────────────────────────────────

interface TaskFormModalProps {
  initial?: Assessment | null;
  onClose: () => void;
  onSaved: (a: Assessment) => void;
  context?: { sectionId: string; subjectId: string; academicYearId: string };
}

function TaskFormModal({
  initial,
  onClose,
  onSaved,
  context,
}: TaskFormModalProps) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState<AssessmentCreate>(
    initial
      ? {
          title: initial.title,
          taskType: initial.taskType,
          description: initial.description ?? "",
          totalMarks: initial.totalMarks ?? "",
          passingMarks: initial.passingMarks ?? "",
          dueDate: initial.dueDate ?? "",
          status: initial.status,
          teacherAssignmentId: initial.teacherAssignmentId,
          organizationId: initial.organizationId,
          branchId: initial.branchId,
        }
      : { ...EMPTY_FORM },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof AssessmentCreate>(
    k: K,
    v: AssessmentCreate[K],
  ) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = isEdit
        ? await updateAssessment(initial!.id, form, context)
        : await createAssessment(form, context);
      onSaved(saved);
    } catch (err) {
      setError((err as Error).message || "Failed to save task.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
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
              {isEdit ? "Edit Task" : "Create New Task"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit
                ? "Update task details below."
                : "Fill in the details to create a new assessment."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="px-8 py-6 space-y-5 max-h-[70vh] overflow-y-auto"
        >
          {error && (
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
              <AlertCircle
                size={15}
                className="text-rose-500 mt-0.5 shrink-0"
              />
              <p className="text-xs text-rose-700">{error}</p>
            </div>
          )}

          {/* Title */}
          <FormField label="Title" required>
            <input
              className={inputCls}
              type="text"
              placeholder="e.g. Chapter 4 Quiz"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </FormField>

          {/* Task type pill selector */}
          <FormField label="Task Type" required>
            <div className="flex flex-wrap gap-2">
              {TASK_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set("taskType", t.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    form.taskType === t.value
                      ? `${t.color} ring-2 ring-offset-1 ring-current/30`
                      : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </FormField>

          {/* Description */}
          <FormField label="Description">
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              placeholder="Add instructions or context for this task…"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </FormField>

          {/* Marks + Due date row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Total Marks">
              <input
                className={inputCls}
                type="number"
                min="0"
                placeholder="100"
                value={form.totalMarks}
                onChange={(e) => set("totalMarks", e.target.value)}
              />
            </FormField>
            <FormField label="Passing Marks">
              <input
                className={inputCls}
                type="number"
                min="0"
                placeholder="50"
                value={form.passingMarks}
                onChange={(e) => set("passingMarks", e.target.value)}
              />
            </FormField>
            <FormField label="Due Date">
              <input
                className={`${inputCls} text-slate-500`}
                type="date"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
              />
            </FormField>
          </div>

          {/* Status */}
          <FormField label="Status">
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => set("status", s.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    form.status === s.value
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
            onClick={onClose}
            className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="task-form"
            disabled={saving}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1A237E] text-white text-sm font-semibold px-5 py-2.5 hover:bg-[#1A237E]/90 disabled:opacity-60 transition-colors shadow-sm"
          >
            <Save size={14} />
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Task"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Assessment Card ───────────────────────────────────────────────────────────

interface AssessmentCardProps {
  assessment: Assessment;
  onEdit: (a: Assessment) => void;
  onDelete: (id: string) => void;
}

function AssessmentCard({ assessment, onEdit, onDelete }: AssessmentCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAssessment(assessment.id);
      onDelete(assessment.id);
    } catch {
      setDeleting(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge type={assessment.taskType} />
          <StatusBadge status={assessment.status} />
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(assessment)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#1A237E] hover:bg-slate-100 transition-colors"
          >
            <Pencil size={13} />
          </button>
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-60"
              >
                {deleting ? "…" : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>

      <h3 className="text-sm font-bold text-slate-900 leading-snug mb-1">
        {assessment.title}
      </h3>
      {assessment.description && (
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
          {assessment.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 font-medium border-t border-slate-50 pt-3 mt-1">
        {assessment.dueDate && (
          <span className="flex items-center gap-1">
            <Calendar size={11} /> Due {formatDate(assessment.dueDate)}
          </span>
        )}
        {assessment.totalMarks && (
          <span>
            Total:{" "}
            <span className="text-slate-600 font-semibold">
              {assessment.totalMarks} marks
            </span>
          </span>
        )}
        {assessment.passingMarks && (
          <span>
            Pass:{" "}
            <span className="text-slate-600 font-semibold">
              {assessment.passingMarks}
            </span>
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Module ───────────────────────────────────────────────────────────────

export default function TasksModule({
  activeSection,
  selectedSubject,
  onCountChange,
}: {
  activeSection?: TeacherSection;
  selectedSubject: string;
  onCountChange?: (count: number) => void;
}) {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Assessment | null>(null);
  const [filterType, setFilterType] = useState<TaskType | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "ALL">("ALL");

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
  useEffect(() => {
    let isActive = true;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        if (!context) {
          if (isActive) setAssessments([]);
          return;
        }

        const data = await getAssessmentsForContext(context);
        if (isActive) setAssessments(data);
      } catch (err) {
        if (isActive) setError((err as Error).message);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    load();
    return () => {
      isActive = false;
    };
  }, [context]);

  const handleSaved = (saved: Assessment) => {
    setAssessments((prev) => {
      const idx = prev.findIndex((a) => a.id === saved.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    setShowForm(false);
    setEditTarget(null);
  };

  const handleDelete = (id: string) =>
    setAssessments((prev) => prev.filter((a) => a.id !== id));

  const filtered = assessments.filter((a) => {
    if (a.taskType === "HOMEWORK") return false; // Homeworks are in dedicated tab
    if (filterType !== "ALL" && a.taskType !== filterType) return false;
    if (filterStatus !== "ALL" && a.status !== filterStatus) return false;
    return true;
  });

  const nonHomeworkCount = React.useMemo(
    () => assessments.filter((a) => a.taskType !== "HOMEWORK").length,
    [assessments],
  );

  useEffect(() => {
    onCountChange?.(nonHomeworkCount);
  }, [nonHomeworkCount, onCountChange]);

  const counts = React.useMemo(() => {
    const c: Record<string, number> = { ALL: nonHomeworkCount };
    for (const a of assessments) {
      if (a.taskType === "HOMEWORK") continue;
      c[a.taskType] = (c[a.taskType] ?? 0) + 1;
      c[a.status] = (c[a.status] ?? 0) + 1;
    }
    return c;
  }, [assessments, nonHomeworkCount]);

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} task{filtered.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditTarget(null);
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1A237E] text-white text-sm font-semibold px-4 py-2.5 hover:bg-[#1A237E]/90 transition-colors shadow-sm"
        >
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Type filter */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilterType("ALL")}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
              filterType === "ALL"
                ? "bg-slate-900 text-white border-slate-900"
                : "border-slate-200 text-slate-500 hover:border-slate-400"
            }`}
          >
            All Types {counts.ALL > 0 && `(${counts.ALL})`}
          </button>
          {TASK_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setFilterType(t.value)}
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
                filterType === t.value
                  ? `${t.color}`
                  : "border-slate-200 text-slate-500 hover:border-slate-400"
              }`}
            >
              {t.icon} {t.label}
              {counts[t.value] > 0 && ` (${counts[t.value]})`}
            </button>
          ))}
        </div>

        <div className="w-px bg-slate-200 mx-1 hidden sm:block" />

        {/* Status filter */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { value: "ALL", label: "All Status" } as const,
            ...STATUS_OPTIONS,
          ].map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setFilterStatus(s.value as TaskStatus | "ALL")}
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
                filterStatus === s.value
                  ? "bg-slate-900 text-white border-slate-900"
                  : "border-slate-200 text-slate-500 hover:border-slate-400"
              }`}
            >
              {"icon" in s && s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          <AlertCircle size={15} className="text-rose-500 shrink-0" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-slate-100 rounded-2xl p-5 animate-pulse space-y-3"
            >
              <div className="flex gap-2">
                <div className="h-5 w-20 bg-slate-100 rounded-full" />
                <div className="h-5 w-16 bg-slate-100 rounded-full" />
              </div>
              <div className="h-4 w-3/4 bg-slate-100 rounded" />
              <div className="h-3 w-full bg-slate-50 rounded" />
              <div className="h-3 w-2/3 bg-slate-50 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <ClipboardList size={28} className="text-slate-300" />
          </div>
          <h3 className="text-sm font-bold text-slate-700 mb-1">
            No tasks found
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            {filterType !== "ALL" || filterStatus !== "ALL"
              ? "Try adjusting your filters."
              : "Create your first task to get started."}
          </p>
          {filterType === "ALL" && filterStatus === "ALL" && (
            <button
              type="button"
              onClick={() => {
                setEditTarget(null);
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1A237E] text-white text-xs font-semibold px-4 py-2 hover:bg-[#1A237E]/90 transition-colors"
            >
              <Plus size={13} /> Create Task
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((a) => (
              <AssessmentCard
                key={a.id}
                assessment={a}
                onEdit={(a) => {
                  setEditTarget(a);
                  setShowForm(true);
                }}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showForm && (
          <TaskFormModal
            initial={editTarget}
            onClose={() => {
              setShowForm(false);
              setEditTarget(null);
            }}
            onSaved={handleSaved}
            context={context}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
