import { DAY_LABELS, DEFAULT_EXERCISE_SEEDS, DEFAULT_TEMPLATE_SEEDS } from "@/features/training/catalog";
import { createClientId } from "@/lib/id";
import {
  getTrainingErrorMessage,
  MAX_NOTES_LENGTH,
  normalizeLocalizedText,
  validateExerciseInput,
  validateWorkoutInput,
} from "@/services/trainingHelpers";
import { readGuestTrainingState, saveGuestTrainingState } from "@/services/trainingGuestState";
import {
  normalizeExercise,
  normalizeWorkout,
  normalizeWorkoutExercise,
  normalizeWorkoutSchedule,
} from "@/services/trainingNormalization";
import { isRpcMissingError, isSchemaError, type TrainingOptions } from "@/services/trainingShared";
import { supabase } from "@/services/supabaseClient";
import type {
  ExerciseFilterInput,
  ExerciseRecord,
  SaveExerciseInput,
  SaveWorkoutInput,
  WorkoutDetail,
  WorkoutExerciseRecord,
  WorkoutRecord,
  WorkoutScheduleDay,
  WorkoutScheduleRecord,
  WorkoutTemplateDetail,
} from "@/types/training";

const readGuestState = readGuestTrainingState;
const saveGuestState = saveGuestTrainingState;

type WorkoutTemplateRow = {
  id: string;
  name: string;
  name_i18n: unknown;
  description: string | null;
  description_i18n: unknown;
  focus_tags: unknown;
  is_system: boolean;
  created_at: string | null;
};

type WorkoutTemplateExerciseRow = {
  id: string;
  template_id: string;
  exercise_id: string;
  order_index: number | null;
  target_sets: number | null;
  target_reps: string | null;
  rest_seconds: number | null;
  notes: string | null;
  created_at: string | null;
};

const getExerciseSearchText = (row: ExerciseRecord) => [
  row.name,
  row.name_i18n?.en,
  row.name_i18n?.es,
  row.instructions,
  row.instructions_i18n?.en,
  row.instructions_i18n?.es,
]
  .filter((value): value is string => Boolean(value?.trim()))
  .join(" ")
  .toLowerCase();

const applyExerciseFilters = (rows: ExerciseRecord[], filters?: ExerciseFilterInput) => {
  const search = filters?.search?.trim().toLowerCase() ?? "";
  return rows.filter((row) => {
    if (filters?.muscleGroup && filters.muscleGroup !== "all" && row.muscle_group !== filters.muscleGroup) return false;
    if (filters?.equipment && filters.equipment !== "all" && row.equipment !== filters.equipment) return false;
    if (filters?.movementType && filters.movementType !== "all" && row.movement_type !== filters.movementType) return false;
    if (!search) return true;
    return getExerciseSearchText(row).includes(search);
  });
};

const getGuestExerciseLibrary = (userId: string | null) => {
  const state = readGuestState();
  const custom = state.customExercises.filter((row) => !userId || row.created_by === userId || row.created_by === "guest");
  return [...DEFAULT_EXERCISE_SEEDS, ...custom];
};

export const loadExercisesByIds = async (userId: string | null, ids: string[], options?: TrainingOptions): Promise<Map<string, ExerciseRecord>> => {
  if (ids.length === 0) return new Map();
  if (options?.isGuest) {
    return new Map(getGuestExerciseLibrary(userId).filter((row) => ids.includes(row.id)).map((row) => [row.id, row]));
  }
  const { data, error } = await supabase.from("exercises").select("*").in("id", ids);
  if (error) throw error;
  return new Map((data || []).map((row) => {
    const normalized = normalizeExercise(row);
    return [normalized.id, normalized];
  }));
};

const buildWorkoutDetail = (
  workout: WorkoutRecord,
  workoutExercises: WorkoutExerciseRecord[],
  exerciseMap: Map<string, ExerciseRecord>,
): WorkoutDetail => ({
  ...workout,
  exercises: workoutExercises
    .sort((a, b) => a.order_index - b.order_index)
    .map((row) => ({
      ...row,
      exercise: exerciseMap.get(row.exercise_id)!,
    })),
});

