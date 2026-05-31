// src/services/errorUtils.ts
// Centralized error formatting — maps API errors to user-friendly messages

export type ErrorSeverity = "error" | "warning" | "info";

export interface FormattedError {
  title: string;
  message: string;
  severity: ErrorSeverity;
}

/**
 * Maps an unknown error (ApiError, Fetch, string, etc.) to a
 * user-friendly { title, message, severity } object.
 *
 * Severity guides the UI colour:
 *   "error"   → rose/red   — something is broken, action may be blocked
 *   "warning" → amber      — user can retry or adjust input
 *   "info"    → slate/blue — informational
 */
export function formatApiError(err: unknown, fallback?: string): FormattedError {
  const fallbackMsg = fallback ?? "Something unexpected happened. Please try again.";

  if (!err) {
    return { title: "Error", message: fallbackMsg, severity: "error" };
  }

  // If it's already a FormattedError, return as-is
  if (typeof err === "object" && err !== null && "severity" in err && "message" in err) {
    return err as FormattedError;
  }

  const status = extractStatus(err);

  // Network / connection failure
  if (status === 0) {
    return {
      title: "Connection error",
      message: "Unable to reach the server. Check your internet connection and try again.",
      severity: "warning",
    };
  }

  // Auth
  if (status === 401) {
    return {
      title: "Invalid credentials",
      message: "The email or password you entered is incorrect.",
      severity: "error",
    };
  }

  // Permission / account not activated
  if (status === 403) {
    return {
      title: "Access denied",
      message: "You don't have permission to perform this action. Your account may not be activated yet.",
      severity: "warning",
    };
  }

  // Not found
  if (status === 404) {
    return {
      title: "Not found",
      message: "We couldn't find what you're looking for. It may have been removed.",
      severity: "warning",
    };
  }

  // Rate limited
  if (status === 429) {
    return {
      title: "Too many attempts",
      message: "Please wait a moment before trying again.",
      severity: "warning",
    };
  }

  // Client validation (400)
  if (status === 400) {
    return {
      title: "Invalid input",
      message: extractMessage(err) || "Please check your information and try again.",
      severity: "warning",
    };
  }

  // Server errors (500+)
  if (status !== null && status >= 500) {
    return {
      title: "Server error",
      message: "Something went wrong on our end. Please try again later.",
      severity: "error",
    };
  }

  // Fallback — use the raw message if it looks user-friendly
  const raw = extractMessage(err);
  if (raw && !looksTechnical(raw)) {
    return { title: "Error", message: raw, severity: "error" };
  }

  return { title: "Error", message: fallbackMsg, severity: "error" };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function extractStatus(err: unknown): number | null {
  if (err && typeof err === "object") {
    const asAny = err as Record<string, unknown>;
    if (typeof asAny.status === "number") return asAny.status;
    // Some errors have status as own property (ApiError)
    if (err instanceof Error && "status" in err) {
      const st = (err as unknown as { status: number }).status;
      if (typeof st === "number") return st;
    }
  }
  // "Failed to fetch" and similar network errors from fetch()
  if (err instanceof TypeError && err.message === "Failed to fetch") {
    return 0;
  }
  return null;
}

function extractMessage(err: unknown): string | null {
  if (!err) return null;
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || null;
  if (typeof err === "object") {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === "string") return obj.message;
  }
  return null;
}

/** Heuristic: if the message contains code-ish patterns, treat it as technical. */
function looksTechnical(msg: string): boolean {
  const patterns = [
    /^Unexpected token/i,
    /^JSON\.parse/i,
    /^Cannot read/i,
    /is not defined/i,
    /networkerror/i,
    /failed to fetch/i,
    /load failed/i,
    /status \d+/i,
    /<html/i,
    /<!doctype/i,
    /internal server error/i,
    /traceback/i,
  ];
  return patterns.some((re) => re.test(msg));
}
