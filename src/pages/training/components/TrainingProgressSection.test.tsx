import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrainingProgressSection } from "@/pages/training/components/TrainingProgressSection";
import { TRAINING_COPY, prLabelMap } from "@/pages/training/trainingConstants";

describe("TrainingProgressSection", () => {
  it("shows placeholder when there is no progress data", () => {
    render(
      <TrainingProgressSection
        copy={TRAINING_COPY.es}
        selectedExerciseId={null}
        exerciseLibrary={[
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
        ]}
        prs={[]}
        progress={[]}
        history={[]}
        prLabelMap={prLabelMap}
        formatDateTime={() => "13 mar, 10:00"}
        formatExerciseName={(exercise) => exercise.name}
        onSelectExercise={vi.fn()}
      />,
    );

    expect(screen.getByText(TRAINING_COPY.es.progressTitle)).toBeInTheDocument();
    expect(screen.getByText(TRAINING_COPY.es.noProgress)).toBeInTheDocument();
  });

  it("renders PR cards and exercise history", () => {
    const onSelectExercise = vi.fn();

    render(
      <TrainingProgressSection
        copy={TRAINING_COPY.es}
        selectedExerciseId="exercise-1"
        exerciseLibrary={[
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
        ]}
        prs={[
          {
            id: "pr-1",
            user_id: "user-1",
            exercise_id: "exercise-1",
            pr_type: "max_weight",
            value_num: 110,
            achieved_at: "2026-03-13T10:00:00.000Z",
            session_id: "session-1",
            set_id: "set-1",
            metadata: null,
            created_at: "2026-03-13T10:00:00.000Z",
            updated_at: "2026-03-13T10:00:00.000Z",
          },
        ]}
        progress={[
          {
            date_key: "2026-03-13",
            max_weight: 110,
            estimated_1rm: 120,
            total_volume: 1840,
          },
        ]}
        history={[
          {
            session_id: "session-1",
            workout_name: "Push A",
            started_at: "2026-03-13T10:00:00.000Z",
            total_volume: 1840,
            max_weight: 110,
            estimated_1rm: 120,
            sets: [
              {
                id: "set-1",
                session_id: "session-1",
                exercise_id: "exercise-1",
                set_number: 1,
                weight: 100,
                reps: 8,
                rir: 2,
                completed: true,
                notes: null,
                created_at: "2026-03-13T10:00:00.000Z",
              },
            ],
          },
        ]}
        prLabelMap={prLabelMap}
        formatDateTime={() => "13 mar, 10:00"}
        formatExerciseName={(exercise) => exercise.name}
        onSelectExercise={onSelectExercise}
      />,
    );

    expect(screen.getByText("110")).toBeInTheDocument();
    expect(screen.getByText("Push A")).toBeInTheDocument();
    expect(screen.getByText("Set 1")).toBeInTheDocument();
    expect(screen.getByText("100 kg x 8 reps")).toBeInTheDocument();
  });
});
