"use client";

import { useState, type FormEvent } from "react";
import { Mail, ArrowLeft, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { resetPassword, formatAuthError } from "../../services";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const emailValue = String(formData.get("email") ?? "").trim();
    setEmail(emailValue);

    if (!emailValue) {
      setError("Please enter your email address.");
      setLoading(false);
      return;
    }

    try {
      await resetPassword(emailValue);
      setSuccess(true);
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
          <h2 className="text-3xl font-bold mb-4">Reset your password</h2>
          <p className="max-w-md text-base text-blue-200 md:text-lg">
            Enter the email associated with your account and we&apos;ll send you a
            link to reset your password.
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
                    Forgot password?
                  </h1>
                  <p className="text-slate-600">
                    No worries, we&apos;ll send you reset instructions.
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
                    <label htmlFor="email" className="text-sm font-semibold text-slate-700">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="teacher@school.com"
                        defaultValue={email}
                        disabled={loading}
                        className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1A237E] transition-all text-sm bg-slate-50 focus:bg-white disabled:opacity-60"
                      />
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
                        Sending...
                      </>
                    ) : (
                      "Send reset link"
                    )}
                  </button>
                </form>
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
                  Check Your Email
                </h1>
                <p className="text-slate-600 mb-2">
                  We sent a password reset link to
                </p>
                <p className="text-sm font-semibold text-slate-900 mb-6">{email}</p>
                <div className="text-sm text-slate-500 space-y-2">
                  <p>Check your inbox and click the reset link.</p>
                  <p>You&apos;ll be asked to enter a new password.</p>
                  <p>Then log in with your new password.</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
