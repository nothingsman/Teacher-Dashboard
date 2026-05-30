// src/services/authStore.ts

const ACCESS_KEY = "teacher_access_token";
const REFRESH_KEY = "teacher_refresh_token";
const TEACHER_ID_KEY = "teacher_id";
const ROLE_KEY = "teacher_role";
const TEACHER_ORG_KEY = "teacher_organization_id";
const TEACHER_BRANCH_KEY = "teacher_branch_id";

export type JwtPayload = Record<string, unknown>;

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getAccessToken() {
  if (!canUseStorage()) return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  if (!canUseStorage()) return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string) {
  if (!canUseStorage()) return;
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  if (!canUseStorage()) return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(TEACHER_ID_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(TEACHER_ORG_KEY);
  localStorage.removeItem(TEACHER_BRANCH_KEY);
}

export function setTeacherId(teacherId: string) {
  if (!canUseStorage()) return;
  localStorage.setItem(TEACHER_ID_KEY, teacherId);
}

export function getTeacherId() {
  if (!canUseStorage()) return null;
  const stored = localStorage.getItem(TEACHER_ID_KEY);
  if (stored) return stored;
  const token = getAccessToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token) as Record<string, unknown> | null;
  if (!payload) return null;
  const candidates = [
    payload.teacher_id,
    payload.teacherId,
    payload.teacher,
  ];
  const teacherId = candidates.find((item) => typeof item === "string") as string | undefined;
  if (teacherId) {
    setTeacherId(teacherId);
    return teacherId;
  }
  return null;
}

export function setTeacherRole(role: string) {
  if (!canUseStorage()) return;
  localStorage.setItem(ROLE_KEY, role);
}

export function getTeacherRole() {
  if (!canUseStorage()) return null;
  return localStorage.getItem(ROLE_KEY);
}

export function setTeacherOrganization(orgId: string) {
  if (!canUseStorage()) return;
  localStorage.setItem(TEACHER_ORG_KEY, orgId);
}

export function getTeacherOrganization(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(TEACHER_ORG_KEY);
}

export function setTeacherBranch(branchId: string) {
  if (!canUseStorage()) return;
  localStorage.setItem(TEACHER_BRANCH_KEY, branchId);
}

export function getTeacherBranch(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(TEACHER_BRANCH_KEY);
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}