export const listExercises = async (
  userId: string | null,
  filters?: ExerciseFilterInput,
  options?: TrainingOptions,
) => {
  if (options?.isGuest) {
    return applyExerciseFilters(getGuestExerciseLibrary(userId), filters).sort((a, b) => a.name.localeCompare(b.name));
  }

  try {
    let query = supabase.from("exercises").select("*").order("name", { ascending: true });
    if (filters?.muscleGroup && filters.muscleGroup !== "all") query = query.eq("muscle_group", filters.muscleGroup);
    if (filters?.equipment && filters.equipment !== "all") query = query.eq("equipment", filters.equipment);
    if (filters?.movementType && filters.movementType !== "all") query = query.eq("movement_type", filters.movementType);
    query = userId ? query.or(`is_custom.eq.false,created_by.eq.${userId}`) : query.eq("is_custom", false);
    const { data, error } = await query;
    if (error) throw error;
    return applyExerciseFilters((data || []).map(normalizeExercise), filters).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    if (isSchemaError(error)) {
      return applyExerciseFilters(DEFAULT_EXERCISE_SEEDS, filters).sort((a, b) => a.name.localeCompare(b.name));
    }
    throw error;
  }
};

export const saveCustomExercise = async (
  userId: string | null,
  input: SaveExerciseInput,
  options?: TrainingOptions,
) => {
  validateExerciseInput(input);
  const payload: ExerciseRecord = {
    id: input.id ?? createClientId(),
    name: input.name.trim(),
    muscle_group: input.muscle_group,
    secondary_muscles: input.secondary_muscles ?? [],
    equipment: input.equipment,
    movement_type: input.movement_type,
    difficulty: input.difficulty,
    instructions: input.instructions ?? null,
    video_url: input.video_url ?? null,
    is_custom: true,
    created_by: userId ?? "guest",
    created_at: new Date().toISOString(),
  };

  if (options?.isGuest) {
    const state = readGuestState();
    saveGuestState({
      ...state,
      customExercises: [...state.customExercises.filter((row) => row.id !== payload.id), payload],
    });
    return payload;
  }
  if (!userId) throw new Error("No se encontro el usuario.");

  const { data, error } = await supabase
    .from("exercises")
    .upsert({
      id: payload.id,
      name: payload.name,
      muscle_group: payload.muscle_group,
      secondary_muscles: payload.secondary_muscles,
      equipment: payload.equipment,
      movement_type: payload.movement_type,
      difficulty: payload.difficulty,
      instructions: payload.instructions,
      video_url: payload.video_url,
      is_custom: true,
      created_by: userId,
    })
    .select("*")
    .single();
  if (error) throw error;
  return normalizeExercise(data);
};

export const listWorkoutTemplates = async (options?: TrainingOptions): Promise<WorkoutTemplateDetail[]> => {
  if (options?.isGuest) return DEFAULT_TEMPLATE_SEEDS;

  try {
    const [{ data: templatesData, error: templateError }, { data: templateExercisesData, error: templateExercisesError }] = await Promise.all([
      supabase.from("workout_templates").select("*").order("name", { ascending: true }),
      supabase.from("workout_template_exercises").select("*").order("order_index", { ascending: true }),
    ]);
    if (templateError) throw templateError;
    if (templateExercisesError) throw templateExercisesError;

    const templateRows = (templatesData || []) as WorkoutTemplateRow[];
    const templateExerciseRows = (templateExercisesData || []) as WorkoutTemplateExerciseRow[];
    const exerciseIds = Array.from(new Set(templateExerciseRows.map((row) => String(row.exercise_id))));
    const exerciseMap = await loadExercisesByIds(null, exerciseIds, options);

    return templateRows.map((template) => ({
      id: String(template.id),
      name: String(template.name),
      name_i18n: normalizeLocalizedText(template.name_i18n),
      description: template.description ?? null,
      description_i18n: normalizeLocalizedText(template.description_i18n),
      focus_tags: Array.isArray(template.focus_tags) ? template.focus_tags.map(String) : [],
      is_system: Boolean(template.is_system),
      created_at: String(template.created_at ?? new Date().toISOString()),
      exercises: templateExerciseRows
        .filter((row) => String(row.template_id) === String(template.id))
        .map((row) => ({
          id: String(row.id),
          template_id: String(row.template_id),
          exercise_id: String(row.exercise_id),
          order_index: Number(row.order_index ?? 0),
          target_sets: Number(row.target_sets ?? 3),
          target_reps: String(row.target_reps ?? "8-10"),
          rest_seconds: Number(row.rest_seconds ?? 90),
          notes: row.notes ?? null,
          created_at: String(row.created_at ?? new Date().toISOString()),
          exercise: exerciseMap.get(String(row.exercise_id))!,
        })),
    }));
  } catch (error) {
    if (isSchemaError(error)) return DEFAULT_TEMPLATE_SEEDS;
    throw error;
  }
};

