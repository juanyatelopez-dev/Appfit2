import {
  NutritionActivityLevel,
  NutritionCalculationInput,
  NutritionDayArchetype,
  NutritionGoalType,
  NutritionMicronutrients,
  NutritionTargetBreakdown,
} from "@/types/nutrition";

const ACTIVITY_MULTIPLIERS: Record<NutritionActivityLevel, number> = {
  low: 1.2,
  moderate: 1.375,
  high: 1.55,
  very_high: 1.725,
  hyperactive: 1.9,
};

const GOAL_MULTIPLIERS: Record<NutritionGoalType, number> = {
  lose: 0.8,
  maintain: 1,
  gain: 1.2,
};

const ARCHETYPE_DELTAS: Record<NutritionDayArchetype, number> = {
  base: 0,
  heavy: 150,
  recovery: -300,
};

const MIN_AGE = 12;
const MAX_AGE = 95;
const MIN_WEIGHT_KG = 25;
const MAX_WEIGHT_KG = 350;
const MIN_HEIGHT_CM = 120;
const MAX_HEIGHT_CM = 230;
const MIN_TARGET_KCAL = 900;
const MAX_TARGET_KCAL = 7000;

const roundNumber = (value: number, decimals = 1) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const sanitize = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
};

export const calculateAgeFromBirthDate = (birthDate: string | null | undefined, referenceDate = new Date()) => {
  if (!birthDate) return null;
  const parsed = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;

  let age = referenceDate.getFullYear() - parsed.getFullYear();
  const monthDiff = referenceDate.getMonth() - parsed.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < parsed.getDate())) {
    age -= 1;
  }
  if (!Number.isFinite(age)) return null;
  return sanitize(age, MIN_AGE, MAX_AGE);
};

export const getActivityMultiplier = (activityLevel: NutritionActivityLevel) => ACTIVITY_MULTIPLIERS[activityLevel];
export const getGoalMultiplier = (goalType: NutritionGoalType) => GOAL_MULTIPLIERS[goalType];
export const getDayArchetypeDelta = (dayArchetype: NutritionDayArchetype) => ARCHETYPE_DELTAS[dayArchetype];

export const calculateBmrMifflinStJeor = (params: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: "male" | "female";
}) => {
  const weightKg = sanitize(params.weightKg, MIN_WEIGHT_KG, MAX_WEIGHT_KG);
  const heightCm = sanitize(params.heightCm, MIN_HEIGHT_CM, MAX_HEIGHT_CM);
  const age = sanitize(params.age, MIN_AGE, MAX_AGE);
  const sexOffset = params.sex === "male" ? 5 : -161;
  return (10 * weightKg) + (6.25 * heightCm) - (5 * age) + sexOffset;
};

const calculateMacroTargetsFromCalories = (params: {
  weightKg: number;
  dayArchetype: NutritionDayArchetype;
  targetCalories: number;
}) => {
  const weightKg = sanitize(params.weightKg, MIN_WEIGHT_KG, MAX_WEIGHT_KG);
  const targetCalories = sanitize(params.targetCalories, MIN_TARGET_KCAL, MAX_TARGET_KCAL);

  let proteinGrams = roundNumber(weightKg * 2.2, 1);
  let fatGrams = roundNumber(weightKg * (params.dayArchetype === "recovery" ? 1.2 : 1), 1);

  const minProteinGrams = roundNumber(weightKg * 1.6, 1);
  const minFatGrams = roundNumber(weightKg * (params.dayArchetype === "recovery" ? 0.8 : 0.7), 1);

  let proteinCalories = roundNumber(proteinGrams * 4, 1);
  let fatCalories = roundNumber(fatGrams * 9, 1);

  if (proteinCalories + fatCalories > targetCalories) {
    const maxFatByCalories = Math.max(minFatGrams, roundNumber((targetCalories - proteinCalories) / 9, 1));
    fatGrams = sanitize(maxFatByCalories, minFatGrams, fatGrams);
    fatCalories = roundNumber(fatGrams * 9, 1);
  }

  if (proteinCalories + fatCalories > targetCalories) {
    const maxProteinByCalories = Math.max(minProteinGrams, roundNumber((targetCalories - fatCalories) / 4, 1));
    proteinGrams = sanitize(maxProteinByCalories, minProteinGrams, proteinGrams);
    proteinCalories = roundNumber(proteinGrams * 4, 1);
  }

  const remainingCalories = targetCalories - proteinCalories - fatCalories;
  const carbGrams = remainingCalories > 0 ? roundNumber(remainingCalories / 4, 1) : 0;
  const carbCalories = roundNumber(carbGrams * 4, 1);

  return {
    proteinGrams,
    fatGrams,
    carbGrams,
    proteinCalories,
    fatCalories,
    carbCalories,
  };
};

