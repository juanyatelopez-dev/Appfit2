import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrainingTodaySection } from "@/modules/training/ui/components/TrainingTodaySection";
import { TRAINING_COPY } from "@/modules/training/ui/trainingConstants";
import type { ExerciseRecord, WorkoutDetail, WorkoutRecord, WorkoutScheduleDay, WorkoutSessionDetail } from "@/modules/training/types";

const copy = TRAINING_COPY.es;

const baseWorkout: WorkoutRecord = {
  id: "workout-1",
  user_id: "user-1",
  name: "Push Day",
  description: "Pecho y hombro",
  created_at: "2026-03-13T10:00:00.000Z",
  updated_at: "2026-03-13T10:00:00.000Z",
};

const baseExercise: ExerciseRecord = {
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
};

const scheduledWorkout: WorkoutDetail = {
  ...baseWorkout,
  exercises: [],
};

const schedule: WorkoutScheduleDay[] = [
  {
    id: "schedule-1",
    user_id: "user-1",
    day_of_week: 5,
    workout_id: "workout-1",
    is_rest_day: false,
    created_at: "2026-03-13T10:00:00.000Z",
    updated_at: "2026-03-13T10:00:00.000Z",
    workout: baseWorkout,
  },
];

const activeSession: WorkoutSessionDetail = {
  id: "session-1",
  user_id: "user-1",
  workout_id: "workout-1",
  started_at: "2026-03-13T10:00:00.000Z",
  ended_at: null,
  status: "active",
  notes: null,
  total_volume: 1000,
  created_at: "2026-03-13T10:00:00.000Z",
  workout: baseWorkout,
  exercises: [
    {
      id: "workout-exercise-1",
      workout_id: "workout-1",
      exercise_id: "exercise-1",
      order_index: 0,
      target_sets: 3,
      target_reps: "8-10",
      rest_seconds: 90,
      notes: null,
      created_at: "2026-03-13T10:00:00.000Z",
      exercise: baseExercise,
      sets: [
        {
          id: "set-1",
          session_id: "session-1",
          exercise_id: "exercise-1",
          set_number: 1,
          weight: 60,
          reps: 8,
          rir: 2,
          completed: true,
          notes: null,
          created_at: "2026-03-13T10:05:00.000Z",
        },
      ],
      sessionNote: null,
      lastPerformance: {
        session_id: "prev-session",
        performed_at: "2026-03-06T10:00:00.000Z",
        max_weight: 65,
        total_volume: 1200,
        sets: [],
      },
    },
  ],
};

function renderSection(overrides: Partial<ComponentProps<typeof TrainingTodaySection>> = {}) {
  const onFinishNotesChange = vi.fn();
  const onNoteDraftsChange = vi.fn();
  const onDraftsChange = vi.fn();
  const onStartWorkout = vi.fn();
  const onFinishSession = vi.fn();
  const onSaveExerciseNote = vi.fn();
  const onSaveSet = vi.fn();
  const onDeleteSet = vi.fn();
  const onOpenPlanning = vi.fn();

  const props: ComponentProps<typeof TrainingTodaySection> = {
    copy,
    activeSession: null,
    scheduledWorkout,
    schedule,
    workouts: [baseWorkout],
    activeProgress: { completed: 1, target: 3, percent: 33 },
    finishNotes: "",
    noteDrafts: { "session-1:exercise-1": "Mantener tecnica" },
    renderPlaceholder: (message) => <div>{message}</div>,
    formatDateTime: () => "13 mar, 10:00",
    formatRest: (seconds) => `${seconds}s`,
    formatExerciseName: (exercise) => exercise.name,
    getSetDraft: () => ({ weight: "60", reps: "8", rir: "2", notes: "ok", completed: false }),
    getExerciseDraftCount: () => 0,
    onFinishNotesChange,
    onNoteDraftsChange,
    onDraftsChange,
    onStartWorkout,
    onFinishSession,
    onSaveExerciseNote,
    onSaveSet,
    onDeleteSet,
    onOpenPlanning,
    isStartPending: false,
    isFinishPending: false,
    isSaveSessionNotePending: false,
    isSaveSetPending: false,
    isDeleteSetPending: false,
    ...overrides,
  };

  return {
    ...render(<TrainingTodaySection {...props} />),
    callbacks: {
      onFinishNotesChange,
      onNoteDraftsChange,
      onDraftsChange,
      onStartWorkout,
      onFinishSession,
      onSaveExerciseNote,
      onSaveSet,
      onDeleteSet,
      onOpenPlanning,
    },
  };
}

describe("TrainingTodaySection", () => {
  it("starts the scheduled workout when there is no active session", () => {
    const { callbacks } = renderSection();

    fireEvent.click(screen.getAllByRole("button", { name: copy.startWorkout })[0]);

    expect(callbacks.onStartWorkout).toHaveBeenCalledWith("workout-1");
  });

  it("renders and handles actions for an active session", () => {
    const { callbacks } = renderSection({
      activeSession,
      scheduledWorkout: null,
      finishNotes: "Notas finales",
    });

    expect(screen.getAllByText("Push Day").length).toBeGreaterThan(0);
    expect(screen.getByText(copy.previousPerformance)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: copy.cancel }));
    expect(callbacks.onFinishSession).toHaveBeenCalledWith({ sessionId: "session-1", status: "cancelled" });

    fireEvent.click(screen.getByRole("button", { name: copy.finish }));
    expect(callbacks.onFinishSession).toHaveBeenCalledWith({ sessionId: "session-1", status: "completed" });

    fireEvent.click(screen.getByRole("button", { name: copy.saveNote }));
    expect(callbacks.onSaveExerciseNote).toHaveBeenCalledWith({
      sessionId: "session-1",
      exerciseId: "exercise-1",
      notes: "Mantener tecnica",
    });

    fireEvent.click(screen.getAllByRole("button", { name: copy.saveDraft })[0]);
    expect(callbacks.onSaveSet).toHaveBeenCalledWith("session-1", "exercise-1", 1, 0, false);

    const completeButtons = screen.getAllByRole("button", { name: copy.markDone });
    fireEvent.click(completeButtons[0]);
    expect(callbacks.onSaveSet).toHaveBeenCalledWith("session-1", "exercise-1", 1, 90, true);
  });

  it("updates drafts and allows adding extra sets", () => {
    const { callbacks } = renderSection({
      activeSession,
      scheduledWorkout: null,
    });

    fireEvent.change(screen.getByLabelText(`${copy.weight} 1`), {
      target: { value: "70" },
    });
    expect(callbacks.onDraftsChange).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: copy.addSet }));
    expect(callbacks.onDraftsChange).toHaveBeenCalled();
  });

  it("shows the empty placeholder when there is no session and no scheduled workout", () => {
    renderSection({
      activeSession: null,
      scheduledWorkout: null,
    });

    expect(screen.getByText(copy.noWorkoutScheduled)).toBeInTheDocument();
  });
});
