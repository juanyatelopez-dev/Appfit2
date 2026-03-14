import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { NutritionSidebarPanel } from "@/pages/nutrition/components/NutritionSidebarPanel";
import type { NutritionProfileRecord } from "@/services/nutrition";

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
  {
    id: "profile-2",
    user_id: "user-1",
    name: "Descanso",
    archetype: "rest",
    is_default: false,
    is_archived: false,
    created_at: "2026-03-13T10:00:00.000Z",
    updated_at: "2026-03-13T10:00:00.000Z",
  },
];

function renderPanel(overrides: Partial<ComponentProps<typeof NutritionSidebarPanel>> = {}) {
  const onCreateProfile = vi.fn();
  const onEditProfile = vi.fn();
  const onSetDefaultProfile = vi.fn();
  const onArchiveProfile = vi.fn();
  const onDeleteProfile = vi.fn();

  const props: ComponentProps<typeof NutritionSidebarPanel> = {
    effectiveProfileLabel: "Torso",
    activeArchetype: "heavy",
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
    profileOptions,
    caloriesPct: 79,
    proteinPct: 89,
    carbsPct: 78,
    fatPct: 80,
    onCreateProfile,
    onEditProfile,
    onSetDefaultProfile,
    onArchiveProfile,
    onDeleteProfile,
    ...overrides,
  };

  return {
    ...render(
      <MemoryRouter>
        <NutritionSidebarPanel {...props} />
      </MemoryRouter>,
    ),
    callbacks: {
      onCreateProfile,
      onEditProfile,
      onSetDefaultProfile,
      onArchiveProfile,
      onDeleteProfile,
    },
  };
}

describe("NutritionSidebarPanel", () => {
  it("renders energy balance and metabolic profile summary", () => {
    renderPanel();

    expect(screen.getByText("Perfil del dia")).toBeInTheDocument();
    expect(screen.getByText("Balance energetico")).toBeInTheDocument();
    expect(screen.getByText("Perfil metabolico")).toBeInTheDocument();
    expect(screen.getByText("2650 kcal")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Abrir Perfil Fitness/i })).toHaveAttribute("href", "/fitness-profile");
  });

  it("triggers profile management actions", () => {
    const { callbacks } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: /Nuevo/i }));
    fireEvent.click(screen.getByRole("button", { name: /Editar/i }));
    fireEvent.click(screen.getByRole("button", { name: /Predeterminado/i }));
    fireEvent.click(screen.getByRole("button", { name: /Archivar/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /Eliminar/i })[0]);

    expect(callbacks.onCreateProfile).toHaveBeenCalled();
    expect(callbacks.onEditProfile).toHaveBeenCalledWith(profileOptions[0]);
    expect(callbacks.onSetDefaultProfile).toHaveBeenCalledWith("profile-2");
    expect(callbacks.onArchiveProfile).toHaveBeenCalledWith("profile-1");
    expect(callbacks.onDeleteProfile).toHaveBeenCalledWith("profile-1");
  });
});