export const listWorkouts = async (userId: string | null, options?: TrainingOptions): Promise<WorkoutRecord[]> => {
  if (options?.isGuest) {
    return readGuestState().workouts.sort((a, b) => a.updated_at.localeCompare(b.updated_at)).reverse();
  }
  if (!userId) return [];
  const { data, error } = await supabase.from("workouts").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizeWorkout);
};

export const getWorkoutDetail = async (userId: string | null, workoutId: string, options?: TrainingOptions): Promise<WorkoutDetail | null> => {
  if (options?.isGuest) {
    const state = readGuestState();
    const workout = state.workouts.find((row) => row.id === workoutId) ?? null;
    if (!workout) return null;
    const workoutExercises = state.workoutExercises.filter((row) => row.workout_id === workoutId);
    return buildWorkoutDetail(workout, workoutExercises, new Map(getGuestExerciseLibrary(userId).map((row) => [row.id, row])));
  }
  if (!userId) return null;

  const [{ data: workoutData, error: workoutError }, { data: exerciseRows, error: exerciseError }] = await Promise.all([
    supabase.from("workouts").select("*").eq("user_id", userId).eq("id", workoutId).maybeSingle(),
    supabase.from("workout_exercises").select("*").eq("workout_id", workoutId).order("order_index", { ascending: true }),
  ]);
  if (workoutError) throw workoutError;
  if (exerciseError) throw exerciseError;
  if (!workoutData) return null;
  const normalizedWorkout = normalizeWorkout(workoutData);
  const normalizedExercises = (exerciseRows || []).map(normalizeWorkoutExercise);
  const exerciseMap = await loadExercisesByIds(userId, normalizedExercises.map((row) => row.exercise_id), options);
  return buildWorkoutDetail(normalizedWorkout, normalizedExercises, exerciseMap);
};

