import type { ExerciseRecord, SaveWorkoutInput } from "@/types/training";

export type WorkoutExerciseDraft = SaveWorkoutInput["exercises"][number] & {
  clientId: string;
  exercise?: ExerciseRecord;
};

export type SetDraft = {
  weight: string;
  reps: string;
  rir: string;
  notes: string;
  completed: boolean;
};
