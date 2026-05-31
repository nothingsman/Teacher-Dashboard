"use client";

import { useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "motion/react";
import { Lock, CheckCircle2 } from "lucide-react";
import { completeTeacherInvitation, formatApiError } from "../../../../services";
import { ErrorBanner } from "../../../../components/ErrorBanner";

const MIN_PASSWORD_LENGTH = 8;

function validatePassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirm) {
    return "Passwords do not match.";
  }
  return null;
}

export default function CompleteTeacherInvitationPage() {
  const router = useRouter();
  const params = useParams<{ uid: string; token: string }>();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<{ title?: string; message: string; severity: "error" | "warning" | "info" } | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validationMessage = useMemo(
    () => validatePassword(password, confirm),
    [password, confirm],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = validatePassword(password, confirm);
    if (message) {
      setError({ title: "Validation", message, severity: "warning" });
      return;
    }

    setLoading(true);
    setError(null);

    const uid = params?.uid;
    const token = params?.token;
    if (!uid || !token || Array.isArray(uid) || Array.isArray(token)) {
      setError({
        title: "Invalid link",
        message: "This activation link is invalid or has expired.",
        severity: "warning",
      });
      setLoading(false);
      return;
    }

    try {
      await completeTeacherInvitation(uid, token, password);
      setSuccess(true);
      setTimeout(() => router.replace("/login"), 1600);
    } catch (err) {
      setError(formatApiError(err, "We couldn't activate your account. The link may have expired."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <Lock size={18} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Activate your account
            </h1>
            <p className="text-sm text-slate-500">
              Set a password to finish activating your teacher account.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4">
            <ErrorBanner
              title={error.title}
              message={error.message}
              severity={error.severity}
            />
          </div>
        )}

        {success ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 size={18} />
            Account activated. Redirecting to login...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="new-password"
                className="text-sm font-medium text-slate-700"
              >
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="Enter a new password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-900/40 focus:outline-none focus:ring-2 focus:ring-slate-900/15"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirm-password"
                className="text-sm font-medium text-slate-700"
              >
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-900/40 focus:outline-none focus:ring-2 focus:ring-slate-900/15"
              />
              {validationMessage && (
                <p className="text-xs text-slate-500">{validationMessage}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? "Activating..." : "Activate account"}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