export const calculateNutritionTargets = (input: NutritionCalculationInput): NutritionTargetBreakdown => {
  const age = sanitize(input.age, MIN_AGE, MAX_AGE);
  const weightKg = sanitize(input.weightKg, MIN_WEIGHT_KG, MAX_WEIGHT_KG);
  const heightCm = sanitize(input.heightCm, MIN_HEIGHT_CM, MAX_HEIGHT_CM);

  const bmrRaw = calculateBmrMifflinStJeor({
    age,
    weightKg,
    heightCm,
    sex: input.sex,
  });

  const activityMultiplier = getActivityMultiplier(input.activityLevel);
  const goalMultiplier = getGoalMultiplier(input.goalType);
  const archetypeDelta = getDayArchetypeDelta(input.dayArchetype);

  const tdeeRaw = bmrRaw * activityMultiplier;
  const calorieTargetRaw = tdeeRaw * goalMultiplier;
  const computedFinalTarget = calorieTargetRaw + archetypeDelta;

  const finalTargetCalories = sanitize(
    input.calorieOverride !== null && input.calorieOverride !== undefined
      ? Number(input.calorieOverride)
      : computedFinalTarget,
    MIN_TARGET_KCAL,
    MAX_TARGET_KCAL,
  );

  const macros = calculateMacroTargetsFromCalories({
    dayArchetype: input.dayArchetype,
    targetCalories: finalTargetCalories,
    weightKg,
  });

  return {
    bmr: Math.round(bmrRaw),
    tdee: Math.round(tdeeRaw),
    calorieTarget: Math.round(calorieTargetRaw),
    finalTargetCalories: Math.round(finalTargetCalories),
    proteinGrams: macros.proteinGrams,
    fatGrams: macros.fatGrams,
    carbGrams: macros.carbGrams,
    proteinCalories: Math.round(macros.proteinCalories),
    fatCalories: Math.round(macros.fatCalories),
    carbCalories: Math.round(macros.carbCalories),
    activityMultiplier,
    goalMultiplier,
    archetypeDelta,
    dayArchetype: input.dayArchetype,
    isOverrideApplied: input.calorieOverride !== null && input.calorieOverride !== undefined,
  };
};

export const calculateSodiumPotassiumRatio = (sodiumMg: number, potassiumMg: number): number | null => {
  const sodium = Number(sodiumMg);
  const potassium = Number(potassiumMg);
  if (!Number.isFinite(sodium) || !Number.isFinite(potassium) || sodium < 0 || potassium <= 0) {
    return null;
  }
  return roundNumber(sodium / potassium, 3);
};

export const calculateNutrientDensityScore = (params: {
  calories: number;
  proteinG: number;
  fiberG: number;
  sodiumMg: number;
  potassiumMg: number;
  micronutrients?: NutritionMicronutrients | null;
}) => {
  const calories = Math.max(Number(params.calories) || 0, 1);
  const proteinG = Math.max(Number(params.proteinG) || 0, 0);
  const fiberG = Math.max(Number(params.fiberG) || 0, 0);
  const sodiumMg = Math.max(Number(params.sodiumMg) || 0, 0);
  const potassiumMg = Math.max(Number(params.potassiumMg) || 0, 0);

  const proteinPer1000 = (proteinG / calories) * 1000;
  const fiberPer1000 = (fiberG / calories) * 1000;

  let score = 0;
  score += Math.min(30, (proteinPer1000 / 70) * 30);
  score += Math.min(25, (fiberPer1000 / 14) * 25);

  const ratio = calculateSodiumPotassiumRatio(sodiumMg, potassiumMg);
  if (ratio !== null) {
    score += Math.max(0, Math.min(25, (2 - ratio) * 12.5));
  }

  if (params.micronutrients) {
    const microValues = Object.values(params.micronutrients).filter((value) => Number.isFinite(value) && value > 0);
    if (microValues.length > 0) {
      const avgMicro = microValues.reduce((sum, value) => sum + value, 0) / microValues.length;
      score += Math.min(20, avgMicro / 5);
    }
  }

  return roundNumber(Math.max(0, Math.min(100, score)), 1);
};
