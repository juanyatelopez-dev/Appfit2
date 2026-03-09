import { describe, expect, it } from "vitest";

import {
  calculateAgeFromBirthDate,
  calculateBmrMifflinStJeor,
  calculateNutrientDensityScore,
  calculateNutritionTargets,
  calculateSodiumPotassiumRatio,
  getActivityMultiplier,
  getDayArchetypeDelta,
  getGoalMultiplier,
} from "@/lib/nutritionCalculator";

describe("nutritionCalculator", () => {
  it("calculates BMR with Mifflin-St Jeor", () => {
    const bmrMale = calculateBmrMifflinStJeor({ weightKg: 80, heightCm: 180, age: 30, sex: "male" });
    const bmrFemale = calculateBmrMifflinStJeor({ weightKg: 60, heightCm: 165, age: 30, sex: "female" });

    expect(Math.round(bmrMale)).toBe(1780);
    expect(Math.round(bmrFemale)).toBe(1320);
  });

  it("resolves multipliers and archetype deltas", () => {
    expect(getActivityMultiplier("moderate")).toBe(1.375);
    expect(getGoalMultiplier("lose")).toBe(0.8);
    expect(getDayArchetypeDelta("heavy")).toBe(150);
  });

  it("calculates targets and macros without fixed percentages", () => {
    const target = calculateNutritionTargets({
      sex: "male",
      age: 32,
      weightKg: 84,
      heightCm: 178,
      activityLevel: "high",
      goalType: "maintain",
      dayArchetype: "base",
    });

    expect(target.bmr).toBeGreaterThan(1500);
    expect(target.tdee).toBeGreaterThan(target.bmr);
    expect(target.proteinGrams).toBeCloseTo(184.8, 1);
    expect(target.fatGrams).toBeCloseTo(84, 1);
    expect(target.carbGrams).toBeGreaterThan(0);
    expect(target.proteinCalories + target.fatCalories + target.carbCalories).toBeLessThanOrEqual(target.finalTargetCalories + 5);
  });

  it("applies calorie override when provided", () => {
    const target = calculateNutritionTargets({
      sex: "female",
      age: 28,
      weightKg: 64,
      heightCm: 168,
      activityLevel: "moderate",
      goalType: "lose",
      dayArchetype: "recovery",
      calorieOverride: 2100,
    });

    expect(target.finalTargetCalories).toBe(2100);
    expect(target.isOverrideApplied).toBe(true);
  });

  it("calculates sodium/potassium ratio and nutrient density score", () => {
    expect(calculateSodiumPotassiumRatio(2300, 4600)).toBe(0.5);
    expect(calculateSodiumPotassiumRatio(500, 0)).toBeNull();

    const score = calculateNutrientDensityScore({
      calories: 650,
      proteinG: 48,
      fiberG: 14,
      sodiumMg: 1200,
      potassiumMg: 2400,
      micronutrients: { magnesium_mg: 120, vitamin_c_mg: 80 },
    });

    expect(score).toBeGreaterThan(40);
  });

  it("calculates age from birth date", () => {
    const age = calculateAgeFromBirthDate("1995-10-12", new Date("2026-03-09T00:00:00"));
    expect(age).toBe(30);
  });
});
