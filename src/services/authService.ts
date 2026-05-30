// src/services/authService.ts

import { request } from "./apiClient";
import {
  clearTokens,
  decodeJwtPayload,
  getTeacherId,
  setTeacherId,
  setTeacherRole,
  setTokens,
} from "./authStore";
import { setUserProfile, clearUserProfile } from "./userProfileStore";

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

  const user = await request<AuthUserResponse>("GET", "/api/users/me/");
  const role = user.role ?? null;
  if (!isTeacherRole(role)) {
    clearTokens();
    throw new Error("This account is not a teacher. Please contact your administrator.");
  }

  if (role) {
    setTeacherRole(role);
  }

  // Store the user profile for later use
  console.log('💾 Storing user profile:', { id: user.id, name: user.name, email: user.email, role });
  setUserProfile({
    id: user.id,
    name: user.name || '',
    email: user.email || '',
    role: role || '',
  });

  // Try to find the teacher record by searching for one with this user
  let teacherId = user.id;
  
  try {
    // Try to search for a teacher by email or name
    const searchValue = user.name || user.email || email;
    console.log(`🔍 Searching for teacher with: ${searchValue}`);
    
    const teacherLookup = await request<{ results?: Array<{ id: string; user_email?: string; user?: string }> } | Array<{ id: string; user_email?: string; user?: string }>>(
      "GET",
      `/api/teachers/?search=${encodeURIComponent(searchValue)}`
    );

    const teacherResults = Array.isArray(teacherLookup)
      ? teacherLookup
      : teacherLookup.results || [];

    console.log(`📋 Found ${teacherResults.length} teacher(s)`, teacherResults);

    // Try to match by user_email first
    let matchedTeacher = teacherResults.find((item) =>
      item.user_email?.toLowerCase() === (user.email || email).toLowerCase()
    );

    // If no match by email, try to match by user ID
    if (!matchedTeacher) {
      matchedTeacher = teacherResults.find((item) =>
        item.user === user.id
      );
    }

    // If still no match, use the first result
    if (!matchedTeacher && teacherResults.length > 0) {
      matchedTeacher = teacherResults[0];
    }

    if (matchedTeacher?.id) {
      teacherId = matchedTeacher.id;
      console.log(`✅ Found teacher record: ${teacherId}`);
    } else {
      console.warn(`⚠️ No teacher record found, using user ID as fallback: ${user.id}`);
    }
  } catch (searchError) {
    console.warn(`⚠️ Teacher search failed, using user ID as fallback:`, searchError);
    // Continue with user.id as fallback
  }

  setTeacherId(teacherId);

  return { ...data, teacherId, role };
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
