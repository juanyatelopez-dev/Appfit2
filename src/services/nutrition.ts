import { DEFAULT_WATER_TIMEZONE, createDateKeyRange, getDateKeyForTimezone } from "@/features/water/waterUtils";
import { calculateNutrientDensityScore, calculateSodiumPotassiumRatio } from "@/lib/nutritionCalculator";
import {
  aggregateTotals,
  archiveNutritionProfile as archiveNutritionProfileImpl,
  assertNonNegative,
  assertPositive,
  buildLegacyGoals,
  deleteNutritionProfileSafe as deleteNutritionProfileSafeImpl,
  getNutritionMetabolicProfile as getNutritionMetabolicProfileImpl,
  getNutritionTargetBreakdown as getNutritionTargetBreakdownImpl,
  listNutritionProfiles as listNutritionProfilesImpl,
  persistLegacyGoals,
  resolveDayPlan,
  roundTotals,
  setDailyCalorieOverride as setDailyCalorieOverrideImpl,
  setDefaultNutritionProfile as setDefaultNutritionProfileImpl,
  setNutritionDayArchetype as setNutritionDayArchetypeImpl,
  setNutritionProfileForDate as setNutritionProfileForDateImpl,
  toNutritionGoals,
  upsertNutritionProfile as upsertNutritionProfileImpl,
} from "@/services/nutritionCore";
import {
  calculateNutritionFromFood as calculateNutritionFromFoodImpl,
  deleteFavoriteFood as deleteFavoriteFoodImpl,
  getFavoriteFoods as getFavoriteFoodsImpl,
  listFoodDatabaseCategories as listFoodDatabaseCategoriesImpl,
  listRecentNutritionEntries as listRecentNutritionEntriesImpl,
  saveFavoriteFood as saveFavoriteFoodImpl,
  searchFoodDatabase as searchFoodDatabaseImpl,
  updateFavoriteFood as updateFavoriteFoodImpl,
} from "@/services/nutritionLibrary";
import { parseGuestEntries, saveGuestEntries } from "@/services/nutritionGuestState";
import { normalizeEntry } from "@/services/nutritionNormalization";
import {
  isSchemaError,
  type NutritionGoalOptions,
  type NutritionGoalsLegacy,
  type NutritionProfileLike,
} from "@/services/nutritionShared";
import { supabase } from "@/services/supabaseClient";
import type {
  DailyNutritionLog,
  DailyNutritionTargetRow,
  FavoriteFood,
  FoodDatabaseItem,
  LocalizedNutritionText,
  NutritionDayArchetype,
  NutritionEntry,
  NutritionGoals,
  NutritionMacroTotals,
  NutritionMealType,
  NutritionMetabolicProfile,
  NutritionMicronutrients,
  NutritionProfileRecord,
  NutritionTargetResolution,
} from "@/types/nutrition";

export type {
  DailyNutritionLog,
  DailyNutritionTargetRow,
  FavoriteFood,
  FoodDatabaseItem,
  NutritionDayArchetype,
  NutritionEntry,
  NutritionGoals,
  NutritionMacroTotals,
  NutritionMealType,
  NutritionMetabolicProfile,
  NutritionProfileRecord,
};

type NutritionEntryInsertParams = {
  userId: string | null;
  date: Date;
  meal_type: NutritionMealType;
  food_name: string;
  food_name_i18n?: LocalizedNutritionText | null;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number | null;
  sugar_g?: number | null;
  sodium_mg?: number | null;
  potassium_mg?: number | null;
  micronutrients?: NutritionMicronutrients | null;
  nutrient_density_score?: number | null;
  notes?: string | null;
  isGuest?: boolean;
  timeZone?: string;
};

const UUID_V4_LIKE_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const toValidDailyLogId = (value: string | null | undefined): string | null => {
  if (!value) return null;
  return UUID_V4_LIKE_REGEX.test(value) ? value : null;
};

export const listNutritionProfiles = listNutritionProfilesImpl;

export const upsertNutritionProfile = upsertNutritionProfileImpl;

export const archiveNutritionProfile = archiveNutritionProfileImpl;

export const setDefaultNutritionProfile = setDefaultNutritionProfileImpl;

export const deleteNutritionProfileSafe = deleteNutritionProfileSafeImpl;

export const setNutritionProfileForDate = setNutritionProfileForDateImpl;

export const getNutritionMetabolicProfile = getNutritionMetabolicProfileImpl;

export const getNutritionTargetBreakdown = getNutritionTargetBreakdownImpl;

