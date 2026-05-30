"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import {
  getTeacherProfile,
  updateTeacherProfile,
  addTeacherQualification,
  type TeacherProfile,
  type TeacherProfileUpdate,
} from "../../services";
import type { TeacherQualification } from "../../services/profileService";
import { getAccessToken } from "../../services/authStore";
import { ArrowLeft, Save, User, GraduationCap, Pencil, X, Plus } from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────
const EMPTY_QUAL: Omit<TeacherQualification, "id"> = {
  degreeName: "",
  institution: "",
  fieldOfStudy: "",
  completionDate: "",
};

const MAX_QUALIFICATIONS = 4;

export default function TeacherProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [authChecked, setAuthChecked] = useState(false);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Profile section state ──────────────────────────────────────────────────
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<TeacherProfileUpdate>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // ── Qualifications section state ───────────────────────────────────────────
  const [editingQuals, setEditingQuals] = useState(false);
  const [pendingQuals, setPendingQuals] = useState<Omit<TeacherQualification, "id">[]>([]);
  const [savingQuals, setSavingQuals] = useState(false);
  const [qualsError, setQualsError] = useState<string | null>(null);

  // ── Auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = getAccessToken();
    if (!token) { router.replace("/login"); return; }
    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    if (searchParams.get("edit") === "true") setEditingProfile(true);
  }, [authChecked, searchParams]);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authChecked) return;
    setLoading(true);
    getTeacherProfile()
      .then((data) => {
        setProfile(data);
        setProfileForm({
          employeeId: data.employeeId,
          specialization: data.specialization,
          joiningDate: data.joiningDate,
          bio: data.bio,
        });
      })
      .catch((err) => setError((err as Error).message || "Failed to load profile."))
      .finally(() => setLoading(false));
  }, [authChecked]);

  // ── Profile handlers ───────────────────────────────────────────────────────
  const handleProfileChange = (field: keyof TeacherProfileUpdate, value: string) =>
    setProfileForm((prev) => ({ ...prev, [field]: value }));

  const handleProfileSave = async () => {
    setSavingProfile(true);
    setProfileError(null);
    try {
      await updateTeacherProfile(profileForm);
      const refreshed = await getTeacherProfile();
      setProfile(refreshed);
      setEditingProfile(false);
    } catch (err) {
      setProfileError((err as Error).message || "Failed to save.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleProfileCancel = () => {
    setProfileForm({
      employeeId: profile?.employeeId,
      specialization: profile?.specialization,
      joiningDate: profile?.joiningDate,
      bio: profile?.bio,
    });
    setProfileError(null);
    setEditingProfile(false);
  };

  // ── Qualifications handlers ────────────────────────────────────────────────
  const existingCount = profile?.qualifications?.length ?? 0;
  const canAddMore = existingCount + pendingQuals.length < MAX_QUALIFICATIONS;

  const addPendingQual = () => {
    if (canAddMore) setPendingQuals((prev) => [...prev, { ...EMPTY_QUAL }]);
  };

  const updatePendingQual = (
    index: number,
    field: keyof Omit<TeacherQualification, "id">,
    value: string
  ) => {
    setPendingQuals((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removePendingQual = (index: number) =>
    setPendingQuals((prev) => prev.filter((_, i) => i !== index));

  const handleQualsSave = async () => {
    setSavingQuals(true);
    setQualsError(null);
    try {
      const teacherId = profile?.teacherId;
      if (!teacherId) throw new Error("Teacher account not found.");
      const toSave = pendingQuals.filter(
        (q) => q.degreeName || q.institution || q.fieldOfStudy
      );
      for (const qual of toSave) {
        await addTeacherQualification(qual, {
          teacherId,
          organizationId: profile?.organization,
        });
      }
      const refreshed = await getTeacherProfile();
      setProfile(refreshed);
      setPendingQuals([]);
      setEditingQuals(false);
    } catch (err) {
      setQualsError((err as Error).message || "Failed to save qualifications.");
    } finally {
      setSavingQuals(false);
    }
  };

  const handleQualsCancel = () => {
    setPendingQuals([]);
    setQualsError(null);
    setEditingQuals(false);
  };

  if (!authChecked) return null;

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} /> Back to dashboard
        </button>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-sm text-slate-500 py-10 text-center">Loading profile…</div>
        ) : (
          <>
            {/* ── Section 1: Profile Details ────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="bg-white border border-slate-100 rounded-3xl shadow-sm p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#1A237E] text-white flex items-center justify-center font-bold text-base">
                    {profile?.initials ?? "T"}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">Profile Details</h1>
                    <p className="text-xs text-slate-500">Personal & employment information</p>
                  </div>
                </div>

                {!editingProfile ? (
                  <button
                    type="button"
                    onClick={() => setEditingProfile(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleProfileSave}
                      disabled={savingProfile}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 disabled:opacity-60"
                    >
                      <Save size={13} /> {savingProfile ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={handleProfileCancel}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
                    >
                      <X size={13} /> Cancel
                    </button>
                  </div>
                )}
              </div>

              {profileError && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-rose-700">{profileError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Read-only */}
                <Field label="Full Name">
                  <input type="text" value={profile?.name ?? ""} disabled
                    className={inputCls(false)} />
                </Field>
                <Field label="Email">
                  <input type="email" value={profile?.email ?? ""} disabled
                    className={inputCls(false)} />
                </Field>
                <Field label="Role">
                  <div className={`${inputCls(false)} text-slate-600`}>{profile?.role ?? "Teacher"}</div>
                </Field>

                {/* Editable */}
                <Field label="Employee ID">
                  <input type="text" value={profileForm.employeeId ?? ""}
                    onChange={(e) => handleProfileChange("employeeId", e.target.value)}
                    disabled={!editingProfile}
                    className={inputCls(editingProfile)} />
                </Field>
                <Field label="Specialization">
                  <input type="text" value={profileForm.specialization ?? ""}
                    onChange={(e) => handleProfileChange("specialization", e.target.value)}
                    disabled={!editingProfile}
                    className={inputCls(editingProfile)} />
                </Field>
                <Field label="Joining Date">
                  <input type="date" value={profileForm.joiningDate ?? ""}
                    onChange={(e) => handleProfileChange("joiningDate", e.target.value)}
                    disabled={!editingProfile}
                    className={inputCls(editingProfile)} />
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Bio">
                  <textarea value={profileForm.bio ?? ""}
                    onChange={(e) => handleProfileChange("bio", e.target.value)}
                    disabled={!editingProfile}
                    rows={3}
                    className={`${inputCls(editingProfile)} resize-none`} />
                </Field>
              </div>
            </motion.div>

            {/* ── Section 2: Qualifications ─────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 }}
              className="bg-white border border-slate-100 rounded-3xl shadow-sm p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                    <GraduationCap size={18} className="text-slate-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Qualifications</h2>
                    <p className="text-xs text-slate-500">
                      {existingCount} of {MAX_QUALIFICATIONS} slots used
                    </p>
                  </div>
                </div>

                {!editingQuals ? (
                  <button
                    type="button"
                    onClick={() => setEditingQuals(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus size={13} /> Add
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleQualsSave}
                      disabled={savingQuals}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 disabled:opacity-60"
                    >
                      <Save size={13} /> {savingQuals ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={handleQualsCancel}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
                    >
                      <X size={13} /> Cancel
                    </button>
                  </div>
                )}
              </div>

              {qualsError && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-rose-700">{qualsError}</p>
                </div>
              )}

              <div className="space-y-3">
                {/* Existing qualifications (read-only cards) */}
                {profile?.qualifications?.length ? (
                  profile.qualifications.map((q) => (
                    <div key={q.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">{q.degreeName || "Qualification"}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{q.institution || "—"}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {q.fieldOfStudy || "Field not specified"}
                        {q.completionDate ? ` · Completed ${q.completionDate}` : ""}
                      </p>
                    </div>
                  ))
                ) : !editingQuals ? (
                  <p className="text-sm text-slate-400 italic">No qualifications listed yet.</p>
                ) : null}

                {/* Pending new qualification forms */}
                {editingQuals && (
                  <>
                    {pendingQuals.map((qual, index) => (
                      <div
                        key={`pending-${index}`}
                        className="rounded-xl border border-slate-300 border-dashed bg-white p-4 relative"
                      >
                        <button
                          type="button"
                          onClick={() => removePendingQual(index)}
                          className="absolute top-3 right-3 text-slate-400 hover:text-rose-500 transition-colors"
                          aria-label="Remove"
                        >
                          <X size={15} />
                        </button>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-3">
                          New Qualification {existingCount + index + 1}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Degree Name"
                            value={qual.degreeName || ""}
                            onChange={(e) => updatePendingQual(index, "degreeName", e.target.value)}
                            className={inputCls(true)}
                          />
                          <input
                            type="text"
                            placeholder="Institution"
                            value={qual.institution || ""}
                            onChange={(e) => updatePendingQual(index, "institution", e.target.value)}
                            className={inputCls(true)}
                          />
                          <input
                            type="text"
                            placeholder="Field of Study"
                            value={qual.fieldOfStudy || ""}
                            onChange={(e) => updatePendingQual(index, "fieldOfStudy", e.target.value)}
                            className={inputCls(true)}
                          />
                          <input
                            type="date"
                            value={qual.completionDate || ""}
                            onChange={(e) => updatePendingQual(index, "completionDate", e.target.value)}
                            className={`${inputCls(true)} text-slate-500`}
                          />
                        </div>
                      </div>
                    ))}

                    {canAddMore && (
                      <button
                        type="button"
                        onClick={addPendingQual}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:border-slate-400 transition-colors"
                      >
                        <Plus size={14} /> Add qualification
                        <span className="text-slate-400 font-normal">
                          ({MAX_QUALIFICATIONS - existingCount - pendingQuals.length} remaining)
                        </span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Shared helpers ────────────────────────────────────────────────────────────
function inputCls(active: boolean) {
  return [
    "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors",
    active
      ? "border-slate-300 bg-white focus:ring-slate-900/10"
      : "border-slate-200 bg-slate-50 text-slate-600 cursor-default",
  ].join(" ");
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
