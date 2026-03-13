import { DEFAULT_WATER_TIMEZONE, createDateKeyRange, getDateKeyForTimezone } from "@/features/water/waterUtils";
import { getArchetypeLabel } from "@/features/nutrition/nutritionProfiles";
import {
  calculateAgeFromBirthDate,
  calculateNutrientDensityScore,
  calculateNutritionTargets,
  calculateSodiumPotassiumRatio,
} from "@/lib/nutritionCalculator";
import { getWeightReferenceForDate } from "@/services/bodyMetrics";
import {
  parseGuestDailyLogs,
  parseGuestDayArchetypeMap,
  parseGuestDayOverrideMap,
  parseGuestEntries,
  parseGuestFavorites,
  parseGuestProfiles,
  saveGuestDailyLogs,
  saveGuestDayArchetypeMap,
  saveGuestDayOverrideMap,
  saveGuestEntries,
  saveGuestFavorites,
  saveGuestGoals,
  saveGuestProfiles,
} from "@/services/nutritionGuestState";
import {
  normalizeDailyLog,
  normalizeEntry,
  normalizeFavorite,
  normalizeFoodDatabaseItem,
  normalizeNutritionProfile,
} from "@/services/nutritionNormalization";
import {
  DEFAULT_METABOLIC_PROFILE,
  DEFAULT_NUTRITION_GOALS,
  getLocalizedNutritionText,
  isSchemaError,
  normalizeActivityLevel,
  normalizeDayArchetype,
  normalizeGoalType,
  normalizeLocalizedNutritionText,
  normalizeSex,
  sanitizeNumber,
  type NutritionGoalOptions,
  type NutritionGoalsLegacy,
  type NutritionProfileLike,
  type ResolvePlanOptions,
  type UpsertNutritionProfileInput,
} from "@/services/nutritionShared";
import { supabase } from "@/services/supabaseClient";
import {
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


const getFoodSearchText = (row: FoodDatabaseItem) =>
  [row.food_name, row.food_name_i18n?.en, row.food_name_i18n?.es, row.category, row.category_i18n?.en, row.category_i18n?.es]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .toLowerCase();

const assertNonNegative = (value: number, field: string) => {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${field} must be a non-negative number.`);
};

const assertPositive = (value: number, field: string) => {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${field} must be greater than 0.`);
};


const aggregateTotals = (entries: NutritionEntry[]): NutritionMacroTotals => {
  const densityValues: number[] = [];
  const totals = entries.reduce(
    (acc, row) => {
      const next = {
        calories: acc.calories + sanitizeNumber(row.calories),
        protein_g: acc.protein_g + sanitizeNumber(row.protein_g),
        carbs_g: acc.carbs_g + sanitizeNumber(row.carbs_g),
        fat_g: acc.fat_g + sanitizeNumber(row.fat_g),
        fiber_g: acc.fiber_g + sanitizeNumber(row.fiber_g),
        sugar_g: acc.sugar_g + sanitizeNumber(row.sugar_g),
        sodium_mg: acc.sodium_mg + sanitizeNumber(row.sodium_mg),
        potassium_mg: acc.potassium_mg + sanitizeNumber(row.potassium_mg),
      };
      if (row.nutrient_density_score !== null && row.nutrient_density_score !== undefined && Number.isFinite(row.nutrient_density_score)) {
        densityValues.push(Number(row.nutrient_density_score));
      }
      return next;
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0, potassium_mg: 0 },
  );

  return {
    ...totals,
    sodium_potassium_ratio: calculateSodiumPotassiumRatio(totals.sodium_mg, totals.potassium_mg),
    nutrient_density_score:
      densityValues.length > 0
        ? Number((densityValues.reduce((sum, value) => sum + value, 0) / densityValues.length).toFixed(1))
        : null,
  };
};

const roundTotals = (totals: NutritionMacroTotals): NutritionMacroTotals => ({
  calories: Math.round(totals.calories),
  protein_g: Number(totals.protein_g.toFixed(1)),
  carbs_g: Number(totals.carbs_g.toFixed(1)),
  fat_g: Number(totals.fat_g.toFixed(1)),
  fiber_g: Number(totals.fiber_g.toFixed(1)),
  sugar_g: Number(totals.sugar_g.toFixed(1)),
  sodium_mg: Math.round(totals.sodium_mg),
  potassium_mg: Math.round(totals.potassium_mg),
  sodium_potassium_ratio: totals.sodium_potassium_ratio === null ? null : Number(totals.sodium_potassium_ratio.toFixed(3)),
  nutrient_density_score: totals.nutrient_density_score === null ? null : Number(totals.nutrient_density_score.toFixed(1)),
});

