import { describe, expect, it } from "vitest";

import {
  normalizeDailyLog,
  normalizeEntry,
  normalizeFavorite,
  normalizeFoodDatabaseItem,
  normalizeNutritionProfile,
} from "@/services/nutritionNormalization";

describe("nutrition normalization", () => {
  it("normalizes entry-like records with sane defaults", () => {
    const entry = normalizeEntry({
      id: 1,
      user_id: "user-1",
      date_key: "2026-03-13",
      meal_type: "lunch",
      food_name: "Chicken bowl",
      calories: "550",
      protein_g: "40",
      carbs_g: 50,
      fat_g: 12,
    });

    expect(entry.id).toBe("1");
    expect(entry.calories).toBe(550);
    expect(entry.serving_unit).toBe("g");
    expect(entry.notes).toBeNull();
  });

  it("normalizes profile, favorite, food database item and daily log rows", () => {
    const profile = normalizeNutritionProfile({ id: 7, archetype: "rest", is_default: 1, is_archived: 0 });
    const favorite = normalizeFavorite({ id: 3, user_id: "u1", name: "Oats", calories: "120" });
    const food = normalizeFoodDatabaseItem({ id: 5, food_name: "Rice", category_i18n: { es: "Cereales" } });
    const dailyLog = normalizeDailyLog({ id: 2, date_key: "2026-03-13", archetype_snapshot: "heavy", target_calories: "2400" });

    expect(profile.archetype).toBe("recovery");
    expect(favorite.calories).toBe(120);
    expect(food.category).toBe("Other");
    expect(dailyLog.archetype_snapshot).toBe("heavy");
    expect(dailyLog.target_calories).toBe(2400);
  });
});
