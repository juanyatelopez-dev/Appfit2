import { DEFAULT_WATER_TIMEZONE, getDateKeyForTimezone } from "@/features/water/waterUtils";
import { calculateAgeFromBirthDate, calculateNutritionTargets, calculateSodiumPotassiumRatio } from "@/lib/nutritionCalculator";
import { getWeightReferenceForDate } from "@/services/bodyMetrics";
import {
  parseGuestDailyLogs,
  parseGuestDayArchetypeMap,
  parseGuestDayOverrideMap,
  parseGuestProfiles,
  saveGuestDailyLogs,
  saveGuestDayArchetypeMap,
  saveGuestDayOverrideMap,
  saveGuestGoals,
  saveGuestProfiles,
} from "@/services/nutritionGuestState";
import { normalizeDailyLog, normalizeNutritionProfile } from "@/services/nutritionNormalization";
import {
  DEFAULT_METABOLIC_PROFILE,
  DEFAULT_NUTRITION_GOALS,
  normalizeActivityLevel,
  normalizeDayArchetype,
  normalizeGoalType,
  normalizeSex,
  sanitizeNumber,
  type NutritionGoalOptions,
  type NutritionGoalsLegacy,
  type NutritionProfileLike,
  type ResolvePlanOptions,
  type UpsertNutritionProfileInput,
} from "@/services/nutritionShared";
import { supabase } from "@/services/supabaseClient";
import type {
  DailyNutritionLog,
  DailyNutritionTargetRow,
  NutritionDayArchetype,
  NutritionEntry,
  NutritionGoals,
  NutritionMacroTotals,
  NutritionMetabolicProfile,
  NutritionMicronutrients,
  NutritionProfileRecord,
  NutritionTargetResolution,
} from "@/types/nutrition";

export const assertNonNegative = (value: number, field: string) => {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${field} must be a non-negative number.`);
};

export const assertPositive = (value: number, field: string) => {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${field} must be greater than 0.`);
};

