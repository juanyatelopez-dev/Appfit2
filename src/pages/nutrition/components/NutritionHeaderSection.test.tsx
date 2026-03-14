import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NutritionHeaderSection } from "@/pages/nutrition/components/NutritionHeaderSection";
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
];

function renderSection(overrides: Partial<ComponentProps<typeof NutritionHeaderSection>> = {}) {
  const onPreviousDate = vi.fn();
  const onNextDate = vi.fn();
  const onSelectProfile = vi.fn();
  const onCreateProfile = vi.fn();

  const props: ComponentProps<typeof NutritionHeaderSection> = {
    selectedDate: new Date("2026-03-13T12:00:00"),
    selectedProfileId: "profile-1",
    profileOptions,
    activeArchetype: "heavy",
    archetypeDescription: "Mayor demanda energetica y de recuperacion.",
    totalCalories: 2150,
    onPreviousDate,
    onNextDate,
    onSelectProfile,
    onCreateProfile,
    ...overrides,
  };

  return {
    ...render(<NutritionHeaderSection {...props} />),
    callbacks: {
      onPreviousDate,
      onNextDate,
      onSelectProfile,
      onCreateProfile,
    },
  };
}

describe("NutritionHeaderSection", () => {
  it("renders headline, selected date and total calories", () => {
    renderSection();

    expect(screen.getByText("Nutricion & Combustible")).toBeInTheDocument();
    expect(screen.getByText("13/03/2026")).toBeInTheDocument();
    expect(screen.getByText("2150 kcal")).toBeInTheDocument();
  });

  it("triggers date navigation and profile creation actions", () => {
    const { callbacks } = renderSection();

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);
    fireEvent.click(screen.getByRole("button", { name: /Nuevo perfil/i }));

    expect(callbacks.onPreviousDate).toHaveBeenCalled();
    expect(callbacks.onNextDate).toHaveBeenCalled();
    expect(callbacks.onCreateProfile).toHaveBeenCalled();
  });
});
