// src/services/authService.ts

import { request } from "./apiClient";
import {
  clearTokens,
  decodeJwtPayload,
  getAccessToken,
  getTeacherId,
  setTeacherId,
  setTeacherRole,
  setTokens,
} from "./authStore";
import { setUserProfile, clearUserProfile } from "./userProfileStore";
import { ensureAccessToken } from "./apiClient";

export type JwtLoginResponse = {
  access: string;
  refresh: string;
};

export type CompleteInvitationResponse = {
  detail?: string;
  message?: string;
};

type AuthUserResponse = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
};


const TEACHER_ROLE_MATCH = "teacher";

export function isTeacherRole(role?: string | null) {
  if (!role) return false;
  return role.toLowerCase().includes(TEACHER_ROLE_MATCH);
}

function extractTeacherId(payload: Record<string, unknown> | null) {
  if (!payload) return null;
  const candidates = [
    payload.teacher_id,
    payload.teacherId,
    payload.teacher,
    payload.user_id,
    payload.userId,
    payload.sub,
  ];
  const value = candidates.find((item) => typeof item === "string") as string | undefined;
  return value ?? null;
}

async function hydrateTeacherSession(
  fallbackEmail?: string,
): Promise<{ teacherId: string; role: string | null }> {
  const user = await request<AuthUserResponse>("GET", "/api/users/me/");
  const role = user.role ?? null;
  if (!isTeacherRole(role)) {
    clearTokens();
    clearUserProfile();
    throw new Error("This account is not a teacher. Please contact your administrator.");
  }

  if (role) {
    setTeacherRole(role);
  }

  setUserProfile({
    id: user.id,
    name: user.name || "",
    email: user.email || "",
    role: role || "",
  });

  let teacherId = getTeacherId() || user.id;

  try {
    const searchValue = user.name || user.email || fallbackEmail || user.id;
    const teacherLookup = await request<{ results?: Array<{ id: string; user_email?: string; user?: string }> } | Array<{ id: string; user_email?: string; user?: string }>>(
      "GET",
      `/api/teachers/?search=${encodeURIComponent(searchValue)}`
    );

    const teacherResults = Array.isArray(teacherLookup)
      ? teacherLookup
      : teacherLookup.results || [];

    const matchedTeacher =
      teacherResults.find((item) =>
        item.user_email?.toLowerCase() === (user.email || fallbackEmail || "").toLowerCase()
      ) ||
      teacherResults.find((item) => item.user === user.id) ||
      teacherResults[0];

    if (matchedTeacher?.id) {
      teacherId = matchedTeacher.id;
    }
  } catch {
    // Fall back to the stored or user id if the teacher lookup fails.
  }

  setTeacherId(teacherId);
  return { teacherId, role };
}

export async function loginTeacher(email: string, password: string) {
  const data = await request<JwtLoginResponse>(
    "POST",
    "/auth/jwt/create/",
    { email, password },
    { skipAuth: true }
  );

  const payload = decodeJwtPayload(data.access) as Record<string, unknown> | null;
  const userId = extractTeacherId(payload);
  if (!userId) {
    clearTokens();
    throw new Error("Unable to verify your account. Please contact your administrator.");
  }

  setTokens(data.access, data.refresh);
  const { teacherId, role } = await hydrateTeacherSession(email);

  return { ...data, teacherId, role };
}

export async function restoreTeacherSession(): Promise<boolean> {
  const token = await ensureAccessToken();
  if (!token && !getAccessToken()) {
    return false;
  }

  try {
    await hydrateTeacherSession();
    return true;
  } catch {
    clearTokens();
    clearUserProfile();
    return false;
  }
}

export async function completeTeacherInvitation(
  uid: string,
  token: string,
  newPassword: string,
): Promise<CompleteInvitationResponse> {
  return request<CompleteInvitationResponse>(
    "POST",
    "/api/teachers/complete-invitation/",
    {
      uid,
      token,
      new_password: newPassword,
    },
    { skipAuth: true },
  );
}

export function logoutTeacher() {
  clearTokens();
  clearUserProfile();
}
