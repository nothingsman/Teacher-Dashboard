"use client";

import Image from "next/image";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { CheckCircle, Eye, EyeOff, Lock, LogIn, Mail } from "lucide-react";
import { motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginTeacher, formatApiError } from "../../services";
import { getAccessToken } from "../../services/authStore";
import { ErrorBanner } from "../../components/ErrorBanner";
import { LegalModal, TermsOfService, PrivacyPolicy } from "../../components/LegalModal";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reset = searchParams.get("reset") === "true";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ title?: string; message: string; severity: "error" | "warning" | "info" } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    const existingToken = getAccessToken();
    if (existingToken) {
      router.replace("/");
    }
  }, [router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setError({
        title: "Missing fields",
        message: "Please enter both your email and password.",
        severity: "warning",
      });
      setLoading(false);
      return;
    }

    try {
      await loginTeacher(email, password);

      router.replace("/");
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#1A237E] to-[#283593] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1200&h=1200&fit=crop&q=80"
            alt="Teacher workspace"
            fill
            priority
            quality={85}
            sizes="50vw"
            className="object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A237E]/95 via-[#1A237E]/60 to-transparent" />
        </div>
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Welcome back, teacher</h2>
          <p className="max-w-md text-base text-blue-200 md:text-lg">
            Sign in to manage classes, track progress, and stay in sync with parents and students.
          </p>
          <div className="mt-8 flex items-center gap-2 text-sm text-blue-300">
            <span>Photo by</span>
            <a
              href="https://unsplash.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white transition-colors"
            >
              Unsplash
            </a>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-white">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Teacher login</h1>
              <p className="text-slate-600">
                Use the email from your invitation.
              </p>
            </div>

            {reset && (
              <div className="mb-6">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-start gap-3 shadow-sm">
                  <CheckCircle size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-emerald-800 flex-1">
                    Your password has been reset! You can now login with your new password.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6">
                <ErrorBanner
                  title={error.title}
                  message={error.message}
                  severity={error.severity}
                  onDismiss={() => setError(null)}
                />
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
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1A237E] transition-all text-sm bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1A237E] transition-all text-sm bg-slate-50 focus:bg-white"
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

              <div className="flex justify-end">
                <a
                  href="/forgot-password"
                  className="text-sm font-medium text-[#1A237E] hover:text-blue-800 transition-colors"
                >
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#1A237E] text-white font-semibold hover:bg-blue-900 transition disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in"}
                <LogIn size={18} />
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-500">
              By clicking continue, you agree to our{" "}
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="underline hover:text-slate-700 font-medium"
              >
                Terms of Service
              </button>{" "}
              and{" "}
              <button
                type="button"
                onClick={() => setShowPrivacy(true)}
                className="underline hover:text-slate-700 font-medium"
              >
                Privacy Policy
              </button>
              .
            </p>
          </motion.div>
        </div>
      </div>

      <LegalModal isOpen={showTerms} onClose={() => setShowTerms(false)} title="Terms of Service">
        <TermsOfService />
      </LegalModal>

      <LegalModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} title="Privacy Policy">
        <PrivacyPolicy />
      </LegalModal>
    </div>
  );
}

export default function TeacherLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-500">Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}
