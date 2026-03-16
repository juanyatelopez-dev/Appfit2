import type { User } from "@supabase/supabase-js";

export type AccountRole = "member" | "admin_manager" | "super_admin";
export type AccountStatus = "active" | "suspended";

export interface Profile {
  full_name: string | null;
  birth_date: string | null;
  avatar_url: string | null;
  weight: number | null;
  height: number | null;
  biological_sex: "male" | "female" | null;
  activity_level: "low" | "moderate" | "high" | "very_high" | "hyperactive" | null;
  nutrition_goal_type: "lose" | "lose_slow" | "maintain" | "gain_slow" | "gain" | null;
  day_archetype: "base" | "heavy" | "recovery" | null;
  goal_type: string | null;
  target_weight_kg: number | null;
  target_date: string | null;
  start_weight_kg: number | null;
  goal_direction: "lose" | "gain" | "maintain" | null;
  water_goal_ml: number | null;
  water_quick_options_ml: number[] | null;
  sleep_goal_minutes: number | null;
  calorie_goal: number | null;
  protein_goal_g: number | null;
  carb_goal_g: number | null;
  fat_goal_g: number | null;
  onboarding_completed: boolean | null;
  app_language: "en" | "es" | null;
  theme_preference: "light" | "dark" | "system" | null;
  theme_accent_color: string | null;
  theme_background_style: string | null;
  timezone: string | null;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  accountRoleLoading: boolean;
  onboardingCompleted: boolean | null;
  profile: Profile | null;
  accountRole: AccountRole;
  canAccessAdmin: boolean;
  canManageAdminRoles: boolean;
  isGuest: boolean;
  continueAsGuest: () => void;
  exitGuest: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ requiresEmailConfirmation: boolean }>;
  resendConfirmationEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateAvatar: (file: File) => Promise<string>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
}
