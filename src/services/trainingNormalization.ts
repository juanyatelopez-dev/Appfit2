import { normalizeLocalizedText } from "@/services/trainingHelpers";
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

type TrainingRow = Record<string, unknown>;

export const normalizeExercise = (row: TrainingRow): ExerciseRecord => ({
  id: String(row.id),
  name: String(row.name ?? ""),
  name_i18n: normalizeLocalizedText(row.name_i18n),
  muscle_group: row.muscle_group,
  secondary_muscles: Array.isArray(row.secondary_muscles) ? row.secondary_muscles.map(String) : [],
  equipment: row.equipment,
  movement_type: row.movement_type,
  difficulty: row.difficulty,
  instructions: row.instructions ?? null,
  instructions_i18n: normalizeLocalizedText(row.instructions_i18n),
  video_url: row.video_url ?? null,
  is_custom: Boolean(row.is_custom),
  created_by: row.created_by ?? null,
  created_at: String(row.created_at ?? new Date().toISOString()),
});

export const normalizeWorkout = (row: TrainingRow): WorkoutRecord => ({
  id: String(row.id),
  user_id: String(row.user_id),
  name: String(row.name ?? ""),
  description: row.description ?? null,
  created_at: String(row.created_at ?? new Date().toISOString()),
  updated_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
});

export const normalizeWorkoutExercise = (row: TrainingRow): WorkoutExerciseRecord => ({
  id: String(row.id),
  workout_id: String(row.workout_id),
  exercise_id: String(row.exercise_id),
  order_index: Number(row.order_index ?? 0),
  target_sets: Number(row.target_sets ?? 3),
  target_reps: String(row.target_reps ?? "8-10"),
  rest_seconds: Number(row.rest_seconds ?? 90),
  notes: row.notes ?? null,
  created_at: String(row.created_at ?? new Date().toISOString()),
});

export const normalizeWorkoutSchedule = (row: TrainingRow): WorkoutScheduleRecord => ({
  id: String(row.id),
  user_id: String(row.user_id),
  day_of_week: Number(row.day_of_week ?? 0),
  workout_id: row.workout_id ?? null,
  is_rest_day: Boolean(row.is_rest_day),
  created_at: String(row.created_at ?? new Date().toISOString()),
  updated_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
});

export const normalizeWorkoutSession = (row: TrainingRow): WorkoutSessionRecord => ({
  id: String(row.id),
  user_id: String(row.user_id),
  workout_id: String(row.workout_id),
  started_at: String(row.started_at ?? new Date().toISOString()),
  ended_at: row.ended_at ?? null,
  status: row.status,
  notes: row.notes ?? null,
  total_volume: Number(row.total_volume ?? 0),
  created_at: String(row.created_at ?? new Date().toISOString()),
});

export const normalizeExerciseSet = (row: TrainingRow): ExerciseSetRecord => ({
  id: String(row.id),
  session_id: String(row.session_id),
  exercise_id: String(row.exercise_id),
  set_number: Number(row.set_number ?? 1),
  weight: Number(row.weight ?? 0),
  reps: Number(row.reps ?? 0),
  rir: row.rir === null || row.rir === undefined ? null : Number(row.rir),
  completed: Boolean(row.completed),
  notes: row.notes ?? null,
  created_at: String(row.created_at ?? new Date().toISOString()),
});

export const normalizeSessionNote = (row: TrainingRow): SessionExerciseNoteRecord => ({
  id: String(row.id),
  session_id: String(row.session_id),
  exercise_id: String(row.exercise_id),
  notes: row.notes ?? null,
  created_at: String(row.created_at ?? new Date().toISOString()),
  updated_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
});

export const normalizeExercisePr = (row: TrainingRow): ExercisePrRecord => ({
  id: String(row.id),
  user_id: String(row.user_id),
  exercise_id: String(row.exercise_id),
  pr_type: row.pr_type,
  value_num: Number(row.value_num ?? 0),
  achieved_at: String(row.achieved_at ?? new Date().toISOString()),
  session_id: row.session_id ?? null,
  set_id: row.set_id ?? null,
  metadata: row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : null,
  created_at: String(row.created_at ?? new Date().toISOString()),
  updated_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
});