export const setNutritionDayArchetype = setNutritionDayArchetypeImpl;

export const setDailyCalorieOverride = setDailyCalorieOverrideImpl;

const persistDailySummary = async (params: {
  userId: string;
  dateKey: string;
  totals: NutritionMacroTotals;
  mealCount: number;
}) => {
  const payload = {
    user_id: params.userId,
    date_key: params.dateKey,
    total_calories: params.totals.calories,
    total_protein_g: params.totals.protein_g,
    total_carbs_g: params.totals.carbs_g,
    total_fat_g: params.totals.fat_g,
    total_fiber_g: params.totals.fiber_g,
    total_sugar_g: params.totals.sugar_g,
    total_sodium_mg: params.totals.sodium_mg,
    total_potassium_mg: params.totals.potassium_mg,
    sodium_potassium_ratio: params.totals.sodium_potassium_ratio,
    nutrient_density_score: params.totals.nutrient_density_score,
    meal_count: params.mealCount,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("daily_nutrition_summaries").upsert(payload, { onConflict: "user_id,date_key" });
  if (error && !isSchemaError(error)) throw error;
};

export const addNutritionEntry = async (params: NutritionEntryInsertParams): Promise<NutritionEntry | null> => {
  const {
    userId,
    date,
    meal_type,
    food_name,
    serving_size,
    serving_unit,
    calories,
    protein_g,
    carbs_g,
    fat_g,
    fiber_g = null,
    sugar_g = null,
    sodium_mg = null,
    potassium_mg = null,
    micronutrients = null,
    nutrient_density_score = null,
    notes = null,
    isGuest = false,
    timeZone = DEFAULT_WATER_TIMEZONE,
  } = params;

  const name = food_name.trim();
  if (!name) throw new Error("Food name is required.");
  assertPositive(Number(serving_size), "Serving size");
  assertNonNegative(Number(calories), "Calories");

  let dailyLogId: string | null = null;
  try {
    const dayPlan = await resolveDayPlan(userId, date, { isGuest, timeZone });
    dailyLogId = dayPlan.dailyLog?.id ?? null;
  } catch (error) {
    if (!isSchemaError(error)) throw error;
  }

  const payload = {
    date_key: getDateKeyForTimezone(date, timeZone),
    daily_log_id: toValidDailyLogId(dailyLogId),
    meal_type,
    food_name: name,
    food_name_i18n: params.food_name_i18n ?? null,
    serving_size: Number(serving_size),
    serving_unit: serving_unit.trim() || "g",
    calories: Number(calories),
    protein_g: Number(protein_g),
    carbs_g: Number(carbs_g),
    fat_g: Number(fat_g),
    fiber_g: fiber_g === null ? null : Number(fiber_g),
    sugar_g: sugar_g === null ? null : Number(sugar_g),
    sodium_mg: sodium_mg === null ? null : Number(sodium_mg),
    potassium_mg: potassium_mg === null ? null : Number(potassium_mg),
    micronutrients: micronutrients ?? null,
    nutrient_density_score:
      nutrient_density_score === null || nutrient_density_score === undefined
        ? calculateNutrientDensityScore({
            calories: Number(calories),
            proteinG: Number(protein_g),
            fiberG: Number(fiber_g ?? 0),
            sodiumMg: Number(sodium_mg ?? 0),
            potassiumMg: Number(potassium_mg ?? 0),
            micronutrients,
          })
        : Number(nutrient_density_score),
    notes: notes?.trim() || null,
  };

  if (isGuest) {
    const entry = normalizeEntry({ id: crypto.randomUUID(), user_id: "guest", created_at: new Date().toISOString(), ...payload });
    saveGuestEntries([entry, ...parseGuestEntries()]);
    return entry;
  }
  if (!userId) return null;

  const insertPayload = { user_id: userId, ...payload };
  const { data, error } = await supabase.from("nutrition_entries").insert(insertPayload).select("*").single();
  if (!error) return normalizeEntry(data);

  if (!isSchemaError(error)) throw error;

  const legacyPayload = {
    user_id: userId,
    date_key: payload.date_key,
    meal_type: payload.meal_type,
    food_name: payload.food_name,
    serving_size: payload.serving_size,
    serving_unit: payload.serving_unit,
    calories: payload.calories,
    protein_g: payload.protein_g,
    carbs_g: payload.carbs_g,
    fat_g: payload.fat_g,
    fiber_g: payload.fiber_g ?? 0,
    sugar_g: payload.sugar_g ?? 0,
    notes: payload.notes,
  };

  const { data: legacyData, error: legacyError } = await supabase.from("nutrition_entries").insert(legacyPayload).select("*").single();
  if (legacyError) throw legacyError;
  return normalizeEntry(legacyData);
};

export const updateNutritionEntry = async (
  id: string,
  updates: Partial<Omit<NutritionEntry, "id" | "user_id" | "created_at" | "date_key">>,
  userId: string | null,
  options?: { isGuest?: boolean },
): Promise<NutritionEntry | null> => {
  const isGuest = options?.isGuest || false;
  if (!id) return null;

  if (isGuest) {
    const rows = parseGuestEntries();
    const idx = rows.findIndex((row) => row.id === id);
    if (idx < 0) return null;
    const next = normalizeEntry({ ...rows[idx], ...updates });
    rows[idx] = next;
    saveGuestEntries(rows);
    return next;
  }
  if (!userId) return null;

  const { data, error } = await supabase.from("nutrition_entries").update(updates).eq("id", id).eq("user_id", userId).select("*").single();
  if (error) throw error;
  return normalizeEntry(data);
};

export const deleteNutritionEntry = async (id: string, userId: string | null, options?: { isGuest?: boolean }) => {
  const isGuest = options?.isGuest || false;
  if (!id) return;

  if (isGuest) {
    saveGuestEntries(parseGuestEntries().filter((row) => row.id !== id));
    return;
  }
  if (!userId) return;

  const { error } = await supabase.from("nutrition_entries").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
};

export const getNutritionEntriesByMeal = async (
  userId: string | null,
  date: Date,
  options?: { isGuest?: boolean; timeZone?: string },
) => {
  const isGuest = options?.isGuest || false;
  const timeZone = options?.timeZone || DEFAULT_WATER_TIMEZONE;
  const dateKey = getDateKeyForTimezone(date, timeZone);

  let rows: NutritionEntry[] = [];
  if (isGuest) {
    rows = parseGuestEntries().filter((row) => row.date_key === dateKey).sort((a, b) => a.created_at.localeCompare(b.created_at));
  } else if (userId) {
    const { data, error } = await supabase
      .from("nutrition_entries")
      .select("*")
      .eq("user_id", userId)
      .eq("date_key", dateKey)
      .order("created_at", { ascending: true });
    if (error) throw error;
    rows = (data || []).map(normalizeEntry);
  }

  const groups: Record<NutritionMealType, NutritionEntry[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
  rows.forEach((row) => groups[row.meal_type].push(row));
  return groups;
};

export const getNutritionGoals = async (userId: string | null, options?: NutritionGoalOptions): Promise<NutritionGoals> => {
  const { target } = await getNutritionTargetBreakdown(userId, options?.date ?? new Date(), options);
  return toNutritionGoals(target);
};

export const getNutritionDaySummary = async (
  userId: string | null,
  date: Date,
  options?: NutritionGoalOptions,
) => {
  const groups = await getNutritionEntriesByMeal(userId, date, options);
  const allEntries = [...groups.breakfast, ...groups.lunch, ...groups.dinner, ...groups.snack];
  const totals = roundTotals(aggregateTotals(allEntries));
  const resolved = await getNutritionTargetBreakdown(userId, date, options);
  const goals = toNutritionGoals(resolved.target);

  const mealTotals: Record<NutritionMealType, NutritionMacroTotals> = {
    breakfast: roundTotals(aggregateTotals(groups.breakfast)),
    lunch: roundTotals(aggregateTotals(groups.lunch)),
    dinner: roundTotals(aggregateTotals(groups.dinner)),
    snack: roundTotals(aggregateTotals(groups.snack)),
  };

  if (!options?.isGuest && userId) {
    await persistDailySummary({ userId, dateKey: resolved.dateKey, totals, mealCount: allEntries.length });
  }

  return {
    groups,
    totals,
    mealTotals,
    goals,
    lastEntry: [...allEntries].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null,
    targetBreakdown: resolved.target,
    metabolicProfile: resolved.profile,
    remaining: {
      calories: Math.round(goals.calorie_goal - totals.calories),
      protein_g: Number((goals.protein_goal_g - totals.protein_g).toFixed(1)),
      carbs_g: Number((goals.carb_goal_g - totals.carbs_g).toFixed(1)),
      fat_g: Number((goals.fat_goal_g - totals.fat_g).toFixed(1)),
    },
    sodiumPotassium: {
      sodium_mg: totals.sodium_mg,
      potassium_mg: totals.potassium_mg,
      ratio: totals.sodium_potassium_ratio,
    },
    nutrientDensityScore: totals.nutrient_density_score,
    dailyLog: resolved.dailyLog,
    selectedProfile: resolved.selectedProfile,
    availableProfiles: resolved.availableProfiles,
    weightSource: resolved.weightSource,
  };
};

export const getNutritionRangeSummary = async (
  userId: string | null,
  from: Date,
  to: Date,
  options?: { isGuest?: boolean; timeZone?: string },
) => {
  const isGuest = options?.isGuest || false;
  const timeZone = options?.timeZone || DEFAULT_WATER_TIMEZONE;
  const fromKey = getDateKeyForTimezone(from, timeZone);
  const toKey = getDateKeyForTimezone(to, timeZone);

  let rows: NutritionEntry[] = [];
  if (isGuest) {
    rows = parseGuestEntries().filter((row) => row.date_key >= fromKey && row.date_key <= toKey).sort((a, b) => a.date_key.localeCompare(b.date_key));
  } else if (userId) {
    const { data, error } = await supabase
      .from("nutrition_entries")
      .select("*")
      .eq("user_id", userId)
      .gte("date_key", fromKey)
      .lte("date_key", toKey)
      .order("date_key", { ascending: true });
    if (error) throw error;
    rows = (data || []).map(normalizeEntry);
  }

  const dayMap = new Map<string, NutritionEntry[]>();
  rows.forEach((row) => dayMap.set(row.date_key, [...(dayMap.get(row.date_key) || []), row]));

  const days = createDateKeyRange(from, to).map((dateKey) => {
    const totals = roundTotals(aggregateTotals(dayMap.get(dateKey) || []));
    return { date_key: dateKey, entries_count: (dayMap.get(dateKey) || []).length, ...totals };
  });

  const averages =
    days.length > 0
      ? {
          calories: Math.round(days.reduce((sum, day) => sum + day.calories, 0) / days.length),
          protein_g: Number((days.reduce((sum, day) => sum + day.protein_g, 0) / days.length).toFixed(1)),
          carbs_g: Number((days.reduce((sum, day) => sum + day.carbs_g, 0) / days.length).toFixed(1)),
          fat_g: Number((days.reduce((sum, day) => sum + day.fat_g, 0) / days.length).toFixed(1)),
          sodium_mg: Math.round(days.reduce((sum, day) => sum + day.sodium_mg, 0) / days.length),
          potassium_mg: Math.round(days.reduce((sum, day) => sum + day.potassium_mg, 0) / days.length),
          sodium_potassium_ratio: calculateSodiumPotassiumRatio(
            days.reduce((sum, day) => sum + day.sodium_mg, 0),
            days.reduce((sum, day) => sum + day.potassium_mg, 0),
          ),
          nutrient_density_score: (() => {
            const values = days.map((day) => day.nutrient_density_score).filter((value): value is number => value !== null && value !== undefined);
            if (!values.length) return null;
            return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
          })(),
        }
      : {
          calories: 0,
          protein_g: 0,
          carbs_g: 0,
          fat_g: 0,
          sodium_mg: 0,
          potassium_mg: 0,
          sodium_potassium_ratio: null,
          nutrient_density_score: null,
        };

  return { days, averages };
};

export const listRecentNutritionEntries = listRecentNutritionEntriesImpl;

export const getFavoriteFoods = getFavoriteFoodsImpl;

export const saveFavoriteFood = saveFavoriteFoodImpl;

export const updateFavoriteFood = updateFavoriteFoodImpl;

export const deleteFavoriteFood = deleteFavoriteFoodImpl;

export const updateNutritionGoals = async (
  userId: string | null,
  goals: Partial<NutritionGoalsLegacy>,
  options?: { isGuest?: boolean; date?: Date; timeZone?: string; profile?: NutritionProfileLike | null },
): Promise<NutritionGoals> => {
  const next = buildLegacyGoals(goals);
  await persistLegacyGoals(userId, next, { isGuest: options?.isGuest });

  await setDailyCalorieOverride(userId, options?.date ?? new Date(), next.calorie_goal, {
    isGuest: options?.isGuest,
    timeZone: options?.timeZone,
    profile: options?.profile,
  });

  return getNutritionGoals(userId, {
    isGuest: options?.isGuest,
    timeZone: options?.timeZone,
    date: options?.date,
    profile: options?.profile,
  });
};

export const searchFoodDatabase = searchFoodDatabaseImpl;

export const listFoodDatabaseCategories = listFoodDatabaseCategoriesImpl;

export const calculateNutritionFromFood = calculateNutritionFromFoodImpl;