const toNutritionGoals = (target: ReturnType<typeof calculateNutritionTargets>): NutritionGoals => ({
  calorie_goal: target.finalTargetCalories,
  protein_goal_g: Number(target.proteinGrams.toFixed(1)),
  carb_goal_g: Number(target.carbGrams.toFixed(1)),
  fat_goal_g: Number(target.fatGrams.toFixed(1)),
  day_archetype: target.dayArchetype,
  bmr: target.bmr,
  tdee: target.tdee,
  activity_multiplier: target.activityMultiplier,
  goal_multiplier: target.goalMultiplier,
  archetype_delta: target.archetypeDelta,
  calorie_target: target.calorieTarget,
  final_target_calories: target.finalTargetCalories,
});

const scaleMicronutrients = (micronutrients: NutritionMicronutrients | null, ratio: number): NutritionMicronutrients | null => {
  if (!micronutrients) return null;
  const scaled: NutritionMicronutrients = {};
  Object.entries(micronutrients).forEach(([key, value]) => {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) scaled[key] = Number((numeric * ratio).toFixed(2));
  });
  return Object.keys(scaled).length > 0 ? scaled : null;
};

const listProfilesInternal = async (
  userId: string | null,
  options?: { isGuest?: boolean; includeArchived?: boolean },
): Promise<NutritionProfileRecord[]> => {
  const isGuest = options?.isGuest || false;
  const includeArchived = options?.includeArchived || false;
  if (isGuest) {
    return parseGuestProfiles()
      .filter((row) => includeArchived || !row.is_archived)
      .sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.name.localeCompare(b.name));
  }
  if (!userId) return [];

  let query = supabase
    .from("nutrition_profiles")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (!includeArchived) query = query.eq("is_archived", false);
  const { data, error } = await query;
  if (error) {
    if (isSchemaError(error)) return [];
    throw error;
  }
  return (data || []).map(normalizeNutritionProfile);
};

const getStoredDailyTarget = async (userId: string, dateKey: string): Promise<DailyNutritionTargetRow | null> => {
  const { data, error } = await supabase.from("daily_nutrition_targets").select("*").eq("user_id", userId).eq("date_key", dateKey).limit(1).maybeSingle();
  if (error) {
    if (isSchemaError(error)) return null;
    throw error;
  }
  return (data as DailyNutritionTargetRow | null) ?? null;
};

const getStoredDailyLog = async (userId: string | null, dateKey: string, options?: { isGuest?: boolean }): Promise<DailyNutritionLog | null> => {
  const isGuest = options?.isGuest || false;
  if (isGuest) return parseGuestDailyLogs().find((row) => row.date_key === dateKey) ?? null;
  if (!userId) return null;
  const { data, error } = await supabase.from("daily_nutrition_logs").select("*").eq("user_id", userId).eq("date_key", dateKey).limit(1).maybeSingle();
  if (error) {
    if (isSchemaError(error)) return null;
    throw error;
  }
  return data ? normalizeDailyLog(data) : null;
};