export const saveWorkout = async (userId: string | null, input: SaveWorkoutInput, options?: TrainingOptions) => {
  validateWorkoutInput(input);

  if (options?.isGuest) {
    const state = readGuestState();
    const workoutId = input.id ?? createClientId();
    const now = new Date().toISOString();
    const existing = state.workouts.find((row) => row.id === workoutId);
    const workout: WorkoutRecord = {
      id: workoutId,
      user_id: userId ?? "guest",
      name: input.name.trim(),
      description: input.description ?? null,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    saveGuestState({
      ...state,
      workouts: [...state.workouts.filter((row) => row.id !== workoutId), workout],
      workoutExercises: [
        ...state.workoutExercises.filter((row) => row.workout_id !== workoutId),
        ...input.exercises.map((row) => ({
          id: createClientId(),
          workout_id: workoutId,
          exercise_id: row.exercise_id,
          order_index: row.order_index,
          target_sets: row.target_sets,
          target_reps: row.target_reps,
          rest_seconds: row.rest_seconds,
          notes: row.notes ?? null,
          created_at: now,
        })),
      ],
    });
    return getWorkoutDetail(userId, workoutId, options);
  }
  if (!userId) throw new Error("No se encontro el usuario.");

  const workoutId = input.id ?? createClientId();
  try {
    const { data, error } = await supabase.rpc("save_workout_with_exercises", {
      p_user_id: userId,
      p_workout_id: workoutId,
      p_name: input.name.trim(),
      p_description: input.description ?? null,
      p_exercises: input.exercises.map((row, index) => ({
        exercise_id: row.exercise_id,
        order_index: index,
        target_sets: row.target_sets,
        target_reps: row.target_reps.trim(),
        rest_seconds: row.rest_seconds,
        notes: row.notes ?? null,
      })),
    });
    if (error) throw error;
    const savedWorkoutId = typeof data === "string" ? data : workoutId;
    return getWorkoutDetail(userId, savedWorkoutId, options);
  } catch (error) {
    if (!isRpcMissingError(error)) throw error;
  }

  const { error: workoutError } = await supabase.from("workouts").upsert({
    id: workoutId,
    user_id: userId,
    name: input.name.trim(),
    description: input.description ?? null,
    updated_at: new Date().toISOString(),
  });
  if (workoutError) throw workoutError;

  const { error: deleteError } = await supabase.from("workout_exercises").delete().eq("workout_id", workoutId);
  if (deleteError) throw deleteError;
  const { error: insertError } = await supabase.from("workout_exercises").insert(
    input.exercises.map((row, index) => ({
      workout_id: workoutId,
      exercise_id: row.exercise_id,
      order_index: index,
      target_sets: row.target_sets,
      target_reps: row.target_reps.trim(),
      rest_seconds: row.rest_seconds,
      notes: row.notes ?? null,
    })),
  );
  if (insertError) throw insertError;

  return getWorkoutDetail(userId, workoutId, options);
};

export const deleteWorkout = async (userId: string | null, workoutId: string, options?: TrainingOptions) => {
  if (options?.isGuest) {
    const state = readGuestState();
    saveGuestState({
      ...state,
      workouts: state.workouts.filter((row) => row.id !== workoutId),
      workoutExercises: state.workoutExercises.filter((row) => row.workout_id !== workoutId),
      schedule: state.schedule.map((row) => (row.workout_id === workoutId ? { ...row, workout_id: null } : row)),
    });
    return;
  }
  if (!userId) return;
  const { error } = await supabase.from("workouts").delete().eq("user_id", userId).eq("id", workoutId);
  if (error) throw error;
};

export const duplicateTemplateToWorkout = async (userId: string | null, templateId: string, options?: TrainingOptions) => {
  const template = (await listWorkoutTemplates(options)).find((row) => row.id === templateId);
  if (!template) throw new Error("No se encontro la plantilla.");
  return saveWorkout(
    userId,
    {
      name: template.name,
      description: template.description,
      exercises: template.exercises.map((row) => ({
        exercise_id: row.exercise_id,
        order_index: row.order_index,
        target_sets: row.target_sets,
        target_reps: row.target_reps,
        rest_seconds: row.rest_seconds,
        notes: row.notes,
      })),
    },
    options,
  );
};

export const listWorkoutSchedule = async (userId: string | null, options?: TrainingOptions): Promise<WorkoutScheduleDay[]> => {
  if (options?.isGuest) {
    const state = readGuestState();
    const workoutMap = new Map(state.workouts.map((row) => [row.id, row]));
    return Array.from({ length: 7 }).map((_, day) => {
      const row = state.schedule.find((entry) => entry.day_of_week === day);
      return row
        ? { ...row, workout: row.workout_id ? workoutMap.get(row.workout_id) ?? null : null }
        : {
            id: `guest-schedule-${day}`,
            user_id: userId ?? "guest",
            day_of_week: day,
            workout_id: null,
            is_rest_day: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            workout: null,
          };
    });
  }
  if (!userId) return [];
  const [scheduleRes, workoutsRes] = await Promise.all([
    supabase.from("workout_schedule").select("*").eq("user_id", userId).order("day_of_week", { ascending: true }),
    supabase.from("workouts").select("*").eq("user_id", userId),
  ]);
  if (scheduleRes.error) throw scheduleRes.error;
  if (workoutsRes.error) throw workoutsRes.error;
  const workoutMap = new Map((workoutsRes.data || []).map((row) => {
    const normalized = normalizeWorkout(row);
    return [normalized.id, normalized];
  }));
  const scheduleRows = (scheduleRes.data || []).map(normalizeWorkoutSchedule);
  return Array.from({ length: 7 }).map((_, day) => {
    const row = scheduleRows.find((entry) => entry.day_of_week === day);
    return row
      ? { ...row, workout: row.workout_id ? workoutMap.get(row.workout_id) ?? null : null }
      : {
          id: `schedule-${day}`,
          user_id: userId ?? "guest",
          day_of_week: day,
          workout_id: null,
          is_rest_day: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          workout: null,
        };
  });
};

export const saveWorkoutScheduleDay = async (
  userId: string | null,
  dayOfWeek: number,
  workoutId: string | null,
  isRestDay = false,
  options?: TrainingOptions,
) => {
  const now = new Date().toISOString();
  if (options?.isGuest) {
    const state = readGuestState();
    const existing = state.schedule.find((row) => row.day_of_week === dayOfWeek);
    const nextRow: WorkoutScheduleRecord = {
      id: existing?.id ?? createClientId(),
      user_id: userId ?? "guest",
      day_of_week: dayOfWeek,
      workout_id: workoutId,
      is_rest_day: isRestDay,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    saveGuestState({
      ...state,
      schedule: [...state.schedule.filter((row) => row.day_of_week !== dayOfWeek), nextRow],
    });
    return nextRow;
  }
  if (!userId) throw new Error("No se encontro el usuario.");
  const { data, error } = await supabase
    .from("workout_schedule")
    .upsert(
      {
        user_id: userId,
        day_of_week: dayOfWeek,
        workout_id: workoutId,
        is_rest_day: isRestDay,
        updated_at: now,
      },
      { onConflict: "user_id,day_of_week" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return normalizeWorkoutSchedule(data);
};

export const getTrainingDayLabel = (dayOfWeek: number) => DAY_LABELS[dayOfWeek] ?? "Dia";

export { getTrainingErrorMessage, MAX_NOTES_LENGTH };
