// src/services/userProfileStore.ts
// Store for user profile data fetched from /api/users/me/

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone_number?: string;
  address?: string;
  role: string;
  father_name?: string;
  grandfather_name?: string;
  verified_at?: string;
  created_at?: string;
  updated_at?: string;
}

const USER_PROFILE_KEY = 'user_profile';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function setUserProfile(profile: UserProfile) {
  if (!canUseStorage()) return;
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
}

export function getUserProfile(): UserProfile | null {
  if (!canUseStorage()) return null;
  const stored = localStorage.getItem(USER_PROFILE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as UserProfile;
  } catch {
    return null;
  }
}

export function clearUserProfile() {
  if (!canUseStorage()) return;
  localStorage.removeItem(USER_PROFILE_KEY);
}
