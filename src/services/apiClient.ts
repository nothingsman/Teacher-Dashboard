// src/services/apiClient.ts

/**
 * Typed error thrown by the API client for both HTTP-level failures
 * (status 4xx/5xx) and non-HTTP failures (network timeout, JSON parse
 * errors, etc.).  Non-HTTP failures use status 0.
 */
export class ApiError extends Error {
  public status: number;

  constructor(message: string, status: number) {
    super(message);
    this.message = message;
    this.status = status;
    // Restore prototype chain so `instanceof ApiError` works after transpilation
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  decodeJwtPayload,
} from "./authStore";
import { clearUserProfile } from "./userProfileStore";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestOptions = {
  skipAuth?: boolean;
  headers?: Record<string, string>;
};

type TokenRefreshResponse = {
  access: string;
  refresh?: string;
};

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
let onUnauthorized: () => void = () => {
  clearTokens();
  clearUserProfile();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
};

export function configureUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

export function handleUnauthorized() {
  onUnauthorized();
}

async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        console.warn("⚠️ No refresh token available");
        return null;
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!baseUrl) {
        console.warn("⚠️ API base URL not configured");
        return null;
      }

      const url = baseUrl + "/auth/jwt/refresh/";
      console.log(`🔄 Attempting to refresh access token from: ${url}`);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!res.ok) {
        console.error(`❌ Token refresh failed with status ${res.status}`);
        return null;
      }

      const data = (await res.json()) as TokenRefreshResponse;
      const newAccessToken = data.access;
      const newRefreshToken = data.refresh || refreshToken;

      setTokens(newAccessToken, newRefreshToken);
      console.log("✅ Access token refreshed successfully");

      return newAccessToken;
    } catch (error) {
      console.error("❌ Token refresh error:", error);
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function isExpiredToken(token: string): boolean {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== "number") return false;
  return exp * 1000 <= Date.now();
}

export async function ensureAccessToken(forceRefresh = false): Promise<string | null> {
  const token = getAccessToken();
  if (!forceRefresh && token && !isExpiredToken(token)) {
    return token;
  }

  const refreshedToken = await refreshAccessToken();
  if (refreshedToken) {
    return refreshedToken;
  }

  onUnauthorized();
  return null;
}

/**
 * Shared HTTP client used by every service module in real mode.
 *
 * Mock mode  — `NEXT_PUBLIC_API_BASE_URL` is not set:
 *   Throws immediately so callers know they must use the Mock Adapter
 *   instead of delegating to this function.
 *
 * Real mode  — `NEXT_PUBLIC_API_BASE_URL` is set:
 *   Calls `fetch(baseUrl + path, …)`, parses the JSON response, and
 *   throws `ApiError` on non-2xx responses or any network/parse failure.
 */
export async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    // Mock mode — service modules should never reach this path; they
    // return mock data directly before calling request().
    throw new Error("Mock mode: use service Mock Adapter directly");
  }

  const url = baseUrl + path;
  console.log(`📡 [${method}] ${url}`);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (!options.skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      console.log(`🔐 Authorization header set`);
    } else {
      console.warn(`⚠️ No access token found`);
    }
  }

  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  const init: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined && method !== "GET" && method !== "DELETE") {
    init.body = JSON.stringify(body);
  }

  try {
    let res = await fetch(url, init);
    console.log(`📊 Response status: ${res.status}`);

    // Handle 401 Unauthorized - try to refresh token and retry
    if (res.status === 401 && !options.skipAuth) {
      console.log("🔄 Received 401, attempting to refresh token...");
      const newToken = await refreshAccessToken();

      if (newToken) {
        console.log("🔄 Retrying request with new token...");
        // Update headers with new token
        headers.Authorization = `Bearer ${newToken}`;
        const retryInit: RequestInit = {
          method,
          headers,
        };
        if (body !== undefined && method !== "GET" && method !== "DELETE") {
          retryInit.body = JSON.stringify(body);
        }
        res = await fetch(url, retryInit);
        console.log(`📊 Retry response status: ${res.status}`);
      } else {
        onUnauthorized();
        throw new ApiError("Session expired. Please sign in again.", 401);
      }
    }

    if (res.status === 401 && !options.skipAuth) {
      onUnauthorized();
      throw new ApiError("Session expired. Please sign in again.", 401);
    }

    if (!res.ok) {
      // HTTP error — extract a human-readable message from the body when
      // possible, then throw with the real HTTP status code.
      let message: string;
      try {
        message = await res.text();
      } catch {
        message = res.statusText;
      }

      const trimmed = message?.trim() || "";
      const looksLikeHtml =
        trimmed.startsWith("<!DOCTYPE html>") || trimmed.includes("<html");
      if (looksLikeHtml) {
        message = "Request failed. Please try again or contact support.";
      }

      if (process.env.NODE_ENV === 'development') {
        console.warn(`⚠️ API ${res.status}: ${message.slice(0, 200)}`);
      }
      throw new ApiError(
        message || res.statusText || `HTTP ${res.status}`,
        res.status,
      );
    }

    // Parse JSON response.
    try {
      const data = (await res.json()) as T;
      console.log(`✅ Response data:`, data);
      return data;
    } catch (parseErr) {
      console.error(`❌ JSON parse error:`, parseErr);
      throw new ApiError(
        (parseErr as Error).message || "Failed to parse JSON response",
        0,
      );
    }
  } catch (err) {
    // Re-throw ApiError instances unchanged.
    if (err instanceof ApiError) throw err;

    // Wrap any other error (network timeout, DNS failure, etc.) as an
    // ApiError with status 0.
    console.error(`❌ Network error:`, err);
    throw new ApiError((err as Error).message || "Network error", 0);
  }
}
