import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrainingRoutinesSection } from "@/pages/training/components/TrainingRoutinesSection";
import { TRAINING_COPY } from "@/pages/training/trainingConstants";
import type { WorkoutRecord, WorkoutTemplateRecord } from "@/types/training";

const copy = TRAINING_COPY.es;

const workouts: WorkoutRecord[] = [
  {
    id: "workout-1",
    user_id: "user-1",
    name: "Push Day",
    description: "Pecho y hombro",
    created_at: "2026-03-13T10:00:00.000Z",
    updated_at: "2026-03-13T10:00:00.000Z",
  },
];

const templates: WorkoutTemplateRecord[] = [
  {
    id: "template-1",
    name: "Push Template",
    name_i18n: { es: "Plantilla Push" },
    description: "Base push",
    description_i18n: { es: "Base de empuje" },
    focus_tags: ["push", "chest"],
    is_system: true,
    created_at: "2026-03-13T10:00:00.000Z",
  },
];

function renderSection(overrides: Partial<ComponentProps<typeof TrainingRoutinesSection>> = {}) {
  const onCreateRoutine = vi.fn();
  const onStartWorkout = vi.fn();
  const onEditWorkout = vi.fn();
  const onDeleteWorkout = vi.fn();
  const onDuplicateTemplate = vi.fn();

  const props: ComponentProps<typeof TrainingRoutinesSection> = {
    copy,
    workouts,
    templates,
    hasActiveSession: false,
    isStartPending: false,
    isSavePending: false,
    isDeletePending: false,
    isDuplicatePending: false,
    renderPlaceholder: (message) => <div>{message}</div>,
    getWorkoutPreviewText: () => "Bench Press, Overhead Press",
    localizeText: (value, fallback) => value?.es ?? fallback ?? "",
    onCreateRoutine,
    onStartWorkout,
    onEditWorkout,
    onDeleteWorkout,
    onDuplicateTemplate,
    ...overrides,
  };

  return {
    ...render(<TrainingRoutinesSection {...props} />),
    callbacks: {
      onCreateRoutine,
      onStartWorkout,
      onEditWorkout,
      onDeleteWorkout,
      onDuplicateTemplate,
    },
  };
}

describe("TrainingRoutinesSection", () => {
  it("shows the empty placeholder when there are no routines", () => {
    renderSection({ workouts: [] });

    expect(screen.getByText(copy.noRoutines)).toBeInTheDocument();
  });

  it("triggers create, start, edit and delete actions", () => {
    const { callbacks } = renderSection();

    fireEvent.click(screen.getByRole("button", { name: copy.newRoutine }));
    expect(callbacks.onCreateRoutine).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: copy.start }));
    expect(callbacks.onStartWorkout).toHaveBeenCalledWith("workout-1");

    fireEvent.click(screen.getByRole("button", { name: copy.edit }));
    expect(callbacks.onEditWorkout).toHaveBeenCalledWith("workout-1");

    fireEvent.click(screen.getByRole("button", { name: copy.delete }));
    expect(callbacks.onDeleteWorkout).toHaveBeenCalledWith("workout-1");
  });

  it("duplicates a template", () => {
    const { callbacks } = renderSection();

    fireEvent.click(screen.getByRole("button", { name: copy.duplicateTemplate }));

    expect(callbacks.onDuplicateTemplate).toHaveBeenCalledWith("template-1");
  });
});
