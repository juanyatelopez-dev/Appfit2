import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NutritionMealsSection } from "@/pages/nutrition/components/NutritionMealsSection";
import { MEAL_SECTIONS } from "@/pages/nutrition/nutritionConstants";
import type { NutritionEntry } from "@/services/nutrition";

const breakfastEntry: NutritionEntry = {
  id: "entry-1",
  user_id: "user-1",
  date_key: "2026-03-13",
  daily_log_id: "log-1",
  meal_type: "breakfast",
  food_name: "Avena",
  serving_size: 100,
  serving_unit: "g",
  calories: 380,
  protein_g: 13,
  carbs_g: 67,
  fat_g: 7,
  fiber_g: 10,
  sugar_g: 1,
  sodium_mg: 2,
  potassium_mg: 350,
  micronutrients: null,
  nutrient_density_score: null,
  notes: null,
  created_at: "2026-03-13T10:00:00.000Z",
};

function renderSection(overrides: Partial<ComponentProps<typeof NutritionMealsSection>> = {}) {
  const onOpenMealDialog = vi.fn();
  const onToggleMeal = vi.fn();
  const onDeleteEntry = vi.fn();

  const props: ComponentProps<typeof NutritionMealsSection> = {
    mealOverview: [
      {
        meal: MEAL_SECTIONS[0],
        entries: [breakfastEntry],
        subtotal: {
          calories: 380,
          protein_g: 13,
          carbs_g: 67,
          fat_g: 7,
        },
      },
    ],
    expandedMeals: {
      breakfast: true,
      lunch: false,
      dinner: false,
      snack: false,
    },
    onOpenMealDialog,
    onToggleMeal,
    onDeleteEntry,
    ...overrides,
  };

  return {
    ...render(<NutritionMealsSection {...props} />),
    callbacks: {
      onOpenMealDialog,
      onToggleMeal,
      onDeleteEntry,
    },
  };
}

describe("NutritionMealsSection", () => {
  it("renders the meal overview and entry details", () => {
    renderSection();

    expect(screen.getByText("Registro operativo de comidas")).toBeInTheDocument();
    expect(screen.getByText("Desayuno")).toBeInTheDocument();
    expect(screen.getByText("Avena")).toBeInTheDocument();
    expect(screen.getByText("380 kcal")).toBeInTheDocument();
  });

  it("opens meal dialog shortcuts", () => {
    const { callbacks } = renderSection();

    fireEvent.click(screen.getByRole("button", { name: /Anadir nueva comida/i }));
    expect(callbacks.onOpenMealDialog).toHaveBeenCalledWith("breakfast");

    fireEvent.click(screen.getByRole("button", { name: /Carga manual/i }));
    expect(callbacks.onOpenMealDialog).toHaveBeenCalledWith("breakfast", "manual");

    fireEvent.click(screen.getByRole("button", { name: /Buscar alimento/i }));
    expect(callbacks.onOpenMealDialog).toHaveBeenCalledWith("breakfast", "database");

    fireEvent.click(screen.getByRole("button", { name: /Usar favorito/i }));
    expect(callbacks.onOpenMealDialog).toHaveBeenCalledWith("breakfast", "favorite");
  });

  it("toggles meals and deletes entries", () => {
    const { callbacks } = renderSection();

    fireEvent.click(screen.getAllByRole("button")[1]);
    expect(callbacks.onToggleMeal).toHaveBeenCalledWith("breakfast");

    fireEvent.click(screen.getAllByRole("button").find((button) => button.querySelector("svg"))!);
    expect(callbacks.onDeleteEntry).toHaveBeenCalledWith("entry-1");
  });

  it("shows empty state when a meal has no entries", () => {
    renderSection({
      mealOverview: [
        {
          meal: MEAL_SECTIONS[1],
          entries: [],
          subtotal: null,
        },
      ],
      expandedMeals: {
        breakfast: false,
        lunch: true,
        dinner: false,
        snack: false,
      },
    });

    expect(screen.getByText("Sin registros en esta comida.")).toBeInTheDocument();
  });
});
