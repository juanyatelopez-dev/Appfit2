
import { DEFAULT_WATER_TIMEZONE, createDateKeyRange, getDateKeyForTimezone } from "@/features/water/waterUtils";
import {
  calculateAgeFromBirthDate,
  calculateNutrientDensityScore,
  calculateNutritionTargets,
  calculateSodiumPotassiumRatio,
} from "@/lib/nutritionCalculator";
import { supabase } from "@/services/supabaseClient";
import {
  DailyNutritionTargetRow,
  FavoriteFood,
  FoodDatabaseItem,
  NutritionDayArchetype,
  NutritionEntry,
  NutritionGoals,
  NutritionMacroTotals,
  NutritionMealType,
  NutritionMetabolicProfile,
  NutritionMicronutrients,
} from "@/types/nutrition";

export type {
  DailyNutritionTargetRow,
  FavoriteFood,
  FoodDatabaseItem,
  NutritionDayArchetype,
  NutritionEntry,
  NutritionGoals,
  NutritionMacroTotals,
  NutritionMealType,
  NutritionMetabolicProfile,
};

type NutritionProfileLike = {
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

type NutritionGoalOptions = {
  isGuest?: boolean;
  timeZone?: string;
  date?: Date;
  dayArchetype?: NutritionDayArchetype;
  profile?: NutritionProfileLike | null;
};

type NutritionGoalsLegacy = {
  calorie_goal: number;
  protein_goal_g: number;
  carb_goal_g: number;
  fat_goal_g: number;
};

type NutritionEntryInsertParams = {
  userId: string | null;
  date: Date;
  meal_type: NutritionMealType;
  food_name: string;
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

const DEFAULT_NUTRITION_GOALS: NutritionGoalsLegacy = {
  calorie_goal: 2000,
  protein_goal_g: 150,
  carb_goal_g: 250,
  fat_goal_g: 70,
};

const DEFAULT_METABOLIC_PROFILE: NutritionMetabolicProfile = {
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

const GUEST_NUTRITION_ENTRIES_KEY = "appfit_guest_nutrition_entries";
const GUEST_NUTRITION_FAVORITES_KEY = "appfit_guest_nutrition_favorites";
const GUEST_NUTRITION_GOALS_KEY = "appfit_guest_nutrition_goals";
const GUEST_DAY_ARCHETYPE_KEY = "appfit_guest_nutrition_day_archetype";
const GUEST_DAY_OVERRIDE_KEY = "appfit_guest_nutrition_day_calorie_override";

const isSchemaError = (error: unknown) => {
  const message = (error as { message?: string } | null)?.message?.toLowerCase() ?? "";
  return (
    message.includes("schema cache") ||
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("column") ||
    message.includes("relation")
  );
};

const sanitizeNumber = (value: unknown, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const assertNonNegative = (value: number, field: string) => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a non-negative number.`);
  }
};

const assertPositive = (value: number, field: string) => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be greater than 0.`);
  }
};

const normalizeEntry = (row: any): NutritionEntry => ({
  id: String(row.id),
  user_id: String(row.user_id),
  date_key: String(row.date_key),
  meal_type: row.meal_type as NutritionMealType,
  food_name: String(row.food_name ?? ""),
  serving_size: sanitizeNumber(row.serving_size),
  serving_unit: String(row.serving_unit ?? "g"),
  calories: sanitizeNumber(row.calories),
  protein_g: sanitizeNumber(row.protein_g),
  carbs_g: sanitizeNumber(row.carbs_g),
  fat_g: sanitizeNumber(row.fat_g),
  fiber_g: row.fiber_g === null || row.fiber_g === undefined ? null : sanitizeNumber(row.fiber_g),
  sugar_g: row.sugar_g === null || row.sugar_g === undefined ? null : sanitizeNumber(row.sugar_g),
  sodium_mg: row.sodium_mg === null || row.sodium_mg === undefined ? null : sanitizeNumber(row.sodium_mg),
  potassium_mg: row.potassium_mg === null || row.potassium_mg === undefined ? null : sanitizeNumber(row.potassium_mg),
  micronutrients: row.micronutrients && typeof row.micronutrients === "object" ? (row.micronutrients as NutritionMicronutrients) : null,
  nutrient_density_score:
    row.nutrient_density_score === null || row.nutrient_density_score === undefined
      ? null
      : sanitizeNumber(row.nutrient_density_score),
  notes: row.notes ?? null,
  created_at: String(row.created_at ?? new Date().toISOString()),
});

const normalizeFavorite = (row: any): FavoriteFood => ({
  id: String(row.id),
  user_id: String(row.user_id),
  name: String(row.name ?? ""),
  serving_size: sanitizeNumber(row.serving_size),
  serving_unit: String(row.serving_unit ?? "g"),
  calories: sanitizeNumber(row.calories),
  protein_g: sanitizeNumber(row.protein_g),
  carbs_g: sanitizeNumber(row.carbs_g),
  fat_g: sanitizeNumber(row.fat_g),
  fiber_g: row.fiber_g === null || row.fiber_g === undefined ? null : sanitizeNumber(row.fiber_g),
  sodium_mg: row.sodium_mg === null || row.sodium_mg === undefined ? null : sanitizeNumber(row.sodium_mg),
  potassium_mg: row.potassium_mg === null || row.potassium_mg === undefined ? null : sanitizeNumber(row.potassium_mg),
  micronutrients: row.micronutrients && typeof row.micronutrients === "object" ? (row.micronutrients as NutritionMicronutrients) : null,
  nutrient_density_score:
    row.nutrient_density_score === null || row.nutrient_density_score === undefined
      ? null
      : sanitizeNumber(row.nutrient_density_score),
  created_at: String(row.created_at ?? new Date().toISOString()),
});

const normalizeFoodDatabaseItem = (row: any): FoodDatabaseItem => ({
  id: String(row.id),
  food_name: String(row.food_name ?? ""),
  category: String(row.category ?? "Other"),
  serving_size: sanitizeNumber(row.serving_size, 100),
  serving_unit: String(row.serving_unit ?? "g"),
  calories: sanitizeNumber(row.calories),
  protein_g: sanitizeNumber(row.protein_g),
  carbs_g: sanitizeNumber(row.carbs_g),
  fat_g: sanitizeNumber(row.fat_g),
  fiber_g: row.fiber_g === null || row.fiber_g === undefined ? null : sanitizeNumber(row.fiber_g),
  sugar_g: row.sugar_g === null || row.sugar_g === undefined ? null : sanitizeNumber(row.sugar_g),
  sodium_mg: row.sodium_mg === null || row.sodium_mg === undefined ? null : sanitizeNumber(row.sodium_mg),
  potassium_mg: row.potassium_mg === null || row.potassium_mg === undefined ? null : sanitizeNumber(row.potassium_mg),
  micronutrients: row.micronutrients && typeof row.micronutrients === "object" ? (row.micronutrients as NutritionMicronutrients) : null,
  source: String(row.source ?? "USDA"),
  created_at: String(row.created_at ?? new Date().toISOString()),
});
const parseGuestEntries = (): NutritionEntry[] => {
  const raw = localStorage.getItem(GUEST_NUTRITION_ENTRIES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as any[];
    return Array.isArray(parsed) ? parsed.map(normalizeEntry) : [];
  } catch {
    return [];
  }
};

const saveGuestEntries = (rows: NutritionEntry[]) => localStorage.setItem(GUEST_NUTRITION_ENTRIES_KEY, JSON.stringify(rows));

const parseGuestFavorites = (): FavoriteFood[] => {
  const raw = localStorage.getItem(GUEST_NUTRITION_FAVORITES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as any[];
    return Array.isArray(parsed) ? parsed.map(normalizeFavorite) : [];
  } catch {
    return [];
  }
};

const saveGuestFavorites = (rows: FavoriteFood[]) => localStorage.setItem(GUEST_NUTRITION_FAVORITES_KEY, JSON.stringify(rows));
const saveGuestGoals = (goals: NutritionGoalsLegacy) => localStorage.setItem(GUEST_NUTRITION_GOALS_KEY, JSON.stringify(goals));

const parseGuestDayArchetypeMap = (): Record<string, NutritionDayArchetype> => {
  const raw = localStorage.getItem(GUEST_DAY_ARCHETYPE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    if (!parsed || typeof parsed !== "object") return {};
    const result: Record<string, NutritionDayArchetype> = {};
    Object.keys(parsed).forEach((key) => {
      result[key] = normalizeDayArchetype(parsed[key]);
    });
    return result;
  } catch {
    return {};
  }
};

const saveGuestDayArchetypeMap = (value: Record<string, NutritionDayArchetype>) =>
  localStorage.setItem(GUEST_DAY_ARCHETYPE_KEY, JSON.stringify(value));

const parseGuestDayOverrideMap = (): Record<string, number> => {
  const raw = localStorage.getItem(GUEST_DAY_OVERRIDE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, number>;
    if (!parsed || typeof parsed !== "object") return {};
    const next: Record<string, number> = {};
    Object.entries(parsed).forEach(([key, value]) => {
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0) {
        next[key] = numeric;
      }
    });
    return next;
  } catch {
    return {};
  }
};

