import { describe, expect, it } from "vitest";

import {
  getLocalizedNutritionText,
  normalizeActivityLevel,
  normalizeDayArchetype,
  normalizeGoalType,
  normalizeLocalizedNutritionText,
  normalizeSex,
  sanitizeNumber,
} from "@/services/nutritionShared";

describe("nutrition shared helpers", () => {
  it("normalizes localized nutrition text and resolves preferred language", () => {
    const localized = normalizeLocalizedNutritionText({ en: "Chicken", es: "Pollo", empty: "" });

    expect(localized).toEqual({ en: "Chicken", es: "Pollo" });
    expect(getLocalizedNutritionText(localized, "es", "Chicken")).toBe("Pollo");
    expect(getLocalizedNutritionText({ en: "Chicken" }, "es", "Fallback")).toBe("Chicken");
    expect(getLocalizedNutritionText(null, "en", "Fallback")).toBe("Fallback");
  });

  it("normalizes sex, activity, goal type and day archetype values", () => {
    expect(normalizeSex("femenino")).toBe("female");
    expect(normalizeSex("unknown")).toBe("male");

    expect(normalizeActivityLevel("sedentary")).toBe("low");
    expect(normalizeActivityLevel("muy alto")).toBe("very_high");
    expect(normalizeActivityLevel("extreme")).toBe("hyperactive");

    expect(normalizeGoalType("slow cut")).toBe("lose_slow");
    expect(normalizeGoalType("ganar masa")).toBe("gain");
    expect(normalizeGoalType("something else")).toBe("maintain");

    expect(normalizeDayArchetype("rest")).toBe("recovery");
    expect(normalizeDayArchetype("pesado")).toBe("heavy");
    expect(normalizeDayArchetype("unknown")).toBe("base");
  });

  it("sanitizes numbers with fallback", () => {
    expect(sanitizeNumber("12.5")).toBe(12.5);
    expect(sanitizeNumber(undefined, 7)).toBe(7);
    expect(sanitizeNumber("nope", 3)).toBe(3);
  });
});