export const aggregateTotals = (entries: NutritionEntry[]): NutritionMacroTotals => {
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

export const roundTotals = (totals: NutritionMacroTotals): NutritionMacroTotals => ({
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

export const toNutritionGoals = (target: ReturnType<typeof calculateNutritionTargets>): NutritionGoals => ({
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

export const scaleMicronutrients = (micronutrients: NutritionMicronutrients | null, ratio: number): NutritionMicronutrients | null => {
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
    const message = (error as { message?: string } | null)?.message?.toLowerCase() ?? "";
    if (message.includes("schema cache") || message.includes("does not exist") || message.includes("could not find") || message.includes("column") || message.includes("relation")) return [];
    throw error;
  }
  return (data || []).map(normalizeNutritionProfile);
};

const getStoredDailyTarget = async (userId: string, dateKey: string): Promise<DailyNutritionTargetRow | null> => {
  const { data, error } = await supabase.from("daily_nutrition_targets").select("*").eq("user_id", userId).eq("date_key", dateKey).limit(1).maybeSingle();
  if (error) {
    const message = (error as { message?: string } | null)?.message?.toLowerCase() ?? "";
    if (message.includes("schema cache") || message.includes("does not exist") || message.includes("could not find") || message.includes("column") || message.includes("relation")) return null;
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
    const message = (error as { message?: string } | null)?.message?.toLowerCase() ?? "";
    if (message.includes("schema cache") || message.includes("does not exist") || message.includes("could not find") || message.includes("column") || message.includes("relation")) return null;
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
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("daily_nutrition_targets").upsert(payload, { onConflict: "user_id,date_key" });
  if (error) throw error;
};

const persistDailyLog = async (params: { userId: string; log: DailyNutritionLog }) => {
  const payload = {
    user_id: params.userId,
    date_key: params.log.date_key,
    nutrition_profile_id: params.log.nutrition_profile_id,
    profile_name_snapshot: params.log.profile_name_snapshot,
    archetype_snapshot: params.log.archetype_snapshot,
    target_calories: params.log.target_calories,
    target_protein_g: params.log.target_protein_g,
    target_carbs_g: params.log.target_carbs_g,
    target_fat_g: params.log.target_fat_g,
    base_tdee: params.log.base_tdee,
    weight_snapshot_kg: params.log.weight_snapshot_kg,
    calorie_adjustment: params.log.calorie_adjustment,
    calorie_override: params.log.calorie_override,
    updated_at: params.log.updated_at,
  };

  const { error } = await supabase.from("daily_nutrition_logs").upsert(payload, { onConflict: "user_id,date_key" });
  if (error) {
    const message = (error as { message?: string } | null)?.message?.toLowerCase() ?? "";
    if (message.includes("schema cache") || message.includes("does not exist") || message.includes("could not find") || message.includes("column") || message.includes("relation")) return;
    throw error;
  }
};

export const resolveDayPlan = async (
  userId: string | null,
  date: Date,
  options?: ResolvePlanOptions,
): Promise<NutritionTargetResolution> => {
  const isGuest = options?.isGuest || false;
  const timeZone = options?.timeZone || DEFAULT_WATER_TIMEZONE;
  const dateKey = getDateKeyForTimezone(date, timeZone);
  const availableProfiles = await listProfilesInternal(userId, { isGuest, includeArchived: options?.includeArchivedProfiles });
  const existingLog = await getStoredDailyLog(userId, dateKey, { isGuest });
  const storedTarget = !isGuest && userId ? await getStoredDailyTarget(userId, dateKey) : null;
  const selectedProfile =
    options?.clearProfileSelection
      ? null
      : availableProfiles.find((row) => row.id === options?.forceProfileId)
        ?? availableProfiles.find((row) => row.id === existingLog?.nutrition_profile_id)
        ?? availableProfiles.find((row) => row.is_default)
        ?? null;

  const baseProfile = options?.profile ?? null;
  const weightReference = await getWeightReferenceForDate(userId, date, { isGuest, timeZone });
  const weightKg = weightReference.entry?.weight_kg ?? baseProfile?.weight ?? DEFAULT_METABOLIC_PROFILE.weightKg;
  const heightCm = baseProfile?.height ?? DEFAULT_METABOLIC_PROFILE.heightCm;
  const birthDate = baseProfile?.birth_date ?? DEFAULT_METABOLIC_PROFILE.birthDate;
  const age = birthDate ? calculateAgeFromBirthDate(birthDate, date) : DEFAULT_METABOLIC_PROFILE.age;
  const sex = normalizeSex(baseProfile?.biological_sex);
  const activityLevel = normalizeActivityLevel(baseProfile?.activity_level);
  const goalType = normalizeGoalType(baseProfile?.nutrition_goal_type ?? baseProfile?.goal_type);
  const dayArchetype = options?.forceDayArchetype
    ?? (() => {
      // If user explicitly clears day profile, we should not keep previous day's snapshot.
      if (options?.clearProfileSelection) {
        return normalizeDayArchetype(baseProfile?.day_archetype ?? storedTarget?.day_archetype ?? "base");
      }

      // If user explicitly selects a profile for this date, selected profile archetype
      // must win over previously stored snapshot.
      if (options?.forceProfileId) {
        return normalizeDayArchetype(
          selectedProfile?.archetype ?? existingLog?.archetype_snapshot ?? baseProfile?.day_archetype ?? storedTarget?.day_archetype ?? "base",
        );
      }

      // Default resolution path when there is no explicit profile change.
      return normalizeDayArchetype(
        existingLog?.archetype_snapshot ?? selectedProfile?.archetype ?? baseProfile?.day_archetype ?? storedTarget?.day_archetype ?? "base",
      );
    })();
  const calorieOverride =
    options?.forceCalorieOverride !== undefined
      ? options.forceCalorieOverride
      : existingLog?.calorie_override ?? storedTarget?.calorie_override ?? null;

  const profile: NutritionMetabolicProfile = {
    sex,
    age,
    weightKg,
    heightCm,
    activityLevel,
    goalType,
    dayArchetype,
    birthDate,
    calorieOverride,
    isCalorieOverrideEnabled: calorieOverride !== null && calorieOverride !== undefined,
  };

  const target = calculateNutritionTargets(profile);
  const nowIso = new Date().toISOString();
  const resolvedLog: DailyNutritionLog = {
    id: existingLog?.id ?? `guest-log-${dateKey}`,
    user_id: userId ?? "guest",
    date_key: dateKey,
    nutrition_profile_id: selectedProfile?.id ?? null,
    profile_name_snapshot: selectedProfile?.name ?? null,
    archetype_snapshot: target.dayArchetype,
    target_calories: target.finalTargetCalories,
    target_protein_g: Number(target.proteinGrams.toFixed(1)),
    target_carbs_g: Number(target.carbGrams.toFixed(1)),
    target_fat_g: Number(target.fatGrams.toFixed(1)),
    base_tdee: target.tdee,
    weight_snapshot_kg: profile.weightKg,
    calorie_adjustment: target.archetypeDelta,
    calorie_override: profile.calorieOverride,
    created_at: existingLog?.created_at ?? nowIso,
    updated_at: nowIso,
  };

  if (isGuest || !userId) {
    const dayArchetypes = parseGuestDayArchetypeMap();
    dayArchetypes[dateKey] = target.dayArchetype;
    saveGuestDayArchetypeMap(dayArchetypes);

    const overrides = parseGuestDayOverrideMap();
    if (profile.calorieOverride !== null && profile.calorieOverride !== undefined) overrides[dateKey] = profile.calorieOverride;
    else delete overrides[dateKey];
    saveGuestDayOverrideMap(overrides);
    const guestLogs = parseGuestDailyLogs();
    const nextGuestLogs = [
      resolvedLog,
      ...guestLogs.filter((row) => row.date_key !== dateKey),
    ];
    saveGuestDailyLogs(nextGuestLogs);
  } else {
    await persistDailyTarget({ userId, dateKey, target, calorieOverride: profile.calorieOverride });
    await persistDailyLog({ userId, log: resolvedLog });
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
    if (clearError) {
      const message = (clearError as { message?: string } | null)?.message?.toLowerCase() ?? "";
      if (!(message.includes("schema cache") || message.includes("does not exist") || message.includes("could not find") || message.includes("column") || message.includes("relation"))) {
        throw clearError;
      }
    }
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
  if (countError) {
    const message = (countError as { message?: string } | null)?.message?.toLowerCase() ?? "";
    if (!(message.includes("schema cache") || message.includes("does not exist") || message.includes("could not find") || message.includes("column") || message.includes("relation"))) {
      throw countError;
    }
  }
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

export const buildLegacyGoals = (goals: Partial<NutritionGoalsLegacy>) => ({
  calorie_goal: Number(goals.calorie_goal ?? DEFAULT_NUTRITION_GOALS.calorie_goal),
  protein_goal_g: Number(goals.protein_goal_g ?? DEFAULT_NUTRITION_GOALS.protein_goal_g),
  carb_goal_g: Number(goals.carb_goal_g ?? DEFAULT_NUTRITION_GOALS.carb_goal_g),
  fat_goal_g: Number(goals.fat_goal_g ?? DEFAULT_NUTRITION_GOALS.fat_goal_g),
});

export const persistLegacyGoals = async (userId: string | null, next: NutritionGoalsLegacy, options?: { isGuest?: boolean }) => {
  saveGuestGoals(next);
  if (!options?.isGuest && userId) {
    const { error } = await supabase.from("profiles").update(next).eq("id", userId);
    if (error) throw error;
  }
};
