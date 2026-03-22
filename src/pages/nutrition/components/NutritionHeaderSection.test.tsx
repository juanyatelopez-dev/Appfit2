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
  const onOpenAddFood = vi.fn();
  const onOpenTechnicalConfig = vi.fn();

  const props: ComponentProps<typeof NutritionHeaderSection> = {
    selectedDate: new Date("2026-03-13T12:00:00"),
    selectedProfileId: "profile-1",
    profileOptions,
    activeArchetype: "heavy",
    archetypeDescription: "Mayor demanda energetica y de recuperacion.",
    planSource: "selected_template",
    planSourceLabel: "Plantilla elegida",
    planSourceDescription: "Esta plantilla tiene prioridad para este dia.",
    totalCalories: 2150,
    onPreviousDate,
    onNextDate,
    onSelectProfile,
    onOpenAddFood,
    onOpenTechnicalConfig,
    ...overrides,
  };

  return {
    ...render(<NutritionHeaderSection {...props} />),
    callbacks: {
      onPreviousDate,
      onNextDate,
      onSelectProfile,
      onOpenAddFood,
      onOpenTechnicalConfig,
    },
  };
}

describe("NutritionHeaderSection", () => {
  it("renders headline, selected date and total calories", () => {
    renderSection();

    expect(screen.getByText("Nutricion - Hoy")).toBeInTheDocument();
    expect(screen.getByText("13/03/2026")).toBeInTheDocument();
    expect(screen.getByText("2150 kcal")).toBeInTheDocument();
  });

  it("triggers date navigation and primary actions", () => {
    const { callbacks } = renderSection();
    const iconButtons = screen.getAllByRole("button", { name: "" });
    fireEvent.click(iconButtons[0]);
    fireEvent.click(iconButtons[1]);
    fireEvent.click(screen.getByRole("button", { name: /\+ Agregar comida/i }));
    fireEvent.click(screen.getByRole("button", { name: /Config tecnica/i }));

    expect(callbacks.onPreviousDate).toHaveBeenCalled();
    expect(callbacks.onNextDate).toHaveBeenCalled();
    expect(callbacks.onOpenAddFood).toHaveBeenCalled();
    expect(callbacks.onOpenTechnicalConfig).toHaveBeenCalled();
  });
});
