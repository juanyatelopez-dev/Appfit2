import { calculateNutrientDensityScore } from "@/lib/nutritionCalculator";
import { parseGuestEntries, parseGuestFavorites, saveGuestFavorites } from "@/services/nutritionGuestState";
import { normalizeEntry, normalizeFavorite, normalizeFoodDatabaseItem } from "@/services/nutritionNormalization";
import { getLocalizedNutritionText } from "@/services/nutritionShared";
import { assertNonNegative, assertPositive, scaleMicronutrients } from "@/services/nutritionCore";
import { supabase } from "@/services/supabaseClient";
import type {
  FavoriteFood,
  FoodDatabaseItem,
  LocalizedNutritionText,
  NutritionEntry,
  NutritionMicronutrients,
} from "@/types/nutrition";

const getFoodSearchText = (row: FoodDatabaseItem) =>
  [row.food_name, row.food_name_i18n?.en, row.food_name_i18n?.es, row.category, row.category_i18n?.en, row.category_i18n?.es]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .toLowerCase();

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

export const updateFavoriteFood = async (
  favoriteId: string,
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
  const id = favoriteId.trim();
  if (!id) return null;

  const name = payload.name.trim();
  if (!name) throw new Error("Name is required.");

  const servingSize = Number(payload.serving_size);
  const calories = Number(payload.calories);
  const protein = Number(payload.protein_g);
  const carbs = Number(payload.carbs_g);
  const fat = Number(payload.fat_g);
  const fiber = payload.fiber_g === null || payload.fiber_g === undefined ? null : Number(payload.fiber_g);
  const sodium = payload.sodium_mg === null || payload.sodium_mg === undefined ? null : Number(payload.sodium_mg);
  const potassium = payload.potassium_mg === null || payload.potassium_mg === undefined ? null : Number(payload.potassium_mg);

  assertPositive(servingSize, "Serving size");
  assertNonNegative(calories, "Calories");
  assertNonNegative(protein, "Protein");
  assertNonNegative(carbs, "Carbs");
  assertNonNegative(fat, "Fat");
  if (fiber !== null) assertNonNegative(fiber, "Fiber");
  if (sodium !== null) assertNonNegative(sodium, "Sodium");
  if (potassium !== null) assertNonNegative(potassium, "Potassium");

  const base = {
    name,
    name_i18n: payload.name_i18n ?? null,
    serving_size: servingSize,
    serving_unit: payload.serving_unit.trim() || "g",
    calories,
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
    fiber_g: fiber,
    sodium_mg: sodium,
    potassium_mg: potassium,
    micronutrients: payload.micronutrients ?? null,
    nutrient_density_score:
      payload.nutrient_density_score === null || payload.nutrient_density_score === undefined
        ? calculateNutrientDensityScore({
            calories,
            proteinG: protein,
            fiberG: Number(fiber ?? 0),
            sodiumMg: Number(sodium ?? 0),
            potassiumMg: Number(potassium ?? 0),
            micronutrients: payload.micronutrients ?? null,
          })
        : Number(payload.nutrient_density_score),
  };

  if (isGuest) {
    const rows = parseGuestFavorites();
    const index = rows.findIndex((row) => row.id === id);
    if (index < 0) return null;
    const next = normalizeFavorite({ ...rows[index], ...base });
    rows[index] = next;
    saveGuestFavorites(rows);
    return next;
  }
  if (!userId) return null;

  const { data, error } = await supabase
    .from("nutrition_favorites")
    .update(base)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return normalizeFavorite(data);
};

export const deleteFavoriteFood = async (favoriteId: string, userId: string | null, options?: { isGuest?: boolean }) => {
  const isGuest = options?.isGuest || false;
  const id = favoriteId.trim();
  if (!id) return;

  if (isGuest) {
    saveGuestFavorites(parseGuestFavorites().filter((row) => row.id !== id));
    return;
  }
  if (!userId) return;

  const { error } = await supabase.from("nutrition_favorites").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
};

export const searchFoodDatabase = async (params?: {
  query?: string;
  category?: string | null;
  limit?: number;
  language?: "en" | "es";
}): Promise<FoodDatabaseItem[]> => {
  const query = params?.query?.trim() || "";
  const category = params?.category?.trim() || "";
  const limit = Math.max(1, Math.min(5000, Number(params?.limit ?? 25)));
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
  };
};
