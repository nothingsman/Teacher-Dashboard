"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Save, Plus, GraduationCap } from "lucide-react";
import {
  updateTeacherProfile,
  addTeacherQualification,
  type TeacherProfile,
  type TeacherProfileUpdate,
  type TeacherQualification,
} from "../services";
import { formatApiError } from "../services/errorUtils";
import { ErrorBanner } from "./ErrorBanner";

const MAX_QUALIFICATIONS = 3;
const EMPTY_QUAL: Omit<TeacherQualification, "id"> = {
  degreeName: "",
  institution: "",
  fieldOfStudy: "",
  completionDate: "",
};

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  profile: TeacherProfile | null;
  onProfileUpdated: (profile: TeacherProfile) => void;
}

function inputCls(active: boolean) {
  return [
    "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors",
    active
      ? "border-slate-300 bg-white focus:ring-slate-900/10"
      : "border-slate-200 bg-slate-50 text-slate-600 cursor-default",
  ].join(" ");
}

export default function ProfileModal({ open, onClose, profile, onProfileUpdated }: ProfileModalProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<TeacherProfileUpdate>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ title?: string; message: string; severity: "error" | "warning" | "info" } | null>(null);
  const [pendingQuals, setPendingQuals] = useState<Omit<TeacherQualification, "id">[]>([]);

  useEffect(() => {
    if (open && profile) {
      setForm({
        employeeId: profile.employeeId,
        specialization: profile.specialization,
        joiningDate: profile.joiningDate,
        bio: profile.bio,
      });
      setPendingQuals([]);
      setEditing(false);
      setError(null);
    }
  }, [open, profile]);

  const handleChange = (field: keyof TeacherProfileUpdate, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const existingCount = profile?.qualifications?.length ?? 0;
  const canAddMore = existingCount + pendingQuals.length < MAX_QUALIFICATIONS;

  const addPendingQual = () => {
    if (canAddMore) setPendingQuals((prev) => [...prev, { ...EMPTY_QUAL }]);
  };

  const updatePendingQual = (index: number, field: keyof Omit<TeacherQualification, "id">, value: string) => {
    setPendingQuals((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removePendingQual = (index: number) =>
    setPendingQuals((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateTeacherProfile(form);
      const teacherId = updated.teacherId ?? profile?.teacherId;
      const toSave = pendingQuals.filter((q) => q.degreeName || q.institution || q.fieldOfStudy);
      for (const qual of toSave) {
        await addTeacherQualification(qual, {
          teacherId: teacherId ?? "",
          organizationId: updated.organization ?? profile?.organization,
        });
      }
      const refreshed = await (await import("../services")).getTeacherProfile();
      onProfileUpdated(refreshed);
      setPendingQuals([]);
      setEditing(false);
    } catch (err) {
      setError(formatApiError(err, "Failed to save profile."));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setForm({
        employeeId: profile.employeeId,
        specialization: profile.specialization,
        joiningDate: profile.joiningDate,
        bio: profile.bio,
      });
    }
    setPendingQuals([]);
    setError(null);
    setEditing(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1A237E] text-white flex items-center justify-center font-bold text-sm">
                    {profile?.initials ?? "T"}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Profile</h2>
                    <p className="text-xs text-slate-500">{profile?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {editing ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 disabled:opacity-60"
                      >
                        <Save size={13} /> {saving ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
                      >
                        <X size={13} /> Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors ml-1"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar">
                {error && (
                  <div className="mb-4">
                    <ErrorBanner
                      title={error.title}
                      message={error.message}
                      severity={error.severity}
                      onDismiss={() => setError(null)}
                    />
                  </div>
                )}

                <Field label="Full Name">
                  <div className={inputCls(false)}>{profile?.name ?? "—"}</div>
                </Field>
                <Field label="Email">
                  <div className={inputCls(false)}>{profile?.email ?? "—"}</div>
                </Field>
                <Field label="Role">
                  <div className={inputCls(false)}>{profile?.role ?? "Teacher"}</div>
                </Field>
                <Field label="Employee ID">
                  <input
                    type="text"
                    value={form.employeeId ?? ""}
                    onChange={(e) => handleChange("employeeId", e.target.value)}
                    disabled={!editing}
                    className={inputCls(editing)}
                  />
                </Field>
                <Field label="Specialization">
                  <input
                    type="text"
                    value={form.specialization ?? ""}
                    onChange={(e) => handleChange("specialization", e.target.value)}
                    disabled={!editing}
                    className={inputCls(editing)}
                  />
                </Field>
                <Field label="Joining Date">
                  <input
                    type="date"
                    value={form.joiningDate ?? ""}
                    onChange={(e) => handleChange("joiningDate", e.target.value)}
                    disabled={!editing}
                    className={inputCls(editing)}
                  />
                </Field>
                <Field label="Bio">
                  <textarea
                    value={form.bio ?? ""}
                    onChange={(e) => handleChange("bio", e.target.value)}
                    disabled={!editing}
                    rows={3}
                    className={`${inputCls(editing)} resize-none`}
                  />
                </Field>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap size={16} className="text-slate-400" />
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Qualifications</p>
                    </div>
                    {editing && canAddMore && (
                      <button
                        type="button"
                        onClick={addPendingQual}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#1A237E] hover:text-blue-800"
                      >
                        <Plus size={13} /> Add
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mb-3">
                    {existingCount + pendingQuals.length} of {MAX_QUALIFICATIONS} slots used
                  </p>
                  <div className="space-y-2">
                    {profile?.qualifications?.map((q) => (
                      <div key={q.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">{q.degreeName || "Qualification"}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{q.institution || "—"}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {q.fieldOfStudy || "Field not specified"}
                          {q.completionDate ? ` · Completed ${q.completionDate}` : ""}
                        </p>
                      </div>
                    ))}
                    {pendingQuals.map((qual, index) => (
                      <div key={`pending-${index}`} className="rounded-xl border border-dashed border-slate-300 bg-white p-4 relative">
                        {editing && (
                          <button
                            type="button"
                            onClick={() => removePendingQual(index)}
                            className="absolute top-3 right-3 text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <X size={15} />
                          </button>
                        )}
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-3">
                          New Qualification {existingCount + index + 1}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Degree Name"
                            value={qual.degreeName || ""}
                            onChange={(e) => updatePendingQual(index, "degreeName", e.target.value)}
                            disabled={!editing}
                            className={inputCls(editing)}
                          />
                          <input
                            type="text"
                            placeholder="Institution"
                            value={qual.institution || ""}
                            onChange={(e) => updatePendingQual(index, "institution", e.target.value)}
                            disabled={!editing}
                            className={inputCls(editing)}
                          />
                          <input
                            type="text"
                            placeholder="Field of Study"
                            value={qual.fieldOfStudy || ""}
                            onChange={(e) => updatePendingQual(index, "fieldOfStudy", e.target.value)}
                            disabled={!editing}
                            className={inputCls(editing)}
                          />
                          <input
                            type="date"
                            value={qual.completionDate || ""}
                            onChange={(e) => updatePendingQual(index, "completionDate", e.target.value)}
                            disabled={!editing}
                            className={inputCls(editing)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
