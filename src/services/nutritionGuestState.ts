import {
  normalizeDailyLog,
  normalizeEntry,
  normalizeFavorite,
  normalizeNutritionProfile,
} from "@/services/nutritionNormalization";
import { normalizeDayArchetype } from "@/services/nutritionShared";
import type {
  DailyNutritionLog,
  FavoriteFood,
  NutritionDayArchetype,
  NutritionEntry,
  NutritionProfileRecord,
} from "@/types/nutrition";
import type { NutritionGoalsLegacy } from "@/services/nutritionShared";

const GUEST_NUTRITION_ENTRIES_KEY = "appfit_guest_nutrition_entries";
const GUEST_NUTRITION_FAVORITES_KEY = "appfit_guest_nutrition_favorites";
const GUEST_NUTRITION_GOALS_KEY = "appfit_guest_nutrition_goals";
const GUEST_NUTRITION_PROFILES_KEY = "appfit_guest_nutrition_profiles";
const GUEST_DAILY_LOGS_KEY = "appfit_guest_daily_nutrition_logs";
const GUEST_DAY_ARCHETYPE_KEY = "appfit_guest_nutrition_day_archetype";
const GUEST_DAY_OVERRIDE_KEY = "appfit_guest_nutrition_day_calorie_override";

const parseJsonArray = <T>(key: string, normalizer: (row: Record<string, unknown>) => T): T[] => {
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map((row) => normalizer((row ?? {}) as Record<string, unknown>)) : [];
  } catch {
    return [];
  }
};

const saveJsonArray = (key: string, rows: unknown[]) => localStorage.setItem(key, JSON.stringify(rows));

export const parseGuestEntries = () => parseJsonArray(GUEST_NUTRITION_ENTRIES_KEY, normalizeEntry);
export const saveGuestEntries = (rows: NutritionEntry[]) => saveJsonArray(GUEST_NUTRITION_ENTRIES_KEY, rows);
export const parseGuestFavorites = () => parseJsonArray(GUEST_NUTRITION_FAVORITES_KEY, normalizeFavorite);
export const saveGuestFavorites = (rows: FavoriteFood[]) => saveJsonArray(GUEST_NUTRITION_FAVORITES_KEY, rows);
export const parseGuestProfiles = () => parseJsonArray(GUEST_NUTRITION_PROFILES_KEY, normalizeNutritionProfile);
export const saveGuestProfiles = (rows: NutritionProfileRecord[]) => saveJsonArray(GUEST_NUTRITION_PROFILES_KEY, rows);
export const parseGuestDailyLogs = () => parseJsonArray(GUEST_DAILY_LOGS_KEY, normalizeDailyLog);
export const saveGuestDailyLogs = (rows: DailyNutritionLog[]) => saveJsonArray(GUEST_DAILY_LOGS_KEY, rows);
export const saveGuestGoals = (goals: NutritionGoalsLegacy) => localStorage.setItem(GUEST_NUTRITION_GOALS_KEY, JSON.stringify(goals));

export const parseGuestDayArchetypeMap = (): Record<string, NutritionDayArchetype> => {
  const raw = localStorage.getItem(GUEST_DAY_ARCHETYPE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    const result: Record<string, NutritionDayArchetype> = {};
    Object.entries(parsed || {}).forEach(([key, value]) => {
      result[key] = normalizeDayArchetype(value);
    });
    return result;
  } catch {
    return {};
  }
};

export const saveGuestDayArchetypeMap = (value: Record<string, NutritionDayArchetype>) =>
  localStorage.setItem(GUEST_DAY_ARCHETYPE_KEY, JSON.stringify(value));

export const parseGuestDayOverrideMap = (): Record<string, number> => {
  const raw = localStorage.getItem(GUEST_DAY_OVERRIDE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, number>;
    const next: Record<string, number> = {};
    Object.entries(parsed || {}).forEach(([key, value]) => {
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0) next[key] = numeric;
    });
    return next;
  } catch {
    return {};
  }
};

export const saveGuestDayOverrideMap = (value: Record<string, number>) =>
  localStorage.setItem(GUEST_DAY_OVERRIDE_KEY, JSON.stringify(value));
