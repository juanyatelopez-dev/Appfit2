import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NutritionHeaderSection } from "@/modules/nutrition/ui/components/NutritionHeaderSection";
import type { NutritionProfileRecord } from "@/modules/nutrition/types";

const profileOptions: NutritionProfileRecord[] = [
  {
    id: "profile-1",
    user_id: "user-1",
    name: "Torso",
    archetype: "heavy",
    is_default: true,
    is_archived: false,
    created_at: "2026-03-13T10:00:00.000Z",
    updated_at: "2026-03-13T10:00:00.000Z",
  },
];

function renderSection(overrides: Partial<ComponentProps<typeof NutritionHeaderSection>> = {}) {
  const onPreviousDate = vi.fn();
  const onNextDate = vi.fn();
  const onSelectProfile = vi.fn();
  const onApplyWeeklyPlan = vi.fn();
  const onOpenTechnicalConfig = vi.fn();

  const props: ComponentProps<typeof NutritionHeaderSection> = {
    selectedDate: new Date("2026-03-13T12:00:00"),
    selectedProfileId: "profile-1",
    selectedPlanName: "Torso",
    profileOptions,
    activeArchetype: "heavy",
    archetypeDescription: "Mayor demanda energetica y de recuperacion.",
    planSource: "selected_template",
    planSourceLabel: "Plantilla elegida",
    planSourceDescription: "Esta plantilla tiene prioridad para este dia.",
    weightSource: "closest_on_or_before",
    target: {
      bmr: 1800,
      tdee: 2670,
      calorieTarget: 2403,
      finalTargetCalories: 2103,
      proteinGrams: 150,
      fatGrams: 70,
      carbGrams: 220,
      proteinCalories: 600,
      fatCalories: 630,
      carbCalories: 880,
      activityMultiplier: 1.55,
      goalMultiplier: 0.9,
      archetypeDelta: -300,
      dayArchetype: "heavy",
      isOverrideApplied: false,
    },
    goals: {
      calorie_goal: 2103,
      protein_goal_g: 150,
      carb_goal_g: 220,
      fat_goal_g: 70,
      day_archetype: "heavy",
      bmr: 1800,
      tdee: 2670,
      activity_multiplier: 1.55,
      goal_multiplier: 0.9,
      archetype_delta: -300,
      calorie_target: 2403,
      final_target_calories: 2103,
    },
    metabolicProfile: {
      sex: "male",
      age: 30,
      weightKg: 80,
      heightCm: 178,
      activityLevel: "high",
      goalType: "lose_slow",
      dayArchetype: "heavy",
      birthDate: "1995-01-01",
      calorieOverride: null,
      isCalorieOverrideEnabled: false,
    },
    onPreviousDate,
    onNextDate,
    onSelectProfile,
    onApplyWeeklyPlan,
    onOpenTechnicalConfig,
    ...overrides,
  };

  return {
    ...render(<NutritionHeaderSection {...props} />),
    callbacks: {
      onPreviousDate,
      onNextDate,
      onSelectProfile,
      onApplyWeeklyPlan,
      onOpenTechnicalConfig,
    },
  };
}

describe("NutritionHeaderSection", () => {
  it("renders headline, selected date and total calories", () => {
    renderSection();

    expect(screen.getByText("Nutricion - Hoy")).toBeInTheDocument();
    expect(screen.getByText("13/03/2026")).toBeInTheDocument();
    expect(screen.getByText("13/03/2026")).toBeInTheDocument();
  });

  it("triggers date navigation and technical action", () => {
    const { callbacks } = renderSection();
    const iconButtons = screen.getAllByRole("button", { name: "" });
    fireEvent.click(iconButtons[0]);
    fireEvent.click(iconButtons[1]);
    fireEvent.click(screen.getByRole("button", { name: /Config tecnica/i }));

    expect(callbacks.onPreviousDate).toHaveBeenCalled();
    expect(callbacks.onNextDate).toHaveBeenCalled();
    expect(callbacks.onOpenTechnicalConfig).toHaveBeenCalled();
  });

  it("opens weekly planner and applies selected days", () => {
    const { callbacks } = renderSection();
    fireEvent.click(screen.getByRole("button", { name: /Plan semanal/i }));
    fireEvent.click(screen.getByRole("button", { name: /Aplicar plan semanal/i }));
    expect(callbacks.onApplyWeeklyPlan).toHaveBeenCalled();
  });

  it("shows selected plan name in plan source section", () => {
    renderSection();
    expect(screen.getByText("Plantilla elegida: Torso")).toBeInTheDocument();
  });
});
