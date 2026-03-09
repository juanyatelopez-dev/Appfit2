export type NutritionMealType = "breakfast" | "lunch" | "dinner" | "snack";

export type NutritionSex = "male" | "female";
export type NutritionActivityLevel = "low" | "moderate" | "high" | "very_high" | "hyperactive";
export type NutritionGoalType = "lose" | "maintain" | "gain";
export type NutritionDayArchetype = "base" | "heavy" | "recovery";

export type NutritionMicronutrients = Record<string, number>;

export type NutritionEntry = {
  id: string;
  user_id: string;
  date_key: string;
  meal_type: NutritionMealType;
  food_name: string;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  potassium_mg: number | null;
  micronutrients: NutritionMicronutrients | null;
  nutrient_density_score: number | null;
  notes: string | null;
  created_at: string;
};

export type FavoriteFood = {
  id: string;
  user_id: string;
  name: string;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  sodium_mg: number | null;
  potassium_mg: number | null;
  micronutrients: NutritionMicronutrients | null;
  nutrient_density_score: number | null;
  created_at: string;
};

export type FoodDatabaseItem = {
  id: string;
  food_name: string;
  category: string;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  potassium_mg: number | null;
  micronutrients: NutritionMicronutrients | null;
  source: string;
  created_at: string;
};

export type NutritionMacroTotals = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
  potassium_mg: number;
  sodium_potassium_ratio: number | null;
  nutrient_density_score: number | null;
};

export type NutritionCalculationInput = {
  sex: NutritionSex;
  age: number;
  weightKg: number;
  heightCm: number;
  activityLevel: NutritionActivityLevel;
  goalType: NutritionGoalType;
  dayArchetype: NutritionDayArchetype;
  calorieOverride?: number | null;
};

export type NutritionTargetBreakdown = {
  bmr: number;
  tdee: number;
  calorieTarget: number;
  finalTargetCalories: number;
  proteinGrams: number;
  fatGrams: number;
  carbGrams: number;
  proteinCalories: number;
  fatCalories: number;
  carbCalories: number;
  activityMultiplier: number;
  goalMultiplier: number;
  archetypeDelta: number;
  dayArchetype: NutritionDayArchetype;
  isOverrideApplied: boolean;
};

export type NutritionGoals = {
  calorie_goal: number;
  protein_goal_g: number;
  carb_goal_g: number;
  fat_goal_g: number;
  day_archetype: NutritionDayArchetype;
  bmr: number;
  tdee: number;
  activity_multiplier: number;
  goal_multiplier: number;
  archetype_delta: number;
  calorie_target: number;
  final_target_calories: number;
};

export type NutritionMetabolicProfile = {
  sex: NutritionSex;
  age: number;
  weightKg: number;
  heightCm: number;
  activityLevel: NutritionActivityLevel;
  goalType: NutritionGoalType;
  dayArchetype: NutritionDayArchetype;
  birthDate: string | null;
  calorieOverride: number | null;
  isCalorieOverrideEnabled: boolean;
};

export type DailyNutritionTargetRow = {
  id: string;
  user_id: string;
  date_key: string;
  day_archetype: NutritionDayArchetype;
  bmr: number;
  tdee: number;
  calorie_target: number;
  final_target_calories: number;
  protein_grams: number;
  fat_grams: number;
  carb_grams: number;
  protein_calories: number;
  fat_calories: number;
  carb_calories: number;
  activity_multiplier: number;
  goal_multiplier: number;
  archetype_delta: number;
  calorie_override: number | null;
  is_manual_override: boolean;
  created_at: string;
  updated_at: string;
};

export type DailyNutritionSummaryRow = {
  id: string;
  user_id: string;
  date_key: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_fiber_g: number;
  total_sugar_g: number;
  total_sodium_mg: number;
  total_potassium_mg: number;
  sodium_potassium_ratio: number | null;
  nutrient_density_score: number | null;
  meal_count: number;
  created_at: string;
  updated_at: string;
};
