"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { getTeacherProfile, type TeacherProfile } from "../../services";
import { getAccessToken } from "../../services/authStore";
import { ArrowLeft, User, GraduationCap } from "lucide-react";
import { formatApiError } from "../../services/errorUtils";
import { ErrorBanner } from "../../components/ErrorBanner";

function ProfileInner() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ title?: string; message: string; severity: "error" | "warning" | "info" } | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { router.replace("/login"); return; }
    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    setLoading(true);
    getTeacherProfile()
      .then((data) => setProfile(data))
      .catch((err) => setError(formatApiError(err, "Failed to load profile.")))
      .finally(() => setLoading(false));
  }, [authChecked]);

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
          <ErrorBanner
            title={error.title}
            message={error.message}
            severity={error.severity}
            onDismiss={() => setError(null)}
          />
        )}

        {loading ? (
          <div className="text-sm text-slate-500 py-10 text-center">Loading profile…</div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="bg-white border border-slate-100 rounded-3xl shadow-sm p-8"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-[#1A237E] text-white flex items-center justify-center font-bold text-lg">
                  {profile?.initials ?? "T"}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Profile Details</h1>
                  <p className="text-xs text-slate-500">Personal & employment information</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full Name" value={profile?.name ?? "—"} />
                <Field label="Email" value={profile?.email ?? "—"} />
                <Field label="Role" value={profile?.role ?? "Teacher"} />
                <Field label="Employee ID" value={profile?.employeeId ?? "—"} />
                <Field label="Specialization" value={profile?.specialization ?? "—"} />
                <Field label="Joining Date" value={profile?.joiningDate ?? "—"} />
              </div>

              {profile?.bio && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <Field label="Bio" value={profile.bio} />
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 }}
              className="bg-white border border-slate-100 rounded-3xl shadow-sm p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                  <GraduationCap size={18} className="text-slate-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Qualifications</h2>
                  <p className="text-xs text-slate-500">
                    {profile?.qualifications?.length ?? 0} listed
                  </p>
                </div>
              </div>

              <div className="space-y-3">
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
                ) : (
                  <p className="text-sm text-slate-400 italic">No qualifications listed.</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}

export default function TeacherProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-500">Loading profile…</div>}>
      <ProfileInner />
    </Suspense>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        {value}
      </div>
    </div>
  );
}
