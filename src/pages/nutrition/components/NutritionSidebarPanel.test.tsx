import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { NutritionSidebarPanel } from "@/modules/nutrition/ui/components/NutritionSidebarPanel";

function renderPanel(overrides: Partial<ComponentProps<typeof NutritionSidebarPanel>> = {}) {
  const onOpenTechnicalConfig = vi.fn();

  const props: ComponentProps<typeof NutritionSidebarPanel> = {
    effectiveProfileLabel: "Torso",
    activeArchetype: "heavy",
    planSource: "selected_template",
    planSourceLabel: "Plantilla elegida",
    weightSource: "closest_on_or_before",
    target: {
      bmr: 1800,
      tdee: 2400,
      calorieTarget: 2650,
      finalTargetCalories: 2650,
      proteinGrams: 180,
      fatGrams: 75,
      carbGrams: 280,
      proteinCalories: 720,
      fatCalories: 675,
      carbCalories: 1120,
      activityMultiplier: 1.55,
      goalMultiplier: 1,
      archetypeDelta: 250,
      dayArchetype: "heavy",
      isOverrideApplied: false,
    },
    goals: {
      calorie_goal: 2650,
      protein_goal_g: 180,
      carb_goal_g: 280,
      fat_goal_g: 75,
      day_archetype: "heavy",
      bmr: 1800,
      tdee: 2400,
      activity_multiplier: 1.55,
      goal_multiplier: 1,
      archetype_delta: 250,
      calorie_target: 2400,
      final_target_calories: 2650,
    },
    totals: {
      calories: 2100,
      protein_g: 160,
      carbs_g: 220,
      fat_g: 60,
      fiber_g: 25,
      sugar_g: 40,
      sodium_mg: 900,
      potassium_mg: 2100,
      sodium_potassium_ratio: 0.43,
      nutrient_density_score: 78,
    },
    remaining: {
      calories: 550,
    },
    metabolicProfile: {
      sex: "male",
      age: 30,
      weightKg: 80,
      heightCm: 180,
      activityLevel: "moderate",
      goalType: "maintain",
      dayArchetype: "heavy",
      birthDate: "1996-03-13",
      calorieOverride: null,
      isCalorieOverrideEnabled: false,
    },
    caloriesPct: 79,
    proteinPct: 89,
    carbsPct: 78,
    fatPct: 80,
    onOpenTechnicalConfig,
    ...overrides,
  };

  return {
    ...render(
      <MemoryRouter>
        <NutritionSidebarPanel {...props} />
      </MemoryRouter>,
    ),
    callbacks: {
      onOpenTechnicalConfig,
    },
  };
}

describe("NutritionSidebarPanel", () => {
  it("renders control cards and technical access", () => {
    renderPanel();

    expect(screen.getByText("Plan de hoy")).toBeInTheDocument();
    expect(screen.getByText("Balance energetico")).toBeInTheDocument();
    expect(screen.getByText("Macros")).toBeInTheDocument();
    expect(screen.getByText("2650 kcal")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ver configuracion tecnica/i })).toBeInTheDocument();
  });

  it("opens technical configuration", () => {
    const { callbacks } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: /Ver configuracion tecnica/i }));
    expect(callbacks.onOpenTechnicalConfig).toHaveBeenCalled();
  });
});
