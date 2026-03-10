export type TrainingMuscleGroup =
  | "chest"
  | "back"
  | "legs"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "glutes"
  | "hamstrings"
  | "quads"
  | "core"
  | "calves"
  | "full_body";

export type TrainingEquipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "kettlebell"
  | "band"
  | "ez_bar"
  | "smith_machine"
  | "bench"
  | "pull_up_bar"
  | "other";

export type MovementType =
  | "push"
  | "pull"
  | "squat"
  | "hinge"
  | "carry"
  | "lunge"
  | "isolation"
  | "core"
  | "conditioning";

export type DifficultyLevel = "beginner" | "intermediate" | "advanced";
export type WorkoutSessionStatus = "active" | "completed" | "cancelled";
export type ExercisePrType = "max_weight" | "estimated_1rm" | "max_volume";

export type ExerciseRecord = {
  id: string;
  name: string;
  muscle_group: TrainingMuscleGroup;
  secondary_muscles: string[];
  equipment: TrainingEquipment;
  movement_type: MovementType;
  difficulty: DifficultyLevel;
  instructions: string | null;
  video_url: string | null;
  is_custom: boolean;
  created_by: string | null;
  created_at: string;
};

export type ExerciseFilterInput = {
  search?: string;
  muscleGroup?: TrainingMuscleGroup | "all";
  equipment?: TrainingEquipment | "all";
  movementType?: MovementType | "all";
};

export type WorkoutRecord = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkoutExerciseRecord = {
  id: string;
  workout_id: string;
  exercise_id: string;
  order_index: number;
  target_sets: number;
  target_reps: string;
  rest_seconds: number;
  notes: string | null;
  created_at: string;
};

export type WorkoutTemplateRecord = {
  id: string;
  name: string;
  description: string | null;
  focus_tags: string[];
  is_system: boolean;
  created_at: string;
};

export type WorkoutTemplateExerciseRecord = {
  id: string;
  template_id: string;
  exercise_id: string;
  order_index: number;
  target_sets: number;
  target_reps: string;
  rest_seconds: number;
  notes: string | null;
  created_at: string;
};

export type WorkoutScheduleRecord = {
  id: string;
  user_id: string;
  day_of_week: number;
  workout_id: string | null;
  is_rest_day: boolean;
  created_at: string;
  updated_at: string;
};

export type WorkoutSessionRecord = {
  id: string;
  user_id: string;
  workout_id: string;
  started_at: string;
  ended_at: string | null;
  status: WorkoutSessionStatus;
  notes: string | null;
  total_volume: number;
  created_at: string;
};

export type ExerciseSetRecord = {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  weight: number;
  reps: number;
  rir: number | null;
  completed: boolean;
  notes: string | null;
  created_at: string;
};

export type SessionExerciseNoteRecord = {
  id: string;
  session_id: string;
  exercise_id: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ExercisePrRecord = {
  id: string;
  user_id: string;
  exercise_id: string;
  pr_type: ExercisePrType;
  value_num: number;
  achieved_at: string;
  session_id: string | null;
  set_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type WorkoutExerciseDetail = WorkoutExerciseRecord & {
  exercise: ExerciseRecord;
};

export type WorkoutDetail = WorkoutRecord & {
  exercises: WorkoutExerciseDetail[];
};

export type WorkoutTemplateDetail = WorkoutTemplateRecord & {
  exercises: Array<WorkoutTemplateExerciseRecord & { exercise: ExerciseRecord }>;
};

export type WorkoutScheduleDay = WorkoutScheduleRecord & {
  workout: WorkoutRecord | null;
};

export type LastExercisePerformance = {
  session_id: string;
  performed_at: string;
  max_weight: number;
  total_volume: number;
  sets: Array<{
    set_number: number;
    weight: number;
    reps: number;
    rir: number | null;
  }>;
};

export type ActiveWorkoutExercise = WorkoutExerciseDetail & {
  sets: ExerciseSetRecord[];
  sessionNote: SessionExerciseNoteRecord | null;
  lastPerformance: LastExercisePerformance | null;
};

export type WorkoutSessionDetail = WorkoutSessionRecord & {
  workout: WorkoutRecord;
  exercises: ActiveWorkoutExercise[];
};

export type ExerciseHistoryEntry = {
  session_id: string;
  started_at: string;
  workout_name: string;
  total_volume: number;
  max_weight: number;
  estimated_1rm: number;
  sets: ExerciseSetRecord[];
};

export type ExerciseProgressPoint = {
  date_key: string;
  max_weight: number;
  total_volume: number;
  estimated_1rm: number;
};

export type SaveWorkoutInput = {
  id?: string;
  name: string;
  description?: string | null;
  exercises: Array<{
    exercise_id: string;
    order_index: number;
    target_sets: number;
    target_reps: string;
    rest_seconds: number;
    notes?: string | null;
  }>;
};

export type SaveExerciseInput = {
  id?: string;
  name: string;
  muscle_group: TrainingMuscleGroup;
  secondary_muscles?: string[];
  equipment: TrainingEquipment;
  movement_type: MovementType;
  difficulty: DifficultyLevel;
  instructions?: string | null;
  video_url?: string | null;
};

export type UpsertExerciseSetInput = {
  session_id: string;
  exercise_id: string;
  set_number: number;
  weight: number;
  reps: number;
  rir?: number | null;
  completed?: boolean;
  notes?: string | null;
};

export type TrainingTodaySummary = {
  dateKey: string;
  activeSession: WorkoutSessionDetail | null;
  scheduledWorkout: WorkoutDetail | null;
  schedule: WorkoutScheduleDay[];
};
