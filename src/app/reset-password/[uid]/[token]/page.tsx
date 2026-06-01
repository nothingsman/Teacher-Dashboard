"use client";

import { useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { resetPasswordConfirm, formatAuthError, validatePassword } from "../../../../services";

export default function ResetPasswordPage() {
  const params = useParams<{ uid: string; token: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const validation = validatePassword(password);
    if (!validation.valid) {
      setError(validation.message ?? "Password does not meet requirements.");
      setLoading(false);
      return;
    }

    const uid = params.uid;
    const token = params.token;

    try {
      await resetPasswordConfirm(uid, token, password);
      setSuccess(true);
      setTimeout(() => {
        router.push("/login?reset=true");
      }, 3000);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#1A237E] to-[#283593] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A237E]/95 via-[#1A237E]/60 to-transparent" />
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Set a new password</h2>
          <p className="max-w-md text-base text-blue-200 md:text-lg">
            Choose a strong password that you haven&apos;t used before.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-white">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-8"
            >
              <ArrowLeft size={16} />
              Back to login
            </Link>

            {!success ? (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                    Reset password
                  </h1>
                  <p className="text-slate-600">
                    Enter your new password below.
                  </p>
                </div>

                {error && (
                  <div className="mb-6">
                    <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-start gap-3 shadow-sm">
                      <AlertCircle size={18} className="text-rose-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-rose-800 flex-1">{error}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                      New password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="new-password"
                        placeholder="Enter new password"
                        disabled={loading}
                        className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1A237E] transition-all text-sm bg-slate-50 focus:bg-white disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-700">
                      Confirm new password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirm ? "text" : "password"}
                        required
                        autoComplete="new-password"
                        placeholder="Confirm new password"
                        disabled={loading}
                        className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1A237E] transition-all text-sm bg-slate-50 focus:bg-white disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label={showConfirm ? "Hide password" : "Show password"}
                      >
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#1A237E] text-white font-semibold hover:bg-blue-900 transition disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      "Reset password"
                    )}
                  </button>
                </form>

                <div className="mt-4 text-xs text-slate-500">
                  <p>Password must:</p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>Be at least 8 characters</li>
                    <li>Have at least one uppercase letter</li>
                    <li>Have at least one lowercase letter</li>
                    <li>Have at least one number</li>
                    <li>Have at least one special character</li>
                  </ul>
                </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="flex justify-center mb-6">
                  <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="h-7 w-7 text-emerald-600" />
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                  Password reset
                </h1>
                <p className="text-slate-600 mb-6">
                  Your password has been reset successfully. Redirecting to login...
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
