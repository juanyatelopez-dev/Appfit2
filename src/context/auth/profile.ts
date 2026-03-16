import type { Profile } from "@/context/auth/types";

export const createGuestProfile = (): Profile => ({
  full_name: "Guest",
  birth_date: null,
  avatar_url: null,
  weight: null,
  height: null,
  biological_sex: "male",
  activity_level: "moderate",
  nutrition_goal_type: "maintain",
  day_archetype: "base",
  goal_type: null,
  target_weight_kg: null,
  target_date: null,
  start_weight_kg: null,
  goal_direction: null,
  water_goal_ml: 2000,
  water_quick_options_ml: [250, 500, 1000, 2000],
  sleep_goal_minutes: 480,
  calorie_goal: 2000,
  protein_goal_g: 150,
  carb_goal_g: 250,
  fat_goal_g: 70,
  onboarding_completed: true,
  app_language: "en",
  theme_preference: "system",
  theme_accent_color: "cyan",
  theme_background_style: "focus",
});

export const createEmptyProfile = (): Profile => ({
  full_name: null,
  birth_date: null,
  avatar_url: null,
  weight: null,
  height: null,
  biological_sex: "male",
  activity_level: "moderate",
  nutrition_goal_type: "maintain",
  day_archetype: "base",
  goal_type: null,
  target_weight_kg: null,
  target_date: null,
  start_weight_kg: null,
  goal_direction: null,
  water_goal_ml: 2000,
  water_quick_options_ml: [250, 500, 1000, 2000],
  sleep_goal_minutes: 480,
  calorie_goal: 2000,
  protein_goal_g: 150,
  carb_goal_g: 250,
  fat_goal_g: 70,
  onboarding_completed: null,
  app_language: "en",
  theme_preference: "system",
  theme_accent_color: "cyan",
  theme_background_style: "focus",
});

export const deriveOnboardingCompleted = (resolvedProfile: Profile | null) => {
  if (!resolvedProfile) return false;
  if (resolvedProfile.onboarding_completed === true) return true;
  if (resolvedProfile.onboarding_completed === false) return false;

  return Boolean(
    resolvedProfile.full_name &&
      resolvedProfile.weight !== null &&
      resolvedProfile.height !== null &&
      resolvedProfile.goal_type,
  );
};

export const resolveOnboardingCompleted = (resolvedProfile: Profile | null, cachedCompleted: boolean | null) => {
  if (!resolvedProfile) return cachedCompleted === true;

  if (resolvedProfile.onboarding_completed === true) return true;
  if (resolvedProfile.onboarding_completed === false) return false;

  return cachedCompleted === true || deriveOnboardingCompleted(resolvedProfile);
};
