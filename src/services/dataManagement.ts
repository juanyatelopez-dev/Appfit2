import { supabase } from "@/services/supabaseClient";

export type ResettableDayScope =
  | "water"
  | "sleep"
  | "nutrition"
  | "biofeedback"
  | "notes"
  | "measurements"
  | "weight"
  | "checkins"
  | "tasks";

export const RESETTABLE_DAY_SCOPES: Array<{ key: ResettableDayScope; label: string; description: string }> = [
  { key: "water", label: "Agua", description: "Borra registros de hidratacion de la fecha elegida." },
  { key: "sleep", label: "Sueno", description: "Elimina logs de sueno y sus totales del dia." },
  { key: "nutrition", label: "Nutricion", description: "Borra comidas y resumenes metabolicos diarios." },
  { key: "biofeedback", label: "Biofeedback", description: "Quita la captura diaria de sensaciones." },
  { key: "notes", label: "Notas", description: "Elimina la nota diaria guardada para esa fecha." },
  { key: "measurements", label: "Medidas", description: "Borra medidas corporales del dia seleccionado." },
  { key: "weight", label: "Peso", description: "Elimina el registro de peso de esa fecha." },
  { key: "checkins", label: "Check-in", description: "Quita el check-in diario de seguimiento." },
  { key: "tasks", label: "Tareas", description: "Borra tareas creadas para esa fecha." },
];

const GUEST_KEYS = {
  waterLogs: "appfit_guest_water_logs",
  waterGoal: "appfit_guest_water_goal",
  waterPresets: "appfit_guest_water_presets",
  sleepLogs: "appfit_guest_sleep_logs",
  sleepGoal: "appfit_guest_sleep_goal",
  nutritionEntries: "appfit_guest_nutrition_entries",
  nutritionFavorites: "appfit_guest_nutrition_favorites",
  nutritionGoals: "appfit_guest_nutrition_goals",
  nutritionDayArchetype: "appfit_guest_nutrition_day_archetype",
  nutritionDayOverride: "appfit_guest_nutrition_day_calorie_override",
  bodyMeasurements: "appfit_guest_body_measurements",
  bodyMetrics: "appfit_guest_body_metrics",
  weightGoal: "appfit_guest_weight_goal",
  biofeedback: "appfit_guest_daily_biofeedback",
  dailyCheckins: "guestDailyCheckins",
  dailyNotes: "appfit_guest_daily_notes",
  dailyTasks: "guestDailyTasks",
  dailyMetricTasks: "appfit_guest_daily_metric_tasks",
  weeklyReviews: "appfit_guest_weekly_reviews",
};

