import type { LocalizedNutritionText, NutritionDayArchetype, NutritionMetabolicProfile } from "@/types/nutrition";

export type NutritionProfileLike = {
  birth_date?: string | null;
  weight?: number | null;
  height?: number | null;
  goal_type?: string | null;
  goal_direction?: "lose" | "gain" | "maintain" | null;
  biological_sex?: string | null;
  activity_level?: string | null;
  nutrition_goal_type?: string | null;
  day_archetype?: string | null;
};

export type NutritionGoalOptions = {
  isGuest?: boolean;
  timeZone?: string;
  date?: Date;
  profile?: NutritionProfileLike | null;
  includeArchivedProfiles?: boolean;
  language?: "en" | "es";
};

export type NutritionGoalsLegacy = {
  calorie_goal: number;
  protein_goal_g: number;
  carb_goal_g: number;
  fat_goal_g: number;
};

export type UpsertNutritionProfileInput = {
  id?: string;
  name: string;
  archetype: NutritionDayArchetype;
  is_default?: boolean;
};

export type ResolvePlanOptions = NutritionGoalOptions & {
  forceProfileId?: string | null;
  clearProfileSelection?: boolean;
  forceDayArchetype?: NutritionDayArchetype;
  forceCalorieOverride?: number | null;
};

export const DEFAULT_NUTRITION_GOALS: NutritionGoalsLegacy = {
  calorie_goal: 2000,
  protein_goal_g: 150,
  carb_goal_g: 250,
  fat_goal_g: 70,
};

export const DEFAULT_METABOLIC_PROFILE: NutritionMetabolicProfile = {
  sex: "male",
  age: 30,
  weightKg: 75,
  heightCm: 175,
  activityLevel: "moderate",
  goalType: "maintain",
  dayArchetype: "base",
  birthDate: null,
  calorieOverride: null,
  isCalorieOverrideEnabled: false,
};

export const isSchemaError = (error: unknown) => {
  const message = (error as { message?: string } | null)?.message?.toLowerCase() ?? "";
  return (
    message.includes("schema cache") ||
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("column") ||
    message.includes("relation")
  );
};

export const sanitizeNumber = (value: unknown, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const normalizeLocalizedNutritionText = (value: unknown): LocalizedNutritionText | null => {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const next: LocalizedNutritionText = {};
  if (typeof row.en === "string" && row.en.trim()) next.en = row.en.trim();
  if (typeof row.es === "string" && row.es.trim()) next.es = row.es.trim();
  return Object.keys(next).length > 0 ? next : null;
};

export const getLocalizedNutritionText = (
  value: LocalizedNutritionText | null | undefined,
  language: "en" | "es" | undefined,
  fallback: string | null | undefined,
) => {
  const preferred = language ? value?.[language]?.trim() : "";
  if (preferred) return preferred;
  const alternate = language === "es" ? value?.en?.trim() : value?.es?.trim();
  if (alternate) return alternate;
  return fallback?.trim() || "";
};

export const normalizeSex = (value: string | null | undefined): "male" | "female" => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["female", "f", "woman", "mujer", "femenino"].includes(normalized)) return "female";
  return "male";
};

export const normalizeActivityLevel = (value: string | null | undefined): NutritionMetabolicProfile["activityLevel"] => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["low", "bajo", "sedentary"].includes(normalized)) return "low";
  if (["moderate", "moderado", "medium"].includes(normalized)) return "moderate";
  if (["high", "alto", "active"].includes(normalized)) return "high";
  if (["very_high", "very high", "muy_alto", "muy alto"].includes(normalized)) return "very_high";
  if (["hyperactive", "hiperactivo", "extreme"].includes(normalized)) return "hyperactive";
  return "moderate";
};

export const normalizeGoalType = (value: string | null | undefined): NutritionMetabolicProfile["goalType"] => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["lose_slow", "lose slow", "perder peso lentamente", "slow cut", "deficit moderado"].some((item) => normalized.includes(item))) return "lose_slow";
  if (["lose", "lose weight", "bajar", "bajar de peso", "fat loss", "cut"].some((item) => normalized.includes(item))) return "lose";
  if (["gain_slow", "gain slow", "aumentar peso lentamente", "superavit moderado"].some((item) => normalized.includes(item))) return "gain_slow";
  if (["gain", "build", "muscle", "bulk", "aumentar", "ganar"].some((item) => normalized.includes(item))) return "gain";
  return "maintain";
};

export const normalizeDayArchetype = (value: string | null | undefined): NutritionDayArchetype => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["heavy", "pesado", "hard"].includes(normalized)) return "heavy";
  if (["recovery", "descanso", "rest"].includes(normalized)) return "recovery";
  return "base";
};
