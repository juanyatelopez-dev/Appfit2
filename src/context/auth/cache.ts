import type { Profile } from "@/context/auth/types";

const ONBOARDING_CACHE_KEY_PREFIX = "appfit_onboarding_completed_";
const PROFILE_CACHE_KEY_PREFIX = "appfit_profile_cache_";

const getOnboardingCacheKey = (userId: string) => `${ONBOARDING_CACHE_KEY_PREFIX}${userId}`;
const getProfileCacheKey = (userId: string) => `${PROFILE_CACHE_KEY_PREFIX}${userId}`;

export const getCachedOnboarding = (userId: string): boolean | null => {
  const raw = localStorage.getItem(getOnboardingCacheKey(userId));
  if (raw === null) return null;
  return raw === "true";
};

export const setCachedOnboarding = (userId: string, value: boolean) => {
  localStorage.setItem(getOnboardingCacheKey(userId), value ? "true" : "false");
};

export const getCachedProfile = (userId: string): Profile | null => {
  const raw = localStorage.getItem(getProfileCacheKey(userId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
};

export const setCachedProfile = (userId: string, profile: Profile) => {
  localStorage.setItem(getProfileCacheKey(userId), JSON.stringify(profile));
};