const saveGuestDayOverrideMap = (value: Record<string, number>) =>
  localStorage.setItem(GUEST_DAY_OVERRIDE_KEY, JSON.stringify(value));

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
    {
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
      sugar_g: 0,
      sodium_mg: 0,
      potassium_mg: 0,
    },
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
  nutrient_density_score:
    totals.nutrient_density_score === null ? null : Number(totals.nutrient_density_score.toFixed(1)),
});

const normalizeSex = (value: string | null | undefined): "male" | "female" => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["female", "f", "woman", "mujer", "femenino"].includes(normalized)) return "female";
  return "male";
};

const normalizeActivityLevel = (value: string | null | undefined): NutritionMetabolicProfile["activityLevel"] => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["low", "bajo", "sedentary"].includes(normalized)) return "low";
  if (["moderate", "moderado", "medium"].includes(normalized)) return "moderate";
  if (["high", "alto", "active"].includes(normalized)) return "high";
  if (["very_high", "very high", "muy_alto", "muy alto"].includes(normalized)) return "very_high";
  if (["hyperactive", "hiperactivo", "extreme"].includes(normalized)) return "hyperactive";
  return "moderate";
};

const normalizeGoalType = (value: string | null | undefined): NutritionMetabolicProfile["goalType"] => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["lose", "lose weight", "bajar", "bajar de peso", "fat loss", "cut"].some((item) => normalized.includes(item))) {
    return "lose";
  }
  if (["gain", "build", "muscle", "bulk", "aumentar", "ganar"].some((item) => normalized.includes(item))) {
    return "gain";
  }
  return "maintain";
};