const readJson = <T,>(key: string, fallback: T): T => {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const filterGuestArrayByDateKey = (key: string, dateKey: string) => {
  const rows = readJson<Array<Record<string, unknown>>>(key, []);
  writeJson(
    key,
    rows.filter((row) => row.date_key !== dateKey && row.date !== dateKey && row.measured_at !== dateKey),
  );
};

const filterGuestMapByDateKey = (key: string, dateKey: string) => {
  const map = readJson<Record<string, unknown>>(key, {});
  if (!(dateKey in map)) return;
  delete map[dateKey];
  writeJson(key, map);
};

export const clearUserDayData = async (params: {
  userId: string | null;
  dateKey: string;
  scopes: ResettableDayScope[];
  isGuest?: boolean;
}) => {
  const { userId, dateKey, scopes, isGuest = false } = params;
  if (scopes.length === 0) {
    throw new Error("Selecciona al menos una categoria.");
  }

  if (isGuest) {
    const scoped = new Set(scopes);
    if (scoped.has("water")) filterGuestArrayByDateKey(GUEST_KEYS.waterLogs, dateKey);
    if (scoped.has("sleep")) filterGuestArrayByDateKey(GUEST_KEYS.sleepLogs, dateKey);
    if (scoped.has("nutrition")) {
      filterGuestArrayByDateKey(GUEST_KEYS.nutritionEntries, dateKey);
      filterGuestMapByDateKey(GUEST_KEYS.nutritionDayArchetype, dateKey);
      filterGuestMapByDateKey(GUEST_KEYS.nutritionDayOverride, dateKey);
    }
    if (scoped.has("biofeedback")) filterGuestArrayByDateKey(GUEST_KEYS.biofeedback, dateKey);
    if (scoped.has("notes")) filterGuestArrayByDateKey(GUEST_KEYS.dailyNotes, dateKey);
    if (scoped.has("measurements")) filterGuestArrayByDateKey(GUEST_KEYS.bodyMeasurements, dateKey);
    if (scoped.has("weight")) filterGuestArrayByDateKey(GUEST_KEYS.bodyMetrics, dateKey);
    if (scoped.has("checkins")) filterGuestMapByDateKey(GUEST_KEYS.dailyCheckins, dateKey);
    if (scoped.has("tasks")) filterGuestMapByDateKey(GUEST_KEYS.dailyTasks, dateKey);
    return;
  }

  if (!userId) {
    throw new Error("No se encontro el usuario.");
  }

  const { error } = await supabase.rpc("reset_user_day", {
    p_user_id: userId,
    p_date: dateKey,
    p_scopes: scopes,
  });
  if (error) throw error;
};

export const clearUserHistory = async (params: { userId: string | null; isGuest?: boolean }) => {
  const { userId, isGuest = false } = params;

  if (isGuest) {
    localStorage.removeItem(GUEST_KEYS.waterLogs);
    localStorage.removeItem(GUEST_KEYS.sleepLogs);
    localStorage.removeItem(GUEST_KEYS.nutritionEntries);
    localStorage.removeItem(GUEST_KEYS.biofeedback);
    localStorage.removeItem(GUEST_KEYS.dailyNotes);
    localStorage.removeItem(GUEST_KEYS.bodyMeasurements);
    localStorage.removeItem(GUEST_KEYS.bodyMetrics);
    localStorage.removeItem(GUEST_KEYS.dailyCheckins);
    localStorage.removeItem(GUEST_KEYS.dailyTasks);
    localStorage.removeItem(GUEST_KEYS.nutritionDayArchetype);
    localStorage.removeItem(GUEST_KEYS.nutritionDayOverride);
    localStorage.removeItem(GUEST_KEYS.weeklyReviews);
    return;
  }

  if (!userId) {
    throw new Error("No se encontro el usuario.");
  }

  const { error } = await supabase.rpc("reset_user_history", { p_user_id: userId });
  if (error) throw error;
};

export const resetUserAccount = async (params: {
  userId: string | null;
  isGuest?: boolean;
  keepPreferences?: boolean;
}) => {
  const { userId, isGuest = false, keepPreferences = true } = params;

  if (isGuest) {
    await clearUserHistory({ userId, isGuest: true });
    localStorage.removeItem(GUEST_KEYS.waterGoal);
    localStorage.removeItem(GUEST_KEYS.waterPresets);
    localStorage.removeItem(GUEST_KEYS.sleepGoal);
    localStorage.removeItem(GUEST_KEYS.nutritionFavorites);
    localStorage.removeItem(GUEST_KEYS.nutritionGoals);
    localStorage.removeItem(GUEST_KEYS.weightGoal);
    localStorage.removeItem(GUEST_KEYS.dailyMetricTasks);
    return;
  }

  if (!userId) {
    throw new Error("No se encontro el usuario.");
  }

  const { error } = await supabase.rpc("reset_user_account", {
    p_keep_preferences: keepPreferences,
    p_user_id: userId,
  });
  if (error) {
    if (error.message?.includes("schema cache") || error.message?.includes("Could not find the function")) {
      throw new Error(
        "La funcion reset_user_account no esta disponible en tu base de Supabase. Ejecuta supabase_data_management.sql y recarga el schema cache.",
      );
    }
    throw error;
  }
};
