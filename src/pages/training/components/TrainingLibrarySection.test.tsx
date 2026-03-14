import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrainingLibrarySection } from "@/pages/training/components/TrainingLibrarySection";
import { TRAINING_COPY } from "@/pages/training/trainingConstants";
import type { ExerciseRecord } from "@/types/training";

const copy = TRAINING_COPY.es;

const exercises: ExerciseRecord[] = [
  {
    id: "exercise-1",
    name: "Bench Press",
    muscle_group: "chest",
    secondary_muscles: [],
    equipment: "barbell",
    movement_type: "push",
    difficulty: "intermediate",
    instructions: null,
    video_url: null,
    is_custom: false,
    created_by: null,
    created_at: "2026-03-13T10:00:00.000Z",
  },
  {
    id: "exercise-2",
    name: "Cable Fly",
    muscle_group: "chest",
    secondary_muscles: [],
    equipment: "cable",
    movement_type: "isolation",
    difficulty: "beginner",
    instructions: null,
    video_url: null,
    is_custom: true,
    created_by: "user-1",
    created_at: "2026-03-13T10:00:00.000Z",
  },
];

function renderSection(overrides: Partial<ComponentProps<typeof TrainingLibrarySection>> = {}) {
  const onOpenCustomExercise = vi.fn();
  const onFiltersChange = vi.fn();
  const onSelectExercise = vi.fn();

  const props: ComponentProps<typeof TrainingLibrarySection> = {
    copy,
    filters: { search: "", muscleGroup: "all", equipment: "all", movementType: "all" },
    exerciseLibrary: exercises,
    formatExerciseName: (exercise) => exercise.name,
    onOpenCustomExercise,
    onFiltersChange,
    onSelectExercise,
    ...overrides,
  };

  return {
    ...render(<TrainingLibrarySection {...props} />),
    callbacks: {
      onOpenCustomExercise,
      onFiltersChange,
      onSelectExercise,
    },
  };
}

describe("TrainingLibrarySection", () => {
  it("opens the custom exercise dialog", () => {
    const { callbacks } = renderSection();

    fireEvent.click(screen.getByRole("button", { name: copy.customExercise }));

    expect(callbacks.onOpenCustomExercise).toHaveBeenCalled();
  });

  it("updates filters from the search input", () => {
    const { callbacks } = renderSection();

    fireEvent.change(screen.getByPlaceholderText(copy.searchExercise), {
      target: { value: "bench" },
    });

    expect(callbacks.onFiltersChange).toHaveBeenCalled();
  });

  it("renders library items and selects an exercise", () => {
    const { callbacks } = renderSection();

    expect(screen.getByText("Bench Press")).toBeInTheDocument();
    expect(screen.getByText("Cable Fly")).toBeInTheDocument();
    expect(screen.getByText(copy.customBadge)).toBeInTheDocument();
    expect(screen.getByText(copy.baseBadge)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Bench Press/i }));

    expect(callbacks.onSelectExercise).toHaveBeenCalledWith("exercise-1");
  });
});