const normalizeDayArchetype = (value: string | null | undefined): NutritionDayArchetype => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["heavy", "pesado", "hard"].includes(normalized)) return "heavy";
  if (["recovery", "descanso", "rest"].includes(normalized)) return "recovery";
  return "base";
};

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
    if (Number.isFinite(numeric)) {
      scaled[key] = Number((numeric * ratio).toFixed(2));
    }
  });
  return Object.keys(scaled).length > 0 ? scaled : null;
};

const getLatestWeightForDate = async (userId: string, dateKey: string) => {
  const { data, error } = await supabase
    .from("body_metrics")
    .select("weight_kg")
    .eq("user_id", userId)
    .lte("measured_at", dateKey)
    .order("measured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error && !isSchemaError(error)) throw error;
  return data?.weight_kg ? Number(data.weight_kg) : null;
};

const getStoredDailyTarget = async (userId: string, dateKey: string): Promise<DailyNutritionTargetRow | null> => {
  const { data, error } = await supabase
    .from("daily_nutrition_targets")
    .select("*")
    .eq("user_id", userId)
    .eq("date_key", dateKey)
    .limit(1)
    .maybeSingle();
  if (error) {
    if (isSchemaError(error)) return null;
    throw error;
  }
  return (data as DailyNutritionTargetRow | null) ?? null;
};

const upsertDailyTarget = async (params: {
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

const resolveMetabolicProfile = async (
  userId: string | null,
  date: Date,
  options?: NutritionGoalOptions & { forceDayArchetype?: NutritionDayArchetype; forceCalorieOverride?: number | null },
) => {
  const isGuest = options?.isGuest || false;
  const timeZone = options?.timeZone || DEFAULT_WATER_TIMEZONE;
  const dateKey = getDateKeyForTimezone(date, timeZone);

  if (isGuest || !userId) {
    const dayArchetypes = parseGuestDayArchetypeMap();
    const dayOverrides = parseGuestDayOverrideMap();
    const source = options?.profile ?? null;
    const age = calculateAgeFromBirthDate(source?.birth_date) ?? DEFAULT_METABOLIC_PROFILE.age;
    const dayArchetype = options?.forceDayArchetype ?? options?.dayArchetype ?? dayArchetypes[dateKey] ?? normalizeDayArchetype(source?.day_archetype);
    const override = options?.forceCalorieOverride !== undefined ? options.forceCalorieOverride : dayOverrides[dateKey] ?? null;

    return {
      profile: {
        sex: normalizeSex(source?.biological_sex),
        age,
        weightKg: sanitizeNumber(source?.weight, DEFAULT_METABOLIC_PROFILE.weightKg),
        heightCm: sanitizeNumber(source?.height, DEFAULT_METABOLIC_PROFILE.heightCm),
        activityLevel: normalizeActivityLevel(source?.activity_level),
        goalType: normalizeGoalType(source?.nutrition_goal_type ?? source?.goal_direction ?? source?.goal_type),
        dayArchetype,
        birthDate: source?.birth_date ?? null,
        calorieOverride: override,
        isCalorieOverrideEnabled: override !== null,
      },
      dateKey,
    };
  }

  let { data: profileData, error } = await supabase
    .from("profiles")
    .select("birth_date,weight,height,goal_type,goal_direction,biological_sex,activity_level,nutrition_goal_type,day_archetype")
    .eq("id", userId)
    .limit(1)
    .maybeSingle();

  if (error && isSchemaError(error)) {
    const fallback = await supabase
      .from("profiles")
      .select("birth_date,weight,height,goal_type,goal_direction")
      .eq("id", userId)
      .limit(1)
      .maybeSingle();
    profileData = fallback.data as any;
    error = fallback.error;
  }
  if (error) throw error;

  const latestWeight = await getLatestWeightForDate(userId, dateKey);
  const storedTarget = await getStoredDailyTarget(userId, dateKey);
  const dayArchetype =
    options?.forceDayArchetype ??
    options?.dayArchetype ??
    normalizeDayArchetype(storedTarget?.day_archetype ?? profileData?.day_archetype);
  const override =
    options?.forceCalorieOverride !== undefined ? options.forceCalorieOverride : storedTarget?.calorie_override ?? null;

  return {
    profile: {
      sex: normalizeSex(profileData?.biological_sex),
      age: calculateAgeFromBirthDate(profileData?.birth_date) ?? DEFAULT_METABOLIC_PROFILE.age,
      weightKg: sanitizeNumber(latestWeight ?? profileData?.weight, DEFAULT_METABOLIC_PROFILE.weightKg),
      heightCm: sanitizeNumber(profileData?.height, DEFAULT_METABOLIC_PROFILE.heightCm),
      activityLevel: normalizeActivityLevel(profileData?.activity_level),
      goalType: normalizeGoalType(profileData?.nutrition_goal_type ?? profileData?.goal_direction ?? profileData?.goal_type),
      dayArchetype,
      birthDate: profileData?.birth_date ?? null,
      calorieOverride: override,
      isCalorieOverrideEnabled: override !== null,
    },
    dateKey,
  };
};

const computeAndPersistTarget = async (
  userId: string | null,
  date: Date,
  options?: NutritionGoalOptions & { forceDayArchetype?: NutritionDayArchetype; forceCalorieOverride?: number | null },
) => {
  const resolved = await resolveMetabolicProfile(userId, date, options);
  const target = calculateNutritionTargets({
    sex: resolved.profile.sex,
    age: resolved.profile.age,
    weightKg: resolved.profile.weightKg,
    heightCm: resolved.profile.heightCm,
    activityLevel: resolved.profile.activityLevel,
    goalType: resolved.profile.goalType,
    dayArchetype: resolved.profile.dayArchetype,
    calorieOverride: resolved.profile.calorieOverride,
  });

  if (options?.isGuest || !userId) {
    const dayArchetypes = parseGuestDayArchetypeMap();
    dayArchetypes[resolved.dateKey] = target.dayArchetype;
    saveGuestDayArchetypeMap(dayArchetypes);

    const overrides = parseGuestDayOverrideMap();
    if (resolved.profile.calorieOverride !== null && resolved.profile.calorieOverride !== undefined) {
      overrides[resolved.dateKey] = resolved.profile.calorieOverride;
    } else {
      delete overrides[resolved.dateKey];
    }
    saveGuestDayOverrideMap(overrides);
  } else {
    await upsertDailyTarget({
      userId,
      dateKey: resolved.dateKey,
      target,
      calorieOverride: resolved.profile.calorieOverride,
    });
  }

  return { profile: resolved.profile, target, dateKey: resolved.dateKey };
};

export const getNutritionMetabolicProfile = async (
  userId: string | null,
  date: Date,
  options?: NutritionGoalOptions,
): Promise<NutritionMetabolicProfile> => {
  const resolved = await resolveMetabolicProfile(userId, date, options);
  return resolved.profile;
};

export const getNutritionTargetBreakdown = async (
  userId: string | null,
  date = new Date(),
  options?: NutritionGoalOptions,
) => computeAndPersistTarget(userId, date, options);

export const setNutritionDayArchetype = async (
  userId: string | null,
  date: Date,
  dayArchetype: NutritionDayArchetype,
  options?: NutritionGoalOptions,
) => computeAndPersistTarget(userId, date, { ...options, forceDayArchetype: dayArchetype });

export const setDailyCalorieOverride = async (
  userId: string | null,
  date: Date,
  calorieOverride: number | null,
  options?: NutritionGoalOptions,
) => {
  if (calorieOverride !== null) {
    assertPositive(calorieOverride, "Calorie override");
  }
  return computeAndPersistTarget(userId, date, { ...options, forceCalorieOverride: calorieOverride });
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

  const payload = {
    date_key: getDateKeyForTimezone(date, timeZone),
    meal_type,
    food_name: name,
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

  const { data, error } = await supabase
    .from("nutrition_entries")
    .update(updates as any)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
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

  const groups: Record<NutritionMealType, NutritionEntry[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
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
  const { target, profile, dateKey } = await getNutritionTargetBreakdown(userId, date, options);
  const goals = toNutritionGoals(target);

  const mealTotals: Record<NutritionMealType, NutritionMacroTotals> = {
    breakfast: roundTotals(aggregateTotals(groups.breakfast)),
    lunch: roundTotals(aggregateTotals(groups.lunch)),
    dinner: roundTotals(aggregateTotals(groups.dinner)),
    snack: roundTotals(aggregateTotals(groups.snack)),
  };

  if (!options?.isGuest && userId) {
    await persistDailySummary({ userId, dateKey, totals, mealCount: allEntries.length });
  }

  return {
    groups,
    totals,
    mealTotals,
    goals,
    lastEntry: [...allEntries].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null,
    targetBreakdown: target,
    metabolicProfile: profile,
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

  const { data, error } = await supabase
    .from("nutrition_entries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(normalizeEntry);
};

export const getFavoriteFoods = async (userId: string | null, options?: { isGuest?: boolean }): Promise<FavoriteFood[]> => {
  const isGuest = options?.isGuest || false;
  if (isGuest) return parseGuestFavorites().sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (!userId) return [];

  const { data, error } = await supabase
    .from("nutrition_favorites")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizeFavorite);
};

export const saveFavoriteFood = async (
  userId: string | null,
  payload: {
    name: string;
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
}): Promise<FoodDatabaseItem[]> => {
  const query = params?.query?.trim() || "";
  const category = params?.category?.trim() || "";
  const limit = Math.max(1, Math.min(100, Number(params?.limit ?? 25)));

  let request = supabase.from("food_database").select("*").order("food_name", { ascending: true }).limit(limit);
  if (category && category !== "all") {
    request = request.eq("category", category);
  }
  if (query) {
    request = request.ilike("food_name", `%${query}%`);
  }

  const { data, error } = await request;
  if (error) throw error;
  return (data || []).map(normalizeFoodDatabaseItem);
};

export const listFoodDatabaseCategories = async (): Promise<string[]> => {
  const { data, error } = await supabase.from("food_database").select("category");
  if (error) throw error;
  const unique = Array.from(new Set((data || []).map((row: any) => String(row.category || "").trim()).filter(Boolean)));
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