const persistDailyTarget = async (params: {
  userId: string;
  dateKey: string;
  target: ReturnType<typeof calculateNutritionTargets>;
  calorieOverride: number | null;
}) => {
  const payload = {
    user_id: params.userId,
    date_key: params.dateKey,
    day_archetype: params.target.dayArchetype,
    bmr: params.target.bmr,
    tdee: params.target.tdee,
    calorie_target: params.target.calorieTarget,
    final_target_calories: params.target.finalTargetCalories,
    protein_grams: params.target.proteinGrams,
    fat_grams: params.target.fatGrams,
    carb_grams: params.target.carbGrams,
    protein_calories: params.target.proteinCalories,
    fat_calories: params.target.fatCalories,
    carb_calories: params.target.carbCalories,
    activity_multiplier: params.target.activityMultiplier,
    goal_multiplier: params.target.goalMultiplier,
    archetype_delta: params.target.archetypeDelta,
    calorie_override: params.calorieOverride,
    is_manual_override: params.calorieOverride !== null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("daily_nutrition_targets").upsert(payload, { onConflict: "user_id,date_key" });
  if (error && !isSchemaError(error)) throw error;
};

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

const upsertDailyLog = async (
  userId: string | null,
  payload: Omit<DailyNutritionLog, "id" | "created_at" | "updated_at">,
  options?: { isGuest?: boolean },
): Promise<DailyNutritionLog | null> => {
  const isGuest = options?.isGuest || false;
  if (isGuest) {
    const logs = parseGuestDailyLogs();
    const existingIndex = logs.findIndex((row) => row.date_key === payload.date_key);
    const base = normalizeDailyLog({
      id: existingIndex >= 0 ? logs[existingIndex].id : crypto.randomUUID(),
      created_at: existingIndex >= 0 ? logs[existingIndex].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...payload,
    });
    if (existingIndex >= 0) logs[existingIndex] = base;
    else logs.unshift(base);
    saveGuestDailyLogs(logs);
    return base;
  }
  if (!userId) return null;

  const { data, error } = await supabase
    .from("daily_nutrition_logs")
    .upsert({ ...payload, user_id: userId, updated_at: new Date().toISOString() }, { onConflict: "user_id,date_key" })
    .select("*")
    .single();
  if (error) {
    if (isSchemaError(error)) return null;
    throw error;
  }
  return normalizeDailyLog(data);
};

const getProfileSource = async (userId: string | null, options?: ResolvePlanOptions) => {
  if (options?.profile) return options.profile;
  if (options?.isGuest || !userId) return null;
  let { data, error } = await supabase
    .from("profiles")
    .select("birth_date,weight,height,goal_type,goal_direction,biological_sex,activity_level,nutrition_goal_type,day_archetype")
    .eq("id", userId)
    .limit(1)
    .maybeSingle();
  if (error && isSchemaError(error)) {
    const fallback = await supabase.from("profiles").select("birth_date,weight,height,goal_type,goal_direction").eq("id", userId).limit(1).maybeSingle();
    data = (fallback.data ?? null) as NutritionProfileLike | null;
    error = fallback.error;
  }
  if (error) throw error;
  return (data as NutritionProfileLike | null) ?? null;
};

const resolveDayPlan = async (
  userId: string | null,
  date: Date,
  options?: ResolvePlanOptions,
): Promise<{
  profile: NutritionMetabolicProfile;
  target: ReturnType<typeof calculateNutritionTargets>;
  dateKey: string;
  dailyLog: DailyNutritionLog | null;
  selectedProfile: NutritionProfileRecord | null;
  availableProfiles: NutritionProfileRecord[];
  weightSource: "closest_on_or_before" | "latest_available" | "profile_fallback";
}> => {
  const isGuest = options?.isGuest || false;
  const timeZone = options?.timeZone || DEFAULT_WATER_TIMEZONE;
  const dateKey = getDateKeyForTimezone(date, timeZone);
  const source = await getProfileSource(userId, options);
  const availableProfiles = await listProfilesInternal(userId, { isGuest, includeArchived: options?.includeArchivedProfiles });
  const existingLog = await getStoredDailyLog(userId, dateKey, { isGuest });
  const storedTarget = !isGuest && userId ? await getStoredDailyTarget(userId, dateKey) : null;
  const legacyDayArchetype = parseGuestDayArchetypeMap()[dateKey];
  const legacyOverride = parseGuestDayOverrideMap()[dateKey] ?? null;

  const selectedProfile =
    options?.clearProfileSelection
      ? availableProfiles.find((row) => row.is_default) ?? null
      : options?.forceProfileId !== undefined
        ? availableProfiles.find((row) => row.id === options.forceProfileId) ?? null
        : availableProfiles.find((row) => row.id === existingLog?.nutrition_profile_id) ??
          availableProfiles.find((row) => row.is_default) ??
          availableProfiles[0] ??
          null;

  const dayArchetype =
    options?.forceDayArchetype ??
    selectedProfile?.archetype ??
    existingLog?.archetype_snapshot ??
    legacyDayArchetype ??
    normalizeDayArchetype(storedTarget?.day_archetype ?? source?.day_archetype);

  const calorieOverride =
    options?.forceCalorieOverride !== undefined
      ? options.forceCalorieOverride
      : existingLog?.calorie_override ?? storedTarget?.calorie_override ?? legacyOverride ?? null;

  const weightReference = await getWeightReferenceForDate(userId, date, isGuest);
  const weightKg = sanitizeNumber(weightReference.entry?.weight_kg ?? source?.weight, DEFAULT_METABOLIC_PROFILE.weightKg);
  const profile: NutritionMetabolicProfile = {
    sex: normalizeSex(source?.biological_sex),
    age: calculateAgeFromBirthDate(source?.birth_date, date) ?? DEFAULT_METABOLIC_PROFILE.age,
    weightKg,
    heightCm: sanitizeNumber(source?.height, DEFAULT_METABOLIC_PROFILE.heightCm),
    activityLevel: normalizeActivityLevel(source?.activity_level),
    goalType: normalizeGoalType(source?.nutrition_goal_type ?? source?.goal_direction ?? source?.goal_type),
    dayArchetype,
    birthDate: source?.birth_date ?? null,
    calorieOverride,
    isCalorieOverrideEnabled: calorieOverride !== null,
  };

  const target = calculateNutritionTargets({
    sex: profile.sex,
    age: profile.age,
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
    activityLevel: profile.activityLevel,
    goalType: profile.goalType,
    dayArchetype: profile.dayArchetype,
    calorieOverride: profile.calorieOverride,
  });

  const resolvedLog = await upsertDailyLog(
    userId,
    {
      user_id: userId ?? "guest",
      date_key: dateKey,
      nutrition_profile_id: selectedProfile?.id ?? null,
      profile_name_snapshot: selectedProfile?.name ?? getArchetypeLabel(dayArchetype),
      archetype_snapshot: target.dayArchetype,
      target_calories: target.finalTargetCalories,
      target_protein_g: target.proteinGrams,
      target_carbs_g: target.carbGrams,
      target_fat_g: target.fatGrams,
      base_tdee: target.tdee,
      weight_snapshot_kg: profile.weightKg,
      calorie_adjustment: target.archetypeDelta,
      calorie_override: profile.calorieOverride,
    },
    { isGuest },
  );

  if (isGuest || !userId) {
    const dayArchetypes = parseGuestDayArchetypeMap();
    dayArchetypes[dateKey] = target.dayArchetype;
    saveGuestDayArchetypeMap(dayArchetypes);

    const overrides = parseGuestDayOverrideMap();
    if (profile.calorieOverride !== null && profile.calorieOverride !== undefined) overrides[dateKey] = profile.calorieOverride;
    else delete overrides[dateKey];
    saveGuestDayOverrideMap(overrides);
  } else {
    await persistDailyTarget({ userId, dateKey, target, calorieOverride: profile.calorieOverride });
  }

  return {
    profile,
    target,
    dateKey,
    dailyLog: resolvedLog,
    selectedProfile,
    availableProfiles,
    weightSource: weightReference.entry ? weightReference.source ?? "closest_on_or_before" : "profile_fallback",
  };
};

export const listNutritionProfiles = async (
  userId: string | null,
  options?: { isGuest?: boolean; includeArchived?: boolean },
) => listProfilesInternal(userId, options);

export const upsertNutritionProfile = async (
  userId: string | null,
  payload: UpsertNutritionProfileInput,
  options?: { isGuest?: boolean },
): Promise<NutritionProfileRecord | null> => {
  const isGuest = options?.isGuest || false;
  const name = payload.name.trim();
  if (!name) throw new Error("Profile name is required.");

  if (isGuest) {
    const profiles = parseGuestProfiles();
    const next = normalizeNutritionProfile({
      id: payload.id ?? crypto.randomUUID(),
      user_id: "guest",
      name,
      archetype: payload.archetype,
      is_default: Boolean(payload.is_default),
      is_archived: false,
      created_at: profiles.find((row) => row.id === payload.id)?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const normalized = profiles
      .filter((row) => row.id !== next.id)
      .map((row) => ({ ...row, is_default: next.is_default ? false : row.is_default }));
    saveGuestProfiles([next, ...normalized]);
    return next;
  }
  if (!userId) return null;

  if (payload.is_default) {
    const { error: clearError } = await supabase.from("nutrition_profiles").update({ is_default: false }).eq("user_id", userId);
    if (clearError && !isSchemaError(clearError)) throw clearError;
  }

  const base = {
    user_id: userId,
    name,
    archetype: payload.archetype,
    is_default: Boolean(payload.is_default),
    is_archived: false,
    updated_at: new Date().toISOString(),
  };

  if (payload.id) {
    const { data, error } = await supabase.from("nutrition_profiles").update(base).eq("id", payload.id).eq("user_id", userId).select("*").single();
    if (error) throw error;
    return normalizeNutritionProfile(data);
  }

  const { data, error } = await supabase.from("nutrition_profiles").insert(base).select("*").single();
  if (error) throw error;
  return normalizeNutritionProfile(data);
};

export const archiveNutritionProfile = async (
  profileId: string,
  userId: string | null,
  options?: { isGuest?: boolean; archived?: boolean },
) => {
  const isGuest = options?.isGuest || false;
  const archived = options?.archived ?? true;
  if (!profileId) return;

  if (isGuest) {
    const next = parseGuestProfiles().map((row) =>
      row.id === profileId ? { ...row, is_archived: archived, is_default: archived ? false : row.is_default, updated_at: new Date().toISOString() } : row,
    );
    saveGuestProfiles(next);
    return;
  }
  if (!userId) return;

  const payload = archived
    ? { is_archived: true, is_default: false, updated_at: new Date().toISOString() }
    : { is_archived: false, updated_at: new Date().toISOString() };
  const { error } = await supabase.from("nutrition_profiles").update(payload).eq("id", profileId).eq("user_id", userId);
  if (error) throw error;
};

export const setDefaultNutritionProfile = async (
  profileId: string,
  userId: string | null,
  options?: { isGuest?: boolean },
) => {
  const isGuest = options?.isGuest || false;
  if (!profileId) return;

  if (isGuest) {
    const next = parseGuestProfiles().map((row) => ({ ...row, is_default: row.id === profileId, is_archived: row.id === profileId ? false : row.is_archived }));
    saveGuestProfiles(next);
    return;
  }
  if (!userId) return;

  const { error: clearError } = await supabase.from("nutrition_profiles").update({ is_default: false }).eq("user_id", userId);
  if (clearError) throw clearError;
  const { error } = await supabase.from("nutrition_profiles").update({ is_default: true, is_archived: false }).eq("id", profileId).eq("user_id", userId);
  if (error) throw error;
};

export const deleteNutritionProfileSafe = async (
  profileId: string,
  userId: string | null,
  options?: { isGuest?: boolean },
): Promise<{ deleted: boolean; archived: boolean }> => {
  const isGuest = options?.isGuest || false;
  if (!profileId) return { deleted: false, archived: false };

  if (isGuest) {
    const logs = parseGuestDailyLogs();
    const isUsed = logs.some((row) => row.nutrition_profile_id === profileId);
    if (isUsed) {
      await archiveNutritionProfile(profileId, userId, { isGuest, archived: true });
      return { deleted: false, archived: true };
    }
    saveGuestProfiles(parseGuestProfiles().filter((row) => row.id !== profileId));
    return { deleted: true, archived: false };
  }
  if (!userId) return { deleted: false, archived: false };

  const { count, error: countError } = await supabase
    .from("daily_nutrition_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("nutrition_profile_id", profileId);
  if (countError && !isSchemaError(countError)) throw countError;
  if ((count ?? 0) > 0) {
    await archiveNutritionProfile(profileId, userId, { archived: true });
    return { deleted: false, archived: true };
  }

  const { error } = await supabase.from("nutrition_profiles").delete().eq("id", profileId).eq("user_id", userId);
  if (error) throw error;
  return { deleted: true, archived: false };
};

export const setNutritionProfileForDate = async (
  userId: string | null,
  date: Date,
  profileId: string | null,
  options?: NutritionGoalOptions,
): Promise<NutritionTargetResolution> =>
  resolveDayPlan(userId, date, {
    ...options,
    forceProfileId: profileId === "none" ? null : profileId,
    clearProfileSelection: profileId === null,
  });

export const getNutritionMetabolicProfile = async (
  userId: string | null,
  date: Date,
  options?: NutritionGoalOptions,
): Promise<NutritionMetabolicProfile> => {
  const resolved = await resolveDayPlan(userId, date, options);
  return resolved.profile;
};

export const getNutritionTargetBreakdown = async (
  userId: string | null,
  date = new Date(),
  options?: NutritionGoalOptions,
): Promise<NutritionTargetResolution> => resolveDayPlan(userId, date, options);

export const setNutritionDayArchetype = async (
  userId: string | null,
  date: Date,
  dayArchetype: NutritionDayArchetype,
  options?: NutritionGoalOptions,
): Promise<NutritionTargetResolution> => resolveDayPlan(userId, date, { ...options, forceDayArchetype: dayArchetype, clearProfileSelection: true });

export const setDailyCalorieOverride = async (
  userId: string | null,
  date: Date,
  calorieOverride: number | null,
  options?: NutritionGoalOptions,
): Promise<NutritionTargetResolution> => {
  if (calorieOverride !== null) assertPositive(calorieOverride, "Calorie override");
  return resolveDayPlan(userId, date, { ...options, forceCalorieOverride: calorieOverride });
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

  const dayPlan = await resolveDayPlan(userId, date, { isGuest, timeZone });
  const payload = {
    date_key: getDateKeyForTimezone(date, timeZone),
    daily_log_id: dayPlan.dailyLog?.id ?? null,
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

  const { data, error } = await supabase.from("nutrition_entries").insert({ user_id: userId, ...payload }).select("*").single();
  if (error) throw error;
  return normalizeEntry(data);
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

export const listRecentNutritionEntries = async (
  userId: string | null,
  limit = 12,
  options?: { isGuest?: boolean },
): Promise<NutritionEntry[]> => {
  const isGuest = options?.isGuest || false;
  if (isGuest) return parseGuestEntries().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
  if (!userId) return [];

  const { data, error } = await supabase.from("nutrition_entries").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data || []).map(normalizeEntry);
};

export const getFavoriteFoods = async (userId: string | null, options?: { isGuest?: boolean }): Promise<FavoriteFood[]> => {
  const isGuest = options?.isGuest || false;
  if (isGuest) return parseGuestFavorites().sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (!userId) return [];

  const { data, error } = await supabase.from("nutrition_favorites").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizeFavorite);
};

export const saveFavoriteFood = async (
  userId: string | null,
  payload: {
      name: string;
      name_i18n?: LocalizedNutritionText | null;
      serving_size: number;
    serving_unit: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number | null;
    sodium_mg?: number | null;
    potassium_mg?: number | null;
    micronutrients?: NutritionMicronutrients | null;
    nutrient_density_score?: number | null;
  },
  options?: { isGuest?: boolean },
): Promise<FavoriteFood | null> => {
  const isGuest = options?.isGuest || false;
  const name = payload.name.trim();
  if (!name) throw new Error("Name is required.");

  const base = {
    name,
    name_i18n: payload.name_i18n ?? null,
    serving_size: Number(payload.serving_size),
    serving_unit: payload.serving_unit.trim() || "g",
    calories: Number(payload.calories),
    protein_g: Number(payload.protein_g),
    carbs_g: Number(payload.carbs_g),
    fat_g: Number(payload.fat_g),
    fiber_g: payload.fiber_g === null || payload.fiber_g === undefined ? null : Number(payload.fiber_g),
    sodium_mg: payload.sodium_mg === null || payload.sodium_mg === undefined ? null : Number(payload.sodium_mg),
    potassium_mg: payload.potassium_mg === null || payload.potassium_mg === undefined ? null : Number(payload.potassium_mg),
    micronutrients: payload.micronutrients ?? null,
    nutrient_density_score:
      payload.nutrient_density_score === null || payload.nutrient_density_score === undefined
        ? calculateNutrientDensityScore({
            calories: Number(payload.calories),
            proteinG: Number(payload.protein_g),
            fiberG: Number(payload.fiber_g ?? 0),
            sodiumMg: Number(payload.sodium_mg ?? 0),
            potassiumMg: Number(payload.potassium_mg ?? 0),
            micronutrients: payload.micronutrients ?? null,
          })
        : Number(payload.nutrient_density_score),
  };

  if (isGuest) {
    const next = normalizeFavorite({ id: crypto.randomUUID(), user_id: "guest", created_at: new Date().toISOString(), ...base });
    saveGuestFavorites([next, ...parseGuestFavorites().filter((row) => row.name.toLowerCase() !== name.toLowerCase())]);
    return next;
  }
  if (!userId) return null;

  const { data, error } = await supabase.from("nutrition_favorites").insert({ user_id: userId, ...base }).select("*").single();
  if (error) throw error;
  return normalizeFavorite(data);
};

export const updateNutritionGoals = async (
  userId: string | null,
  goals: Partial<NutritionGoalsLegacy>,
  options?: { isGuest?: boolean; date?: Date; timeZone?: string; profile?: NutritionProfileLike | null },
): Promise<NutritionGoals> => {
  const next = {
    calorie_goal: Number(goals.calorie_goal ?? DEFAULT_NUTRITION_GOALS.calorie_goal),
    protein_goal_g: Number(goals.protein_goal_g ?? DEFAULT_NUTRITION_GOALS.protein_goal_g),
    carb_goal_g: Number(goals.carb_goal_g ?? DEFAULT_NUTRITION_GOALS.carb_goal_g),
    fat_goal_g: Number(goals.fat_goal_g ?? DEFAULT_NUTRITION_GOALS.fat_goal_g),
  };
  saveGuestGoals(next);

  if (!options?.isGuest && userId) {
    const { error } = await supabase.from("profiles").update(next).eq("id", userId);
    if (error) throw error;
  }

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

export const searchFoodDatabase = async (params?: {
  query?: string;
  category?: string | null;
  limit?: number;
  language?: "en" | "es";
}): Promise<FoodDatabaseItem[]> => {
  const query = params?.query?.trim() || "";
  const category = params?.category?.trim() || "";
  const limit = Math.max(1, Math.min(100, Number(params?.limit ?? 25)));
  const language = params?.language;

  let request = supabase.from("food_database").select("*").order("food_name", { ascending: true }).limit(limit);
  if (category && category !== "all") request = request.eq("category", category);

  const { data, error } = await request;
  if (error) throw error;
  const normalized = (data || []).map(normalizeFoodDatabaseItem);
  const filtered = query ? normalized.filter((row) => getFoodSearchText(row).includes(query.toLowerCase())) : normalized;
  return filtered
    .map((row) => ({
      ...row,
      food_name: getLocalizedNutritionText(row.food_name_i18n, language, row.food_name),
    }))
    .slice(0, limit);
};

export const listFoodDatabaseCategories = async (): Promise<string[]> => {
  const { data, error } = await supabase.from("food_database").select("category");
  if (error) throw error;
  const unique = Array.from(
    new Set((data || []).map((row: Record<string, unknown>) => String(row.category || "").trim()).filter(Boolean)),
  );
  return unique.sort((a, b) => a.localeCompare(b));
};

export const calculateNutritionFromFood = (food: FoodDatabaseItem, consumedAmount: number) => {
  const amount = Number(consumedAmount);
  assertPositive(amount, "Consumed amount");
  const base = Math.max(0.0001, Number(food.serving_size || 100));
  const ratio = amount / base;

  const calories = Number((Number(food.calories || 0) * ratio).toFixed(1));
  const protein = Number((Number(food.protein_g || 0) * ratio).toFixed(1));
  const carbs = Number((Number(food.carbs_g || 0) * ratio).toFixed(1));
  const fat = Number((Number(food.fat_g || 0) * ratio).toFixed(1));
  const fiber = Number((Number(food.fiber_g || 0) * ratio).toFixed(1));
  const sugar = Number((Number(food.sugar_g || 0) * ratio).toFixed(1));
  const sodium = Number((Number(food.sodium_mg || 0) * ratio).toFixed(1));
  const potassium = Number((Number(food.potassium_mg || 0) * ratio).toFixed(1));
  const micronutrients = scaleMicronutrients(food.micronutrients, ratio);

  return {
    serving_size: amount,
    serving_unit: food.serving_unit,
    calories,
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
    fiber_g: fiber,
    sugar_g: sugar,
    sodium_mg: sodium,
    potassium_mg: potassium,
    micronutrients,
    nutrient_density_score: calculateNutrientDensityScore({
      calories,
      proteinG: protein,
      fiberG: fiber,
      sodiumMg: sodium,
      potassiumMg: potassium,
      micronutrients,
    }),
  };
};
