// src/components/ErrorBanner.tsx
import { AlertCircle, AlertTriangle, Info, X, type LucideIcon } from "lucide-react";
import type { ErrorSeverity } from "../services/errorUtils";

interface ErrorBannerProps {
  title?: string;
  message: string;
  severity?: ErrorSeverity;
  onDismiss?: () => void;
}

const severityStyles: Record<
  ErrorSeverity,
  { bg: string; border: string; text: string; icon: string; Icon: LucideIcon }
> = {
  error: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-800",
    icon: "text-rose-500",
    Icon: AlertCircle,
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    icon: "text-amber-500",
    Icon: AlertTriangle,
  },
  info: {
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-800",
    icon: "text-sky-500",
    Icon: Info,
  },
};

export function ErrorBanner({
  title,
  message,
  severity = "error",
  onDismiss,
}: ErrorBannerProps) {
  const s = severityStyles[severity];
  const Icon = s.Icon;

  return (
    <div
      className={`${s.bg} ${s.border} border rounded-xl px-4 py-3 flex items-start gap-3 shadow-sm`}
    >
      <Icon size={18} className={`${s.icon} mt-0.5 shrink-0`} />
      <div className="flex-1 min-w-0">
        {title && (
          <p className={`text-xs font-bold uppercase tracking-wider ${s.text} mb-0.5`}>
            {title}
          </p>
        )}
        <p className={`text-sm ${s.text}`}>{message}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className={`${s.text} opacity-60 hover:opacity-100 transition-opacity shrink-0`}
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

/** Shorthand: renders the error from a FormattedError object. */
export function FormattedErrorBanner({
  error,
  onDismiss,
}: {
  error: { title?: string; message: string; severity?: ErrorSeverity };
  onDismiss?: () => void;
}) {
  return (
    <ErrorBanner
      title={error.title}
      message={error.message}
      severity={error.severity}
      onDismiss={onDismiss}
    />
  );
}
