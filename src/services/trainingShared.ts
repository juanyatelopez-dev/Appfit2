import type {
  ExercisePrRecord,
  ExerciseRecord,
  ExerciseSetRecord,
  SessionExerciseNoteRecord,
  WorkoutExerciseRecord,
  WorkoutRecord,
  WorkoutScheduleRecord,
  WorkoutSessionRecord,
} from "@/types/training";

export type TrainingOptions = {
  isGuest?: boolean;
  timeZone?: string;
  language?: "en" | "es";
};

export type GuestTrainingState = {
  customExercises: ExerciseRecord[];
  workouts: WorkoutRecord[];
  workoutExercises: WorkoutExerciseRecord[];
  schedule: WorkoutScheduleRecord[];
  sessions: WorkoutSessionRecord[];
  sets: ExerciseSetRecord[];
  sessionNotes: SessionExerciseNoteRecord[];
  prs: ExercisePrRecord[];
};

export const isSchemaError = (error: unknown) => {
  const message = (error as { message?: string } | null)?.message?.toLowerCase() ?? "";
  return message.includes("schema cache") || message.includes("does not exist") || message.includes("relation") || message.includes("column");
};

export const isRpcMissingError = (error: unknown) => {
  const message = (error as { message?: string } | null)?.message?.toLowerCase() ?? "";
  return message.includes("function") && (message.includes("does not exist") || message.includes("schema cache"));
};
